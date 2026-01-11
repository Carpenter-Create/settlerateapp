import { Toaster as Sonner, toast } from "sonner";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      visibleToasts={2}
      toastOptions={{
        duration: 5000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-sm group-[.toaster]:rounded-md",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive",
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
