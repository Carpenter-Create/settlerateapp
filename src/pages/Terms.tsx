export default function Terms() {
  return (
    <div className="mx-auto max-w-2xl">
      <article className="space-y-8">
        <header className="space-y-3">
          <h1 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: January 2025
          </p>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Agreement to Terms
            </h2>
            <p>
              By accessing or using SettleRate, you agree to be bound by these
              Terms of Service. If you do not agree, please do not use our
              service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Description of Service
            </h2>
            <p>
              SettleRate is a mortgage calculation and decision support tool. We
              provide calculators, scenario comparison features, and related
              functionality to help you understand mortgage costs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Important Disclaimer
            </h2>
            <p>
              <strong className="text-foreground">
                SettleRate is not a financial advisor, lender, or mortgage broker.
              </strong>{" "}
              Our calculations are estimates based on the information you provide.
              Actual mortgage terms, rates, and costs will vary. Always consult
              with qualified financial professionals before making mortgage
              decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Account Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the security of your account and
              for all activities that occur under your account. Notify us
              immediately of any unauthorized use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Resell or redistribute the service without permission</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Subscription and Billing
            </h2>
            <p>
              Paid subscriptions are billed monthly or annually. You may cancel at
              any time, and your access will continue until the end of your current
              billing period. Refunds are provided at our discretion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Limitation of Liability
            </h2>
            <p>
              SettleRate is provided "as is" without warranties of any kind. We are
              not liable for any damages arising from your use of the service,
              including but not limited to financial decisions made based on our
              calculations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of the
              service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium text-foreground">Contact</h2>
            <p>
              Questions about these terms? Contact us at{" "}
              <a
                href="mailto:legal@settlerate.com"
                className="text-foreground underline underline-offset-2"
              >
                legal@settlerate.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
