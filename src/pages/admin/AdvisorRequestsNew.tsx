import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdvisorRequest {
  id: string;
  user_id: string;
  full_name: string | null;
  company: string | null;
  website: string | null;
  role_title: string | null;
  email: string;
  notes: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge variant="default" className="bg-emerald-600">Approved</Badge>;
    case "denied":
      return <Badge variant="destructive">Denied</Badge>;
    case "pending":
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

export default function AdvisorRequestsAdmin() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<AdvisorRequest | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending");

  // Fetch all advisor requests
  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["advisor-requests-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advisor_access_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdvisorRequest[];
    },
  });

  // Approve/deny mutation using the RPC function
  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => {
      const { data, error } = await supabase.rpc("approve_advisor_request", {
        request_id: requestId,
        approve,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["advisor-requests-admin"] });
      setSelectedRequest(null);
      toast.success(variables.approve ? "Request approved." : "Request denied.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleApprove = () => {
    if (!selectedRequest) return;
    reviewMutation.mutate({ requestId: selectedRequest.id, approve: true });
  };

  const handleDeny = () => {
    if (!selectedRequest) return;
    reviewMutation.mutate({ requestId: selectedRequest.id, approve: false });
  };

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const reviewedRequests = requests?.filter((r) => r.status !== "pending") || [];

  const displayedRequests = activeTab === "pending" ? pendingRequests : reviewedRequests;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <Link
            to="/app/scenarios"
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "reviewed")}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">
              Pending {pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                Failed to load requests
              </div>
            ) : displayedRequests.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
                No {activeTab} requests
              </div>
            ) : (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.full_name || "—"}
                        </TableCell>
                        <TableCell>{request.company || "—"}</TableCell>
                        <TableCell>{request.role_title || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {request.email}
                        </TableCell>
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
                            {request.status === "pending" ? "Review" : "View"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detail Modal */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                Advisor request
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
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company</span>
                    <p className="font-medium">{selectedRequest.company || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Role</span>
                    <p className="font-medium">{selectedRequest.role_title || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Website</span>
                    <p className="font-medium">
                      {selectedRequest.website ? (
                        <a
                          href={selectedRequest.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {selectedRequest.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Intended use</span>
                    <p className="font-medium whitespace-pre-wrap">
                      {selectedRequest.notes || "—"}
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
                  {selectedRequest.reviewed_at && (
                    <div>
                      <span className="text-muted-foreground">Reviewed</span>
                      <p className="font-medium">
                        {format(new Date(selectedRequest.reviewed_at), "MMMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  )}
                </div>

                {selectedRequest.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={handleApprove}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleDeny}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Deny
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
