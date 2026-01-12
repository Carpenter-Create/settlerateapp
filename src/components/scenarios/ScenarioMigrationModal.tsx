import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScenarioMigrationModalProps {
  isOpen: boolean;
  scenarioCount: number;
  onSave: () => Promise<void>;
  onDismiss: () => void;
}

export function ScenarioMigrationModal({
  isOpen,
  scenarioCount,
  onSave,
  onDismiss,
}: ScenarioMigrationModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-normal">
            Save scenarios to your account?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            You have {scenarioCount} scenario{scenarioCount !== 1 ? "s" : ""} saved
            on this device. You can store {scenarioCount !== 1 ? "them" : "it"} in
            your account for access across devices.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onDismiss}
            disabled={isSaving}
            className="sm:order-1"
          >
            Not now
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="sm:order-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              "Save to my account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
