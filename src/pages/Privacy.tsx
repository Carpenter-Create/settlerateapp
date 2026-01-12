/**
 * Privacy Policy - Institutional, Minimal Data Philosophy
 *
 * These documents should read like infrastructure policy,
 * not startup compliance theater.
 */

import { DocumentPage } from "@/components/layout/DocumentPage";

export default function Privacy() {
  return (
    <DocumentPage title="Privacy Policy" subtitle="Last updated: January 2025">
      <div className="space-y-10">
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Data Philosophy
          </h2>
          <p>
            SettleRate is designed to minimize data collection and avoid
            monetization of user information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Information Collected
          </h2>
          <p>
            SettleRate collects only the information necessary to provide
            analytical functionality, including scenario inputs, account
            credentials, and usage metadata. Financial account information is not
            collected.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Use of Information
          </h2>
          <p>
            Information is used solely to operate, maintain, and improve the
            Service, including saving scenarios and generating analytical outputs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Data Sharing
          </h2>
          <p>
            SettleRate does not sell, rent, or share user data with lenders,
            brokers, advertisers, or third parties for marketing or referral
            purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Data Storage and Security
          </h2>
          <p>
            Data is stored using industry-standard security practices. While no
            system can be guaranteed secure, SettleRate implements reasonable
            safeguards to protect user information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            User Control
          </h2>
          <p>
            Users may access, update, or delete their data subject to account
            requirements and applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Third-Party Services
          </h2>
          <p>
            We use Stripe for payment processing. Stripe&apos;s privacy policy
            governs their handling of payment information. We never see or store
            your full credit card number.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Analytics
          </h2>
          <p>
            Aggregated, anonymized usage data may be used to improve the Service.
            Such data does not identify individual users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Data Retention
          </h2>
          <p>
            Your scenarios are retained for as long as you have an active account.
            If you delete your account, all associated data is permanently removed
            within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Changes
          </h2>
          <p>
            SettleRate may update this Privacy Policy periodically. Material
            changes will be reflected with an updated effective date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
            Contact
          </h2>
          <p>
            Questions about this policy? Contact us at{" "}
            <a
              href="mailto:privacy@settlerate.com"
              className="text-foreground underline underline-offset-2"
            >
              privacy@settlerate.com
            </a>
            .
          </p>
        </section>
      </div>
    </DocumentPage>
  );
}
