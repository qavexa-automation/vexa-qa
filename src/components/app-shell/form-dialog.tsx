"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A focused task in a dialog. Every overlay gets a title and a description,
 * traps focus while open, and returns focus to the trigger on close, which is
 * behaviour the primitive supplies and this wrapper preserves.
 */
export function FormDialog({
  trigger,
  title,
  description,
  children,
  className,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  children: (close: () => void) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={trigger as React.ReactElement<Record<string, unknown>>} />
      <DialogContent className={cn("max-h-[85dvh] overflow-y-auto sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}
