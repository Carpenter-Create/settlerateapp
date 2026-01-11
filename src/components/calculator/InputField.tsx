import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InputFieldProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}

export function InputField({ label, description, children, className, optional }: InputFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <Label className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {optional && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
