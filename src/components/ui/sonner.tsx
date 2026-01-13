/**
 * Sonner Toast - Institutional styling
 * 
 * Layout rules (LOCKED):
 * - Close (X) icon integrated in content flow (not absolute)
 * - Minimum 16px internal padding
 * - Icon vertically centered with first line of text
 * - Subtle visibility (30% opacity on close icon)
 */

import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      visibleToasts={2}
      gap={8}
      toastOptions={{
        duration: 5000,
        classNames: {
          toast: [
            "group toast",
            "group-[.toaster]:bg-card",
            "group-[.toaster]:text-foreground",
            "group-[.toaster]:border group-[.toaster]:border-border/60",
            "group-[.toaster]:shadow-md",
            "group-[.toaster]:rounded-lg",
            "group-[.toaster]:py-4 group-[.toaster]:px-4",
          ].join(" "),
          title: "group-[.toast]:text-sm group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: [
            "group-[.toast]:opacity-40",
            "group-[.toast]:hover:opacity-100",
            "group-[.toast]:transition-opacity",
            "group-[.toast]:border-none",
            "group-[.toast]:bg-transparent",
            "group-[.toast]:text-muted-foreground",
            "group-[.toast]:hover:bg-transparent",
            // Position within flow, not touching edges
            "group-[.toast]:static",
            "group-[.toast]:ml-auto",
            "group-[.toast]:shrink-0",
          ].join(" "),
          error: [
            "group-[.toaster]:bg-destructive/5",
            "group-[.toaster]:text-destructive",
            "group-[.toaster]:border-destructive/20",
          ].join(" "),
          success: "group-[.toaster]:border-success/30",
        },
      }}
      closeButton
      {...props}
    />
  );
};

// Helper functions with appropriate durations
const successToast = (message: string, description?: string) => {
  toast.success(message, { description, duration: 4000 });
};

const errorToast = (message: string, description?: string) => {
  toast.error(message, { description, duration: 8000 });
};

const infoToast = (message: string, description?: string) => {
  toast(message, { description, duration: 5000 });
};

export { Toaster, toast, successToast, errorToast, infoToast };
