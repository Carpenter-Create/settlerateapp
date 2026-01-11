import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="lead text-muted-foreground">
          Last updated: January 2025
        </p>

        <h2>Our Commitment</h2>
        <p>
          SettleRate is built on a foundation of trust and privacy. We do not sell your data,
          we do not show you ads, and we do not refer you to lenders. Your mortgage calculations
          are yours alone.
        </p>

        <h2>Data We Collect</h2>
        <h3>Account Information</h3>
        <p>
          If you create an account, we collect your email address for authentication purposes.
          This is the only personal information we require.
        </p>

        <h3>Calculation Data</h3>
        <p>
          Your mortgage scenarios (purchase price, interest rates, loan terms, etc.) are stored
          to enable cloud sync across your devices. This data is encrypted and associated only
          with your account.
        </p>

        <h3>Usage Analytics</h3>
        <p>
          We collect anonymous, aggregated analytics to improve our product. This includes page
          views and feature usage, but never includes your financial calculations or personal
          information.
        </p>

        <h2>Data We Never Collect or Sell</h2>
        <ul>
          <li>Your real name, address, or phone number</li>
          <li>Your actual financial information or credit score</li>
          <li>Your browsing history outside of SettleRate</li>
        </ul>

        <h2>Third Parties</h2>
        <p>
          We use Stripe for payment processing. Stripe's privacy policy governs their handling
          of payment information. We never see or store your full credit card number.
        </p>

        <h2>Data Retention</h2>
        <p>
          Your scenarios are retained for as long as you have an active account. If you delete
          your account, all associated data is permanently removed within 30 days.
        </p>

        <h2>Your Rights</h2>
        <p>
          You can export your data, delete individual scenarios, or delete your entire account
          at any time from your Settings page.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy? Contact us at privacy@settlerate.com.
        </p>
      </article>
    </div>
  );
}
