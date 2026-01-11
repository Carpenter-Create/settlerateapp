import { ReactNode } from "react";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Header />
      <main className="w-full max-w-full px-4 pb-24 pt-4 sm:px-6 md:pb-12 md:pt-8 lg:container lg:px-8">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
