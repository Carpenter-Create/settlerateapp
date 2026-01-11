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
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Our Commitment
            </h2>
            <p>
              SettleRate is built on a foundation of trust and privacy. We do not
              sell your data, we do not show you ads, and we do not refer you to
              lenders. Your mortgage calculations are yours alone.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-medium text-foreground">
              Data We Collect
            </h2>

            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Account Information</h3>
              <p>
                If you create an account, we collect your email address for
                authentication purposes. This is the only personal information we
                require.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Calculation Data</h3>
              <p>
                Your mortgage scenarios (purchase price, interest rates, loan
                terms, etc.) are stored to enable cloud sync across your devices.
                This data is encrypted and associated only with your account.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Usage Analytics</h3>
              <p>
                We collect anonymous, aggregated analytics to improve our product.
                This includes page views and feature usage, but never includes your
                financial calculations or personal information.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Data We Never Collect or Sell
            </h2>
            <ul className="list-inside list-disc space-y-1">
              <li>Your real name, address, or phone number</li>
              <li>Your actual financial information or credit score</li>
              <li>Your browsing history outside of SettleRate</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Third Parties
            </h2>
            <p>
              We use Stripe for payment processing. Stripe's privacy policy governs
              their handling of payment information. We never see or store your
              full credit card number.
            </p>
          </section>

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

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">Your Rights</h2>
            <p>
              You can export your data, delete individual scenarios, or delete your
              entire account at any time from your Settings page.
            </p>
          </section>

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
