import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

/**
 * Advisor Request Modal - Institutional, Non-promotional
 * Eligibility-based access request flow.
 */

interface AdvisorRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const advisorRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  organization: z.string().trim().min(1, "Required").max(200),
  professionalRole: z.string().trim().min(1, "Required").max(100),
  intendedUse: z.string().trim().min(1, "Required").max(1000),
});

type FormData = z.infer<typeof advisorRequestSchema>;

export function AdvisorRequestModal({ open, onOpenChange }: AdvisorRequestModalProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    organization: "",
    professionalRole: "",
    intendedUse: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Honeypot field for spam protection
  const [honeypot, setHoneypot] = useState("");

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot) {
      // Silently fail for bots
      setIsSubmitted(true);
      return;
    }

    // Validate
    const result = advisorRequestSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("contact_messages").insert({
        full_name: formData.fullName,
        email: formData.email,
        topic: "advisor_access_request",
        message: JSON.stringify({
          organization: formData.organization,
          professionalRole: formData.professionalRole,
          intendedUse: formData.intendedUse,
        }),
      });

      if (error) throw error;

      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit advisor request:", error);
      setErrors({ fullName: "Unable to submit. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form when closing
      setTimeout(() => {
        setFormData({
          fullName: "",
          email: "",
          organization: "",
          professionalRole: "",
          intendedUse: "",
        });
        setErrors({});
        setIsSubmitted(false);
      }, 200);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Request advisor access</DialogTitle>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-foreground/30" strokeWidth={1} />
            <p className="mt-6 text-base font-medium text-foreground">
              Thank you. Your request has been received.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              If approved, you will receive access instructions by email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* Honeypot field - hidden from users */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              autoComplete="off"
            />

            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                disabled={isSubmitting}
                className={errors.fullName ? "border-destructive" : ""}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={isSubmitting}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization / firm name</Label>
              <Input
                id="organization"
                type="text"
                value={formData.organization}
                onChange={(e) => handleChange("organization", e.target.value)}
                disabled={isSubmitting}
                className={errors.organization ? "border-destructive" : ""}
              />
              {errors.organization && (
                <p className="text-xs text-destructive">{errors.organization}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="professionalRole">Professional role</Label>
              <Input
                id="professionalRole"
                type="text"
                value={formData.professionalRole}
                onChange={(e) => handleChange("professionalRole", e.target.value)}
                disabled={isSubmitting}
                className={errors.professionalRole ? "border-destructive" : ""}
              />
              {errors.professionalRole && (
                <p className="text-xs text-destructive">{errors.professionalRole}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="intendedUse">Brief description of intended use</Label>
              <Textarea
                id="intendedUse"
                value={formData.intendedUse}
                onChange={(e) => handleChange("intendedUse", e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className={errors.intendedUse ? "border-destructive" : ""}
              />
              {errors.intendedUse && (
                <p className="text-xs text-destructive">{errors.intendedUse}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Advisor access requests are reviewed to ensure alignment with SettleRate's neutrality and usage standards. Approved advisors receive access instructions and subscription details directly.
            </p>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit request"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
