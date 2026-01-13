/**
 * Share Modal Component
 * 
 * Provides UI for creating and managing shareable PDF links.
 * Institutional, minimal design matching SettleRate brand.
 */

import { useState, useEffect } from "react";
import { Link2, Copy, Check, XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useExportShare } from "@/hooks/useExportShare";
import { cn } from "@/lib/utils";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "scenario" | "comparison";
  entityId: string;
  entityName?: string;
}

export function ShareModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
}: ShareModalProps) {
  const {
    createShare,
    getShareUrl,
    copyShareUrl,
    fetchShares,
    revokeShare,
    shares,
    isCreating,
    isLoadingShares,
  } = useExportShare();

  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch existing shares when modal opens
  useEffect(() => {
    if (open) {
      fetchShares(entityType, entityId);
      setNewShareUrl(null);
      setCopied(false);
    }
  }, [open, entityType, entityId, fetchShares]);

  const handleCreateShare = async () => {
    const result = await createShare(entityType, entityId);
    if (result) {
      setNewShareUrl(getShareUrl(result.token));
      fetchShares(entityType, entityId);
    }
  };

  const handleCopy = async (token: string) => {
    const success = await copyShareUrl(token);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = async (shareId: string) => {
    const success = await revokeShare(shareId);
    if (success) {
      fetchShares(entityType, entityId);
    }
  };

  // Filter to only show shares that are enabled and have a token
  const activeShares = shares.filter((s) => s.share_enabled && s.share_token);
  const entityLabel = entityType === "scenario" ? "Scenario" : "Comparison";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif font-normal text-lg tracking-tight">
            Share PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Entity info */}
          <p className="text-sm text-muted-foreground">
            Create a shareable link to this {entityLabel.toLowerCase()}'s PDF export.
            {entityName && (
              <span className="block mt-1 font-medium text-foreground">
                "{entityName}"
              </span>
            )}
          </p>

          {/* New share URL display */}
          {newShareUrl && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-2">Share link created:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background rounded px-2 py-1.5 truncate border">
                  {newShareUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(newShareUrl.split("/share/")[1])}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Create new share button */}
          <Button
            onClick={handleCreateShare}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating link...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Create share link
              </>
            )}
          </Button>

          {/* Existing shares */}
          {(isLoadingShares || activeShares.length > 0) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Active links</h4>
              
              {isLoadingShares ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : activeShares.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active links</p>
              ) : (
                <ul className="space-y-2">
                  {activeShares.map((share) => (
                    <li
                      key={share.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <code className="text-xs text-muted-foreground truncate block">
                          ...{share.share_token?.slice(-12)}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(share.created_at).toLocaleDateString()}
                          {share.share_expires_at && (
                            <> · Expires {new Date(share.share_expires_at).toLocaleDateString()}</>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => share.share_token && handleCopy(share.share_token)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevoke(share.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Info text */}
          <p className="text-xs text-muted-foreground">
            Anyone with the link can view and download this PDF. Links can be revoked at any time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
