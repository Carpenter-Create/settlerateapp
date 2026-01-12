/**
 * InlineEditableName
 * 
 * A click-to-edit text field for renaming entities inline.
 * No modals, no buttons—just click, type, done.
 * 
 * UX:
 * - Click text → enters edit mode with autofocus
 * - Enter → save
 * - Escape → cancel (revert to previous)
 * - Blur → cancel (NOT auto-save, to prevent accidental changes)
 * - Error toast only on failure (silent save on success)
 * - Shows helper text on focus
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, FocusEvent } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditableNameProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Maximum character length (default: 80) */
  maxLength?: number;
  /** Show pencil icon on hover (default: true) */
  showEditIcon?: boolean;
}

export function InlineEditableName({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = "Untitled",
  disabled = false,
  maxLength = 80,
  showEditIcon = true,
}: InlineEditableNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Sync external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim();
    
    // If empty or unchanged, revert
    if (!trimmed || trimmed === value) {
      setEditValue(value);
      setIsEditing(false);
      return;
    }

    // Validate max length
    if (trimmed.length > maxLength) {
      setEditValue(value);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch (error) {
      // Parent handles error toast; revert to original
      setEditValue(value);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave, maxLength]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  // On blur: cancel (NOT auto-save) to prevent accidental changes
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // Small delay to allow click events to complete
    setTimeout(() => {
      if (isEditing) {
        handleCancel();
      }
    }, 150);
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(
            // Match text styling exactly - no visual jump
            "bg-transparent border-0 p-0 m-0",
            "outline-none ring-0",
            // Subtle focus ring
            "focus:ring-1 focus:ring-ring focus:ring-offset-0 rounded-sm px-1 -mx-1",
            // Inherit font styling
            "font-inherit text-inherit",
            // Saving state
            isSaving && "opacity-70",
            inputClassName,
          )}
          style={{ 
            width: "100%",
            font: "inherit",
            lineHeight: "inherit",
            letterSpacing: "inherit",
          }}
        />
        <p className="absolute -bottom-5 left-0 text-xs text-muted-foreground whitespace-nowrap">
          Press Enter to save · Esc to cancel
        </p>
      </div>
    );
  }

  return (
    <span
      onClick={handleClick}
      data-inline-edit
      className={cn(
        // Group for hover state
        "group inline-flex items-center gap-1.5",
        // Text cursor on hover
        "cursor-text",
        // Truncate gracefully
        "truncate",
        // Hover hint
        !disabled && "hover:bg-muted/40 rounded-sm px-1 -mx-1 transition-colors duration-100",
        disabled && "cursor-default",
        className,
      )}
      title={disabled ? undefined : "Click to rename"}
    >
      <span className="truncate">{value || placeholder}</span>
      {showEditIcon && !disabled && (
        <Pencil 
          className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" 
          strokeWidth={1.5}
        />
      )}
    </span>
  );
}
