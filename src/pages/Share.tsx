/**
 * Share Page
 * 
 * Public route for accessing shared PDF exports.
 * Minimal UI - just loading, error states, and redirect to PDF.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { buildEdgeFunctionUrl } from "@/lib/edgeFunctionUrl";

type ShareStatus = "loading" | "error" | "success";

interface ShareError {
  title: string;
  message: string;
}

export default function Share() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<ShareStatus>("loading");
  const [error, setError] = useState<ShareError | null>(null);

  useEffect(() => {
    if (!token) {
      setError({
        title: "Invalid link",
        message: "This share link is not valid.",
      });
      setStatus("error");
      return;
    }

    resolveShare(token);
  }, [token]);

  const resolveShare = async (shareToken: string) => {
    try {
      // Call the edge function directly with GET to resolve the token
      // supabase-js invoke uses POST, so we use fetch directly
      const response = await fetch(
        `${buildEdgeFunctionUrl(import.meta.env.VITE_SUPABASE_URL, "export-share")}?token=${encodeURIComponent(shareToken)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          setError({
            title: "Link not found",
            message: "This share link does not exist or has been deleted.",
          });
        } else if (response.status === 410) {
          setError({
            title: "Link expired",
            message: errorData.error || "This share link has expired or been revoked.",
          });
        } else {
          setError({
            title: "Error",
            message: "Unable to access this shared document.",
          });
        }
        setStatus("error");
        return;
      }

      const result = await response.json();

      if (result.signedUrl) {
        setStatus("success");
        // Redirect to the signed URL
        window.location.href = result.signedUrl;
      } else {
        setError({
          title: "Error",
          message: "Unable to access this shared document.",
        });
        setStatus("error");
      }
    } catch (err) {
      console.error("Share resolution error:", err);
      setError({
        title: "Error",
        message: "An unexpected error occurred.",
      });
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full text-center">
        {/* Brand */}
        <p className="font-serif text-muted-foreground mb-8">SettleRate</p>

        {status === "loading" && (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-medium">Loading document...</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait while we retrieve your shared PDF.
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-medium">Opening PDF...</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your document should open automatically.
              </p>
            </div>
          </div>
        )}

        {status === "error" && error && (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-medium">{error.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {error.message}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-12 text-xs text-muted-foreground">
          settlerate.com
        </p>
      </div>
    </div>
  );
}
