import { Button } from "@/components/ui/button";
import { User, CreditCard, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-4">
        <SettingsSection
          icon={User}
          title="Account"
          description="You're using SettleRate as a guest. Sign in to sync your scenarios across devices."
        >
          <Button>Sign in with email</Button>
        </SettingsSection>

        <SettingsSection
          icon={CreditCard}
          title="Subscription"
          description="You're on the Free plan. Upgrade to unlock unlimited scenarios, cloud sync, and exports."
        >
          <Button variant="outline">View pricing</Button>
        </SettingsSection>

        <SettingsSection
          icon={Shield}
          title="Privacy"
          description="Your data is stored locally on this device. We never sell your information."
        >
          <div className="flex gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="/privacy">Privacy policy</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/terms">Terms of service</a>
            </Button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
