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
 * - Blur → save
 * - Error toast only on failure (silent save on success)
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, FocusEvent } from "react";
import { cn } from "@/lib/utils";

interface InlineEditableNameProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function InlineEditableName({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = "Untitled",
  disabled = false,
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
  }, [editValue, value, onSave]);

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

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // Small delay to allow click events to complete
    setTimeout(() => {
      if (isEditing) {
        void handleSave();
      }
    }, 100);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        placeholder={placeholder}
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
    );
  }

  return (
    <span
      onClick={handleClick}
      data-inline-edit
      className={cn(
        // Text cursor on hover
        "cursor-text",
        // Truncate gracefully
        "truncate block",
        // Hover hint
        !disabled && "hover:bg-muted/40 rounded-sm px-1 -mx-1 transition-colors duration-100",
        disabled && "cursor-default",
        className,
      )}
      title={disabled ? undefined : "Click to rename"}
    >
      {value || placeholder}
    </span>
  );
}
