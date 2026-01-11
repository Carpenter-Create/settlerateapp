import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Accurate Calculations",
    description: "Compare mortgage scenarios with precision, including taxes, insurance, and PMI.",
  },
  {
    icon: TrendingUp,
    title: "Side-by-Side Comparison",
    description: "Evaluate multiple loan options at once to find the best fit for your finances.",
  },
  {
    icon: Shield,
    title: "Lender-Ready Reports",
    description: "Generate professional PDF exports to share with lenders and advisors.",
  },
  {
    icon: Zap,
    title: "Instant Insights",
    description: "See payment breakdowns, amortization schedules, and total costs immediately.",
  },
];

export default function Home() {
  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="text-center">
        <h1 className="mx-auto max-w-3xl text-3xl font-normal tracking-tight sm:text-4xl lg:text-5xl">
          Make confident mortgage decisions
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Compare purchase and refinance scenarios, understand total costs, and export lender-ready reports — all in one place.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link to="/auth">Get started free</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/pricing">View pricing</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-medium">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-lg border border-border bg-muted/30 p-8 text-center sm:p-12">
        <h2 className="text-2xl font-normal tracking-tight sm:text-3xl">
          Ready to compare your options?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Start for free. No credit card required.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">Create free account</Link>
        </Button>
      </section>
    </div>
  );
}
