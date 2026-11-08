"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DesignSystemSection } from "@/features/design-system/components/design-system-section";

export function OverlaysSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <DesignSystemSection
      description="Dialogs focus a task, sheets preserve surrounding context, and alert dialogs confirm consequential actions."
      rule="Every overlay has a title, description, safe dismissal, focus restoration, and dirty-state protection when needed."
      title="Overlays"
    >
      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit record</DialogTitle>
              <DialogDescription>Focused work belongs in a dialog on larger screens.</DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton>
              <Button>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Record details</SheetTitle>
              <SheetDescription>Complementary detail stays beside the current list.</SheetDescription>
            </SheetHeader>
            <dl className="grid gap-4 px-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Code</dt><dd className="mt-1 font-mono">REC-20841</dd></div>
              <div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="mt-1">Operations</dd></div>
            </dl>
          </SheetContent>
        </Sheet>

        <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
          <AlertDialogTrigger render={<Button variant="destructive" />}>Archive record</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive “Quarterly review”?</AlertDialogTitle>
              <AlertDialogDescription>The record leaves active views, but its history remains available.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setConfirmOpen(false)} variant="destructive">Archive record</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DesignSystemSection>
  );
}
