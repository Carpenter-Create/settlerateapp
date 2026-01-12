import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface RequestFormData {
  full_name: string;
  company: string;
  website: string;
  role_title: string;
  notes: string;
}

export default function AdvisorRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isAdvisor, isLoading: capsLoading } = useCapabilities();

  const [formData, setFormData] = useState<RequestFormData>({
    full_name: "",
    company: "",
    website: "",
    role_title: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Check if user already has a pending request
  const existingRequestQuery = useQuery({
    queryKey: ["advisor-request-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("advisor_access_requests")
        .select("id, status, created_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking existing request:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      if (!user?.id || !user?.email) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase
        .from("advisor_access_requests")
        .insert({
          user_id: user.id,
          email: user.email,
          full_name: data.full_name || null,
          company: data.company || null,
          website: data.website || null,
          role_title: data.role_title || null,
          notes: data.notes || null,
          status: "pending",
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("You have already submitted a request.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (capsLoading || existingRequestQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Already admin or advisor
  if (isAdmin || isAdvisor) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-6 py-16">
          <Link
            to="/app/scenarios"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to scenarios
          </Link>

          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-600 mb-4" />
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Advisor access is already enabled for your account.
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              You have full access to all advisor features.
            </p>
            <Button
              className="mt-8"
              onClick={() => navigate("/app/scenarios")}
            >
              Go to scenarios
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Already submitted a request
  const existingRequest = existingRequestQuery.data;
  if (existingRequest || submitted) {
    const status = existingRequest?.status || "pending";
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-6 py-16">
          <Link
            to="/app/scenarios"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to scenarios
          </Link>

          <div className="text-center">
            {status === "pending" && (
              <>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-amber-600" />
                </div>
                <h1 className="font-serif text-2xl font-medium text-foreground">
                  Request received
                </h1>
                <p className="mt-4 text-sm text-muted-foreground">
                  Your advisor access request is under review. We will email you
                  once a decision has been made.
                </p>
              </>
            )}
            {status === "approved" && (
              <>
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-600 mb-4" />
                <h1 className="font-serif text-2xl font-medium text-foreground">
                  Request approved
                </h1>
                <p className="mt-4 text-sm text-muted-foreground">
                  Your advisor access has been granted. Refresh the page to access
                  advisor features.
                </p>
              </>
            )}
            {status === "denied" && (
              <>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">×</span>
                </div>
                <h1 className="font-serif text-2xl font-medium text-foreground">
                  Request denied
                </h1>
                <p className="mt-4 text-sm text-muted-foreground">
                  Your advisor access request was not approved. If you believe
                  this is an error, please contact support.
                </p>
              </>
            )}
            <Button
              variant="outline"
              className="mt-8"
              onClick={() => navigate("/app/scenarios")}
            >
              Go to scenarios
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show request form
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link
          to="/app/scenarios"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to scenarios
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Request Advisor Access
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Advisor access enables professional review workflows and
            client-facing modeling capabilities.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Jane Smith"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company or organization</Label>
            <Input
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Acme Financial Advisors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role_title">Your role</Label>
            <Input
              id="role_title"
              name="role_title"
              value={formData.role_title}
              onChange={handleChange}
              placeholder="Mortgage Broker, Financial Advisor, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">How do you plan to use SettleRate?</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Describe your intended use..."
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Submit request
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Requests are typically reviewed within 1–2 business days.
        </p>
      </div>
    </div>
  );
}
