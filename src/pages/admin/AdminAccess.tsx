import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowLeft, Shield, UserPlus, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  target_user_id: string;
  target_email: string;
  action: string;
  created_at: string;
}

export default function AdminAccess() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch current admins
  const { data: admins, isLoading: adminsLoading } = useQuery({
    queryKey: ["admin-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admins");
      if (error) throw error;
      return data as AdminUser[];
    },
  });

  // Fetch recent audit log entries
  const { data: auditLog, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_recent_admin_promotions", {
        p_limit: 20,
      });
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  // Promote to admin mutation
  const promoteMutation = useMutation({
    mutationFn: async (targetEmail: string) => {
      const { data, error } = await supabase.rpc("promote_to_admin", {
        p_email: targetEmail,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, targetEmail) => {
      queryClient.invalidateQueries({ queryKey: ["admin-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-log"] });
      setEmail("");
      setError(null);
      setSuccess(`Admin access granted to ${targetEmail}`);
      toast.success("Admin access granted");
    },
    onError: (err: Error) => {
      setSuccess(null);
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    
    if (!email.includes("@")) {
      setError("Invalid email format");
      return;
    }
    
    promoteMutation.mutate(email.trim().toLowerCase());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <Link
            to="/app/scenarios"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Admin Access Management
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage administrator privileges for the application
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Promote to Admin */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5" />
                Promote User to Admin
              </CardTitle>
              <CardDescription>
                Grant administrator access to an existing user by email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">User email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={promoteMutation.isPending}
                  />
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    {success}
                  </div>
                )}
                
                <Button
                  type="submit"
                  disabled={promoteMutation.isPending}
                  className="w-full"
                >
                  {promoteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    "Promote to Admin"
                  )}
                </Button>
              </form>
              
              <p className="mt-4 text-xs text-muted-foreground">
                The user must have an existing account. Admin access is immediate and grants
                full SettleRate Professional access without billing.
              </p>
            </CardContent>
          </Card>

          {/* Current Admins */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Administrators</CardTitle>
              <CardDescription>
                Users with admin role
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adminsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : admins && admins.length > 0 ? (
                <div className="space-y-2">
                  {admins.map((admin) => (
                    <div
                      key={admin.user_id}
                      className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                    >
                      <span className="text-sm font-medium">{admin.email}</span>
                      <Badge variant="secondary" className="text-xs">
                        Since {format(new Date(admin.created_at), "MMM yyyy")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  No administrators found
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit Log */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Recent Admin Activity</CardTitle>
            <CardDescription>
              Promotions and webhook events for admin accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : auditLog && auditLog.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge
                            variant={
                              entry.action === "PROMOTE_TO_ADMIN"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {entry.action === "PROMOTE_TO_ADMIN"
                              ? "Promoted"
                              : "Webhook Ignored"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.target_email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.actor_email || "System"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No admin activity recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
