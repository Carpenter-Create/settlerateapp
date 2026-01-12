import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AppIndex() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
        Create your first scenario.
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">
        Model a purchase or refinance to understand your long-term cost
        implications.
      </p>
      <Button asChild size="lg" className="mt-10">
        <Link to="/app/calculator">New scenario</Link>
      </Button>
    </div>
  );
}
