import { ReactNode } from "react";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />
      <main className="container pb-20 pt-6 md:pb-12 md:pt-8">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
