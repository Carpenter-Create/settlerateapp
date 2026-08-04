import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Trash2, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useCapabilities } from "@/hooks/useCapabilities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminTestingPanel } from "@/components/admin/AdminTestingPanel";

/**
 * Settings Page - Institutional, Factual
 * No emotional or consumer language.
 */

export default function AppSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { hasPaid, realIsAdmin } = useCapabilities();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Update local state when profile loads
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  const handleSaveProfile = () => {
    updateProfile.mutate({ full_name: fullName.trim() || null });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "delete my account") {
      toast("Confirmation text required.");
      return;
    }

    setIsDeleting(true);

    try {
      await signOut();
      toast("Signed out. Contact support to complete account deletion.");
      navigate("/");
    } catch {
      toast("Delete unsuccessful. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Show subscription warning only for paid non-admin users
  // Admin users simulating as pro should not see this block user actions
  const showSubscriptionWarning = hasPaid && !realIsAdmin;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        {/* Brand serif for page headings */}
        <h1 className="font-serif text-2xl font-normal tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile and account management
        </p>
      </div>

      {/* Profile section */}
      <div className="border border-border rounded-sm p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-medium">Profile</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Account information
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted rounded-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter name"
                  className="rounded-sm"
                />
              </div>

              <Button
                className="rounded-sm"
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update profile"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete account section */}
      <div className="border border-border rounded-sm p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
            <Trash2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-medium">Remove Account</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently remove account and all associated data. This action cannot be undone.
              </p>
            </div>

            {showSubscriptionWarning && (
              <div className="flex items-start gap-2 rounded-sm border border-border bg-muted/30 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">Active subscription</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Cancel subscription before removing account.
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="rounded-sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={showSubscriptionWarning}
            >
              Remove account
            </Button>
          </div>
        </div>
      </div>

      {/* Admin testing panel - only visible to real admins */}
      {realIsAdmin && <AdminTestingPanel />}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove account</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="deleteConfirm">
              Type <strong>delete my account</strong> to confirm
            </Label>
            <Input
              id="deleteConfirm"
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="delete my account"
              disabled={isDeleting}
              className="rounded-sm"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-sm"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="rounded-sm"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== "delete my account"}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
