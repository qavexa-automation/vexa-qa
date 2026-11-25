"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  pending = false,
  error,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  error?: string;
}) {
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
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
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm} variant="destructive">
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
