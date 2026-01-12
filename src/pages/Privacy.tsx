/**
 * Privacy Policy - Institutional, Minimal Data Philosophy
 * 
 * These documents should read like infrastructure policy,
 * not startup compliance theater.
 */

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl">
      <article className="space-y-8">
        <header className="space-y-3">
          <h1 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: January 2025
          </p>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Data Philosophy - Critical */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Data Philosophy
            </h2>
            <p>
              SettleRate is designed to minimize data collection and avoid 
              monetization of user information.
            </p>
          </section>

          {/* Information Collected */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Information Collected
            </h2>
            <p>
              SettleRate collects only the information necessary to provide 
              analytical functionality, including scenario inputs, account 
              credentials, and usage metadata. Financial account information 
              is not collected.
            </p>
          </section>

          {/* Use of Information */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Use of Information
            </h2>
            <p>
              Information is used solely to operate, maintain, and improve the 
              Service, including saving scenarios and generating analytical outputs.
            </p>
          </section>

          {/* Data Sharing */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Data Sharing
            </h2>
            <p>
              SettleRate does not sell, rent, or share user data with lenders, 
              brokers, advertisers, or third parties for marketing or referral 
              purposes.
            </p>
          </section>

          {/* Data Storage and Security */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Data Storage and Security
            </h2>
            <p>
              Data is stored using industry-standard security practices. While no 
              system can be guaranteed secure, SettleRate implements reasonable 
              safeguards to protect user information.
            </p>
          </section>

          {/* User Control */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              User Control
            </h2>
            <p>
              Users may access, update, or delete their data subject to account 
              requirements and applicable law.
            </p>
          </section>

          {/* Third-Party Services */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Third-Party Services
            </h2>
            <p>
              We use Stripe for payment processing. Stripe&apos;s privacy policy 
              governs their handling of payment information. We never see or store 
              your full credit card number.
            </p>
          </section>

          {/* Analytics */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Analytics
            </h2>
            <p>
              Aggregated, anonymized usage data may be used to improve the Service. 
              Such data does not identify individual users.
            </p>
          </section>

          {/* Data Retention */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Data Retention
            </h2>
            <p>
              Your scenarios are retained for as long as you have an active 
              account. If you delete your account, all associated data is 
              permanently removed within 30 days.
            </p>
          </section>

          {/* Changes */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Changes
            </h2>
            <p>
              SettleRate may update this Privacy Policy periodically. Material 
              changes will be reflected with an updated effective date.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">Contact</h2>
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
      </article>
    </div>
  );
}
