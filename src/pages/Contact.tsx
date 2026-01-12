import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { HeroStandard } from "@/components/layout/HeroStandard";

/**
 * Contact Page - Institutional, Factual
 * No emotional language in toasts or validation.
 */

const topics = [
  { value: "general", label: "General inquiry" },
  { value: "support", label: "Technical support" },
  { value: "billing", label: "Billing" },
  { value: "feature", label: "Feature request" },
  { value: "partnership", label: "Partnership" },
];

export default function Contact() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot) {
      toast("Submission blocked.");
      return;
    }

    const now = Date.now();
    if (now - lastSubmitTime < 5000) {
      toast("Request rate limited. Wait a moment before resubmitting.");
      return;
    }

    if (!fullName.trim() || !email.trim() || !topic || !message.trim()) {
      toast("Required fields missing.");
      return;
    }

    setIsSubmitting(true);
    setLastSubmitTime(now);

    try {
      const { error } = await supabase.from("contact_messages").insert({
        full_name: fullName.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
        user_id: user?.id || null,
      });

      if (error) throw error;

      setIsSubmitted(true);
    } catch (error: any) {
      toast("Message not sent. Review inputs and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full">
        <HeroStandard
          headline="Message received"
          subtitle="Your inquiry has been submitted. We'll respond within 1-2 business days."
        />

        <section
          className="w-full bg-surface-secondary"
          style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}
        >
          <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-md text-center">
              <Link
                to="/"
                className="text-sm text-foreground/60 transition-colors hover:text-foreground"
              >
                Return home
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full">
      <HeroStandard
        headline="Contact"
        subtitle="Questions, feedback, or partnership inquiries."
      />

      <section
        className="w-full bg-surface-secondary"
        style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border border-foreground/10 bg-surface-primary p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute -left-[9999px] opacity-0"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-normal">
                    Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-normal">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-sm font-normal">
                    Topic
                  </Label>
                  <Select value={topic} onValueChange={setTopic} disabled={isSubmitting}>
                    <SelectTrigger id="topic">
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-normal">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting}
                    rows={5}
                    className="resize-none"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
