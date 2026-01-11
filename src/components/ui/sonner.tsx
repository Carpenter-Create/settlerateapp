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
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-transparent group-[.toast]:border-none group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:opacity-60 group-[.toast]:hover:opacity-100 group-[.toast]:transition-opacity group-[.toast]:absolute group-[.toast]:right-2 group-[.toast]:top-2",
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
