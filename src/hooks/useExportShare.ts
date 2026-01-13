/**
 * Export Share Hook
 * 
 * Handles creating and managing shareable PDF links using the
 * unified pdf_exports table with share_token column.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareResult {
  shareId: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

interface PdfExport {
  id: string;
  share_token: string | null;
  share_enabled: boolean;
  share_expires_at: string | null;
  created_at: string;
  status: string;
}

export function useExportShare() {
  const [isCreating, setIsCreating] = useState(false);
  const [shares, setShares] = useState<PdfExport[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  /**
   * Create a new shareable link for a scenario or comparison
   */
  const createShare = useCallback(
    async (
      entityType: "scenario" | "comparison",
      entityId: string,
      expiresInDays?: number
    ): Promise<ShareResult | null> => {
      setIsCreating(true);

      try {
        const { data, error } = await supabase.functions.invoke("export-share", {
          method: "POST",
          body: { entityType, entityId, expiresInDays },
        });

        if (error) {
          console.error("Create share error:", error);
          toast.error("Failed to create share link");
          return null;
        }

        return data as ShareResult;
      } catch (err) {
        console.error("Create share exception:", err);
        toast.error("Failed to create share link");
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  /**
   * Get the full share URL from a token
   */
  const getShareUrl = useCallback((token: string): string => {
    // Use the app's published URL for share links
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${token}`;
  }, []);

  /**
   * Copy share URL to clipboard
   */
  const copyShareUrl = useCallback(
    async (token: string): Promise<boolean> => {
      const url = getShareUrl(token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
        return true;
      } catch (err) {
        console.error("Copy failed:", err);
        toast.error("Failed to copy link");
        return false;
      }
    },
    [getShareUrl]
  );

  /**
   * Fetch existing shares for an entity from pdf_exports table
   */
  const fetchShares = useCallback(
    async (entityType: "scenario" | "comparison", entityId: string) => {
      setIsLoadingShares(true);

      try {
        // Query pdf_exports table for shares with this entity
        const { data: exports, error } = await supabase
          .from("pdf_exports")
          .select("id, share_token, share_enabled, share_expires_at, created_at, status")
          .eq("kind", entityType)
          .eq("source_id", entityId)
          .eq("share_enabled", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Fetch shares error:", error);
          setShares([]);
          return [];
        }

        const result = (exports || []) as PdfExport[];
        setShares(result);
        return result;
      } catch (err) {
        console.error("Fetch shares exception:", err);
        setShares([]);
        return [];
      } finally {
        setIsLoadingShares(false);
      }
    },
    []
  );

  /**
   * Revoke a share link by disabling sharing on the pdf_export
   */
  const revokeShare = useCallback(async (exportId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("pdf_exports")
        .update({ 
          share_enabled: false,
          share_token: null,
          share_expires_at: null,
        })
        .eq("id", exportId);

      if (error) {
        console.error("Revoke share error:", error);
        toast.error("Failed to revoke link");
        return false;
      }

      toast.success("Link revoked");
      return true;
    } catch (err) {
      console.error("Revoke share exception:", err);
      toast.error("Failed to revoke link");
      return false;
    }
  }, []);

  return {
    createShare,
    getShareUrl,
    copyShareUrl,
    fetchShares,
    revokeShare,
    shares,
    isCreating,
    isLoadingShares,
  };
}
