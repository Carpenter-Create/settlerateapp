import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { STRIPE_ADVISOR_MONTHLY_PRICE_ID, STRIPE_ADVISOR_ANNUAL_PRICE_ID } from "@/lib/stripe";

interface AdvisorRequest {
  id: string;
  full_name: string | null;
  email: string | null;
  message: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface ParsedMessage {
  organization?: string;
  professionalRole?: string;
  intendedUse?: string;
}

function parseMessage(message: string | null): ParsedMessage {
  if (!message) return {};
  try {
    return JSON.parse(message);
  } catch {
    return { intendedUse: message };
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge variant="default" className="bg-emerald-600">Approved</Badge>;
    case "declined":
      return <Badge variant="destructive">Declined</Badge>;
    case "new":
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

export default function AdvisorRequests() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<AdvisorRequest | null>(null);
  const [billingCadence, setBillingCadence] = useState<"monthly" | "annual">("monthly");
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Fetch advisor access requests
  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["advisor-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .eq("topic", "advisor_access_request")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdvisorRequest[];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, email, cadence }: { requestId: string; email: string; cadence: "monthly" | "annual" }) => {
      const priceId = cadence === "annual" ? STRIPE_ADVISOR_ANNUAL_PRICE_ID : STRIPE_ADVISOR_MONTHLY_PRICE_ID;
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://vpcxzbaxhpucvevnkalo.supabase.co/functions/v1/admin-assign-advisor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            request_id: requestId,
            email,
            price_id: priceId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve request");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisor-requests"] });
      setSelectedRequest(null);
      toast.success("Advisor access granted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({
          status: "declined",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisor-requests"] });
      setSelectedRequest(null);
      toast.success("Request declined");
    },
    onError: () => {
      toast.error("Failed to decline request");
    },
  });

  const handleApprove = async () => {
    if (!selectedRequest?.email) {
      toast.error("No email address for this request");
      return;
    }
    setIsApproving(true);
    try {
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        email: selectedRequest.email,
        cadence: billingCadence,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
    setIsDeclining(true);
    try {
      await declineMutation.mutateAsync(selectedRequest.id);
    } finally {
      setIsDeclining(false);
    }
  };

  const parsed = selectedRequest ? parseMessage(selectedRequest.message) : {};

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Advisor Access Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage advisor access requests
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load requests
          </div>
        ) : requests?.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
            No advisor access requests
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((request) => {
                  const parsed = parseMessage(request.message);
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.full_name || "—"}
                      </TableCell>
                      <TableCell>{parsed.organization || "—"}</TableCell>
                      <TableCell>{parsed.professionalRole || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(request.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                Review Request
              </DialogTitle>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6 py-4">
                <div className="grid gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Full name</span>
                    <p className="font-medium">{selectedRequest.full_name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <p className="font-medium">{selectedRequest.email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Organization</span>
                    <p className="font-medium">{parsed.organization || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Professional role</span>
                    <p className="font-medium">{parsed.professionalRole || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Intended use</span>
                    <p className="font-medium whitespace-pre-wrap">
                      {parsed.intendedUse || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted</span>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.created_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <StatusBadge status={selectedRequest.status} />
                    </div>
                  </div>
                </div>

                {selectedRequest.status === "new" && (
                  <>
                    <div className="border-t pt-6">
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Billing cadence
                      </label>
                      <Select
                        value={billingCadence}
                        onValueChange={(v) => setBillingCadence(v as "monthly" | "annual")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly ($99/month)</SelectItem>
                          <SelectItem value="annual">Annual ($990/year)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={handleApprove}
                        disabled={isApproving || isDeclining}
                      >
                        {isApproving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleDecline}
                        disabled={isApproving || isDeclining}
                      >
                        {isDeclining ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Decline
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
