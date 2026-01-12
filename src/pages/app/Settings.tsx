import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Trash2, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useBilling, isPro } from "@/hooks/useBilling";
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

/**
 * Settings Page - Institutional, Factual
 * No emotional or consumer language.
 */

export default function AppSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: billing } = useBilling();
  const updateProfile = useUpdateProfile();
  const userIsPro = isPro(billing);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Update local state when profile loads
  useState(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  });

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
      // Sign out and notify user to contact support for account deletion
      await signOut();
      toast("Signed out. Contact support to complete account deletion.");
      navigate("/");
    } catch (error: any) {
      toast("Delete unsuccessful. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage profile and account
        </p>
      </div>

      {/* Profile section */}
      <div className="card-elevated p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
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
                  className="bg-muted"
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
                />
              </div>

              <Button
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
      <div className="card-elevated border-destructive/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-medium text-destructive">Remove Account</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently remove account and all associated data. This action cannot be undone.
              </p>
            </div>

            {userIsPro && (
              <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-warning-foreground">Active subscription</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Cancel subscription before removing account.
                  </p>
                  <Button variant="link" asChild className="mt-1 h-auto p-0">
                    <a
                      href={`https://billing.stripe.com/p/login/test_xxx`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Manage billing
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={userIsPro}
            >
              Remove account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove account</DialogTitle>
            <DialogDescription>
              This will permanently remove your account, scenarios, and all associated data.
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
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
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
