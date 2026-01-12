import { useEffect, useState } from "react";
import { useScenarios } from "@/hooks/useScenarios";
import { useAuth } from "@/contexts/AuthContext";
import { ScenarioMigrationModal } from "@/components/scenarios/ScenarioMigrationModal";
import { toast } from "sonner";

/**
 * Provider component that shows migration prompt when user logs in
 * with existing localStorage scenarios
 */
export function ScenarioMigrationProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    isLoaded, 
    hasPendingMigration, 
    getPendingMigrationCount, 
    migrateToAccount, 
    dismissMigration 
  } = useScenarios();

  const [showModal, setShowModal] = useState(false);
  const [migrationCount, setMigrationCount] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);

  // Check for pending migration after auth and scenarios are loaded
  useEffect(() => {
    if (authLoading || !isLoaded || hasChecked) return;
    if (!user) {
      setHasChecked(false); // Reset when user logs out
      return;
    }

    setHasChecked(true);

    // Small delay to ensure store is fully initialized
    const timer = setTimeout(() => {
      if (hasPendingMigration()) {
        const count = getPendingMigrationCount();
        if (count > 0) {
          setMigrationCount(count);
          setShowModal(true);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [user, authLoading, isLoaded, hasPendingMigration, getPendingMigrationCount, hasChecked]);

  const handleSave = async () => {
    const result = await migrateToAccount();
    
    if (result.success) {
      setShowModal(false);
      toast.success("Scenarios saved to your account");
    } else {
      toast.error("Failed to save scenarios", { 
        description: result.error || "Please try again" 
      });
    }
  };

  const handleDismiss = () => {
    dismissMigration();
    setShowModal(false);
  };

  return (
    <>
      {children}
      <ScenarioMigrationModal
        isOpen={showModal}
        scenarioCount={migrationCount}
        onSave={handleSave}
        onDismiss={handleDismiss}
      />
    </>
  );
}
