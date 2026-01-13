/**
 * Export Share Edge Function
 * 
 * Handles:
 * 1. Creating share links (POST /export-share)
 * 2. Resolving share tokens to signed URLs (GET /export-share?token=xxx)
 * 
 * Security:
 * - Creating shares requires authentication
 * - Token resolution is public but validates expiry/revocation
 * - Storage paths are never exposed directly; only signed URLs are returned
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Export layout version - bump when layout changes materially
const EXPORT_LAYOUT_VERSION = "1";

// Generate a cryptographically secure random token
function generateToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // GET with token = resolve share to signed URL
    if (req.method === "GET" && token) {
      return await handleResolveShare(token);
    }

    // POST = create new share link
    if (req.method === "POST") {
      return await handleCreateShare(req);
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Export share error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// RESOLVE SHARE TOKEN TO SIGNED URL (Public endpoint)
// ============================================================================

async function handleResolveShare(token: string): Promise<Response> {
  // Use service role to bypass RLS for token lookup
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Look up the share by token
  const { data: share, error: shareError } = await supabase
    .from("export_shares")
    .select(`
      id,
      expires_at,
      revoked_at,
      export_file_id,
      export_files!inner (
        id,
        storage_path,
        entity_type,
        entity_id
      )
    `)
    .eq("token", token)
    .single();

  if (shareError || !share) {
    console.log("Share not found:", token);
    return new Response(
      JSON.stringify({ error: "Share link not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if revoked
  if (share.revoked_at) {
    return new Response(
      JSON.stringify({ error: "This share link has been revoked" }),
      { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if expired
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "This share link has expired" }),
      { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get the export file
  const exportFile = share.export_files as unknown as {
    id: string;
    storage_path: string;
    entity_type: string;
    entity_id: string;
  };

  if (!exportFile?.storage_path) {
    return new Response(
      JSON.stringify({ error: "Export file not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Generate a short-lived signed URL (60 seconds)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("exports")
    .createSignedUrl(exportFile.storage_path, 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("Signed URL error:", signedUrlError);
    return new Response(
      JSON.stringify({ error: "Failed to generate download URL" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Return the signed URL for client-side redirect/fetch
  return new Response(
    JSON.stringify({
      signedUrl: signedUrlData.signedUrl,
      entityType: exportFile.entity_type,
      entityId: exportFile.entity_id,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// CREATE SHARE LINK (Authenticated endpoint)
// ============================================================================

async function handleCreateShare(req: Request): Promise<Response> {
  // Get auth token from header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create authenticated client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Verify user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  const body = await req.json();
  const { entityType, entityId, expiresInDays } = body as {
    entityType: "scenario" | "comparison";
    entityId: string;
    expiresInDays?: number;
  };

  if (!entityType || !entityId) {
    return new Response(
      JSON.stringify({ error: "entityType and entityId are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!["scenario", "comparison"].includes(entityType)) {
    return new Response(
      JSON.stringify({ error: "Invalid entityType" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify ownership of the entity
  const tableName = entityType === "scenario" ? "scenarios" : "saved_comparisons";
  const { data: entity, error: entityError } = await supabase
    .from(tableName)
    .select("id, user_id")
    .eq("id", entityId)
    .single();

  if (entityError || !entity) {
    return new Response(
      JSON.stringify({ error: `${entityType} not found` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (entity.user_id !== user.id) {
    return new Response(
      JSON.stringify({ error: "You can only share your own exports" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check for existing export file with current version
  let exportFile: { id: string; storage_path: string } | null = null;
  const { data: existingFile } = await supabase
    .from("export_files")
    .select("id, storage_path")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("export_version", EXPORT_LAYOUT_VERSION)
    .eq("owner_user_id", user.id)
    .single();

  if (existingFile) {
    exportFile = existingFile;
  } else {
    // Generate PDF using the generate-pdf function
    const pdfResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-pdf?type=${entityType}&id=${entityId}`,
      {
        headers: { Authorization: authHeader },
      }
    );

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error("PDF generation failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = pdfResponse.headers.get("Content-Type");
    if (!contentType?.includes("application/pdf")) {
      console.error("Invalid content type from generate-pdf:", contentType);
      return new Response(
        JSON.stringify({ error: "PDF generation returned invalid content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get PDF bytes
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

    // Upload to storage
    const storagePath = `${user.id}/${entityType}_${entityId}_v${EXPORT_LAYOUT_VERSION}.pdf`;

    // Use service role for storage upload
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: uploadError } = await serviceSupabase.storage
      .from("exports")
      .upload(storagePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to store export file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create export_files record
    const { data: newFile, error: fileError } = await supabase
      .from("export_files")
      .insert({
        owner_user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        storage_path: storagePath,
        export_version: EXPORT_LAYOUT_VERSION,
      })
      .select("id, storage_path")
      .single();

    if (fileError || !newFile) {
      console.error("File record error:", fileError);
      return new Response(
        JSON.stringify({ error: "Failed to create export record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    exportFile = newFile;
  }

  // Generate a unique token
  const token = generateToken(32);

  // Calculate expiration if specified
  let expiresAt: Date | null = null;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  // Create share record
  const { data: share, error: shareError } = await supabase
    .from("export_shares")
    .insert({
      export_file_id: exportFile.id,
      token,
      permission: "view",
      expires_at: expiresAt?.toISOString() ?? null,
      created_by_user_id: user.id,
    })
    .select("id, token, expires_at, created_at")
    .single();

  if (shareError || !share) {
    console.error("Share creation error:", shareError);
    return new Response(
      JSON.stringify({ error: "Failed to create share link" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Return the share info
  return new Response(
    JSON.stringify({
      shareId: share.id,
      token: share.token,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
