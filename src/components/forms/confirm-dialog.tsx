"use client";

import type { ReactNode } from "react";

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

/**
 * Confirmation for a consequential action, opened by the caller (usually a row action). Closing
 * by Escape, the backdrop, or Cancel never runs the action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      open={open}
    >
      <AlertDialogContent>
        {/* Record names are user text and may have no spaces: let them break anywhere and clamp
            very long ones so the dialog keeps its width and stays short. */}
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle className="line-clamp-3 max-w-full min-w-0 wrap-anywhere">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="line-clamp-4 max-w-full min-w-0 wrap-anywhere">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
