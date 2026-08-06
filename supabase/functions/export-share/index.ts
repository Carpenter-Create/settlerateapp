/**
 * Export Share Edge Function
 * 
 * Handles:
 * 1. Creating share links (POST /export-share)
 * 2. Resolving share tokens to signed URLs (GET /export-share?token=xxx)
 * 
 * Security:
 * - Creating shares requires authentication
 * - Token resolution is public but validates expiry
 * - Storage paths are never exposed directly; only signed URLs are returned
 * 
 * Uses the canonical pdf_exports table with share_token column.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateRequestId } from "../_shared/observability.ts";
import { captureEdgeException, initEdgeSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Inert without a SENTRY_DSN secret — see supabase/functions/_shared/sentry.ts.
const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
initEdgeSentry(SENTRY_DSN);

// Generate a cryptographically secure random token (min 32 chars per DB constraint)
function generateToken(length = 48): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  const requestId = generateRequestId();

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
    captureEdgeException(error, SENTRY_DSN, {
      function_name: "export-share",
      request_id: requestId,
    });
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

  // Look up the pdf_export by share_token
  const { data: pdfExport, error: exportError } = await supabase
    .from("pdf_exports")
    .select("id, storage_path, kind, source_id, share_enabled, share_expires_at, status")
    .eq("share_token", token)
    .single();

  if (exportError || !pdfExport) {
    console.log("Share not found:", token);
    return new Response(
      JSON.stringify({ error: "Share link not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if sharing is enabled
  if (!pdfExport.share_enabled) {
    return new Response(
      JSON.stringify({ error: "Sharing is not enabled for this export" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if expired
  if (pdfExport.share_expires_at && new Date(pdfExport.share_expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "This share link has expired" }),
      { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if PDF is ready
  if (pdfExport.status !== "ready") {
    return new Response(
      JSON.stringify({ error: "Export is still being generated" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!pdfExport.storage_path) {
    return new Response(
      JSON.stringify({ error: "Export file not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Generate a short-lived signed URL (60 seconds)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("exports")
    .createSignedUrl(pdfExport.storage_path, 60);

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
      entityType: pdfExport.kind,
      entityId: pdfExport.source_id,
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

  // Server-authoritative entitlement
  const { error: entitlementError } = await supabase.rpc("assert_feature_allowed", {
    p_feature: "share_create",
  });
  if (entitlementError) {
    return new Response(
      JSON.stringify({
        error: "Professional access required to create shares",
        code: "ENTITLEMENT_DENIED",
        feature: "share_create",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

  // Verify ownership of the entity (canonical comparison table is user_comparisons)
  const tableName = entityType === "scenario" ? "scenarios" : "user_comparisons";
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

  // Check for existing ready pdf_export
  const { data: existingExport } = await supabase
    .from("pdf_exports")
    .select("id, storage_path, share_token, share_enabled")
    .eq("kind", entityType)
    .eq("source_id", entityId)
    .eq("user_id", user.id)
    .eq("status", "ready")
    .maybeSingle();

  let pdfExportId: string;
  let shareToken: string;

  if (existingExport?.id) {
    // If already has sharing enabled, just return existing token
    if (existingExport.share_enabled && existingExport.share_token) {
      // Update expiration if requested
      let expiresAt: string | null = null;
      if (expiresInDays && expiresInDays > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + expiresInDays);
        expiresAt = expDate.toISOString();
      }

      const { error: updateError } = await supabase
        .from("pdf_exports")
        .update({ share_expires_at: expiresAt })
        .eq("id", existingExport.id);

      if (updateError) {
        console.error("Update expiration error:", updateError);
      }

      return new Response(
        JSON.stringify({
          shareId: existingExport.id,
          token: existingExport.share_token,
          expiresAt,
          createdAt: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enable sharing on existing export
    pdfExportId = existingExport.id;
    shareToken = generateToken(48);

    let expiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expiresInDays);
      expiresAt = expDate.toISOString();
    }

    const { error: updateError } = await supabase
      .from("pdf_exports")
      .update({
        share_enabled: true,
        share_token: shareToken,
        share_expires_at: expiresAt,
      })
      .eq("id", pdfExportId);

    if (updateError) {
      console.error("Enable sharing error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to enable sharing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        shareId: pdfExportId,
        token: shareToken,
        expiresAt,
        createdAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // No existing export - need to generate PDF
  // First create a queued record
  shareToken = generateToken(48);
  const storagePath = `${user.id}/${entityType}_${entityId}.pdf`;

  let expiresAt: string | null = null;
  if (expiresInDays && expiresInDays > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + expiresInDays);
    expiresAt = expDate.toISOString();
  }

  const { data: newExport, error: insertError } = await supabase
    .from("pdf_exports")
    .insert({
      user_id: user.id,
      kind: entityType,
      source_id: entityId,
      storage_path: storagePath,
      status: "rendering",
      share_enabled: true,
      share_token: shareToken,
      share_expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !newExport) {
    console.error("Insert export error:", insertError);
    return new Response(
      JSON.stringify({ error: "Failed to create export record" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  pdfExportId = newExport.id;

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
    
    // Mark as failed
    await supabase
      .from("pdf_exports")
      .update({ status: "failed", error_message: errorText })
      .eq("id", pdfExportId);

    return new Response(
      JSON.stringify({ error: "Failed to generate PDF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const contentType = pdfResponse.headers.get("Content-Type");
  if (!contentType?.includes("application/pdf")) {
    console.error("Invalid content type from generate-pdf:", contentType);
    
    await supabase
      .from("pdf_exports")
      .update({ status: "failed", error_message: "Invalid content type" })
      .eq("id", pdfExportId);

    return new Response(
      JSON.stringify({ error: "PDF generation returned invalid content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get PDF bytes
  const pdfBytes = await pdfResponse.arrayBuffer();
  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

  // Upload to storage using service role
  const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error: uploadError } = await serviceSupabase.storage
    .from("exports")
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    
    await supabase
      .from("pdf_exports")
      .update({ status: "failed", error_message: uploadError.message })
      .eq("id", pdfExportId);

    return new Response(
      JSON.stringify({ error: "Failed to store export file" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Mark as ready
  const { error: readyError } = await supabase
    .from("pdf_exports")
    .update({ 
      status: "ready",
      bytes: pdfBytes.byteLength,
    })
    .eq("id", pdfExportId);

  if (readyError) {
    console.error("Mark ready error:", readyError);
  }

  // Return the share info
  return new Response(
    JSON.stringify({
      shareId: pdfExportId,
      token: shareToken,
      expiresAt,
      createdAt: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
