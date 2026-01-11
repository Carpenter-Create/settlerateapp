import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="lead text-muted-foreground">
          Last updated: January 2025
        </p>

        <h2>Agreement to Terms</h2>
        <p>
          By accessing or using SettleRate, you agree to be bound by these Terms of Service.
          If you do not agree, please do not use our service.
        </p>

        <h2>Description of Service</h2>
        <p>
          SettleRate is a mortgage calculation and decision support tool. We provide calculators,
          scenario comparison features, and related functionality to help you understand mortgage
          costs.
        </p>

        <h2>Important Disclaimer</h2>
        <p>
          <strong>SettleRate is not a financial advisor, lender, or mortgage broker.</strong> Our
          calculations are estimates based on the information you provide. Actual mortgage terms,
          rates, and costs will vary. Always consult with qualified financial professionals before
          making mortgage decisions.
        </p>

        <h2>Account Responsibilities</h2>
        <p>
          You are responsible for maintaining the security of your account and for all activities
          that occur under your account. Notify us immediately of any unauthorized use.
        </p>

        <h2>Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service for any illegal purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the service</li>
          <li>Resell or redistribute the service without permission</li>
        </ul>

        <h2>Subscription and Billing</h2>
        <p>
          Paid subscriptions are billed monthly or annually. You may cancel at any time, and your
          access will continue until the end of your current billing period. Refunds are provided
          at our discretion.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          SettleRate is provided "as is" without warranties of any kind. We are not liable for any
          damages arising from your use of the service, including but not limited to financial
          decisions made based on our calculations.
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the service after changes
          constitutes acceptance of the new terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Contact us at legal@settlerate.com.
        </p>
      </article>
    </div>
  );
}
