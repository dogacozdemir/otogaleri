import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  /** Optional icon (e.g. Trash2 for delete) - shown above title */
  icon?: React.ReactNode;
  /** Extra class for the dialog content box */
  contentClassName?: string;
}

/**
 * Modern confirmation dialog component
 * Replaces browser confirm() with accessible AlertDialog; matches site design.
 */
export const ConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Onayla",
  cancelText = "İptal",
  variant = "default",
  icon,
  contentClassName,
}: ConfirmationDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "rounded-2xl border-border shadow-xl sm:max-w-md",
          contentClassName
        )}
      >
        <AlertDialogHeader className="space-y-4">
          {icon && (
            <div
              className={cn(
                "mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                variant === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              )}
            >
              {icon}
            </div>
          )}
          <AlertDialogTitle className="text-center text-lg font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="rounded-xl min-h-[44px]">{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              "rounded-xl min-h-[44px]",
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
