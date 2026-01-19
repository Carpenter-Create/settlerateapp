/**
 * Sonner Toast - Institutional styling
 * 
 * Layout rules (LOCKED):
 * - Close (X) button has 12px inset from top/right inside toast
 * - 32-36px square hit target for close button
 * - Minimum 16px internal padding
 * - Subtle visibility (40% opacity on close icon, 100% on hover)
 * - No tinted background behind X unless hovered
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
            // Generous padding: 16px all around, extra right for close button
            "group-[.toaster]:py-4 group-[.toaster]:pl-4 group-[.toaster]:pr-12",
          ].join(" "),
          title: "group-[.toast]:text-sm group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: [
            // Opacity and transitions
            "group-[.toast]:opacity-40",
            "group-[.toast]:hover:opacity-100",
            "group-[.toast]:transition-opacity",
            // No background unless hovered
            "group-[.toast]:border-none",
            "group-[.toast]:bg-transparent",
            "group-[.toast]:hover:bg-muted/50",
            "group-[.toast]:text-muted-foreground",
            // Position: 12px inset from top-right
            "group-[.toast]:!absolute",
            "group-[.toast]:!top-3",
            "group-[.toast]:!right-3",
            // Hit target: 32x32px minimum
            "group-[.toast]:!w-8",
            "group-[.toast]:!h-8",
            "group-[.toast]:rounded-md",
            "group-[.toast]:flex",
            "group-[.toast]:items-center",
            "group-[.toast]:justify-center",
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