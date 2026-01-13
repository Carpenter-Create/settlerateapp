/**
 * Export Share Hook
 * 
 * Handles creating and managing shareable PDF links.
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

interface ExportShare {
  id: string;
  token: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function useExportShare() {
  const [isCreating, setIsCreating] = useState(false);
  const [shares, setShares] = useState<ExportShare[]>([]);
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
   * Fetch existing shares for an entity
   */
  const fetchShares = useCallback(
    async (entityType: "scenario" | "comparison", entityId: string) => {
      setIsLoadingShares(true);

      try {
        // First get the export file
        const { data: exportFile, error: fileError } = await supabase
          .from("export_files")
          .select("id")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .maybeSingle();

        if (fileError || !exportFile) {
          setShares([]);
          return [];
        }

        // Then get shares for that file
        const { data: sharesData, error: sharesError } = await supabase
          .from("export_shares")
          .select("id, token, expires_at, revoked_at, created_at")
          .eq("export_file_id", exportFile.id)
          .order("created_at", { ascending: false });

        if (sharesError) {
          console.error("Fetch shares error:", sharesError);
          setShares([]);
          return [];
        }

        const result = (sharesData || []) as ExportShare[];
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
   * Revoke a share link
   */
  const revokeShare = useCallback(async (shareId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("export_shares")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", shareId);

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
