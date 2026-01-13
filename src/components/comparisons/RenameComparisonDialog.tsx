/**
 * RenameComparisonDialog
 * 
 * Modal dialog for renaming a comparison.
 * Simple and focused: one input, validation, save/cancel.
 */

import { useState, useEffect, KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onSave: (newName: string) => Promise<void>;
}

const MIN_LENGTH = 1;
const MAX_LENGTH = 80;

export function RenameComparisonDialog({
  open,
  onOpenChange,
  currentName,
  onSave,
}: RenameComparisonDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
      setIsSaving(false);
    }
  }, [open, currentName]);

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_LENGTH) {
      return "Name cannot be empty";
    }
    if (trimmed.length > MAX_LENGTH) {
      return `Name must be ${MAX_LENGTH} characters or less`;
    }
    return null;
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    const validationError = validateName(trimmed);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    // If unchanged, just close
    if (trimmed === currentName) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(trimmed);
      onOpenChange(false);
    } catch (e) {
      setError("Unable to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSave();
    }
  };

  const handleChange = (value: string) => {
    setName(value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename comparison</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 py-2">
          <Label htmlFor="comparison-name" className="sr-only">
            Comparison name
          </Label>
          <Input
            id="comparison-name"
            value={name}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Comparison name"
            maxLength={MAX_LENGTH}
            disabled={isSaving}
            autoFocus
            className={error ? "border-destructive" : ""}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground text-right">
            {name.trim().length}/{MAX_LENGTH}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
