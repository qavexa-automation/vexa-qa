"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Download, Maximize2, Minimize2, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatBytes, savingsPercent } from "../lib/compression-plan";
import { originalContentType, previewKind, TEXT_PREVIEW_LIMIT } from "../lib/preview-kind";
import type { Attachment } from "../types/attachment";

type Loaded = { url: string; text: string | null; clipped: boolean };
type State =
  | { status: "loading" }
  | { status: "ready"; loaded: Loaded }
  | { status: "error"; message: string };

/**
 * Previews one attachment in a dialog. The bytes are fetched once per open and held as an object
 * URL that is revoked when the dialog closes, so a preview never keeps a 10 MB blob alive.
 * Anything that cannot be rendered in place (archives, documents, SVG) is offered as a download.
 *
 * Images open filling the viewport, because a screenshot on a QA record is usually the evidence
 * being read rather than a thumbnail to glance at. Escape still closes the dialog.
 */
export function AttachmentPreview({
  attachment,
  onClose,
  onLoad,
  returnFocus,
}: {
  attachment: Attachment;
  onClose: () => void;
  onLoad: (attachment: Attachment) => Promise<Blob>;
  /** The trigger that opened the preview; focus returns to it on close. */
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Held in a ref so a parent re-render that changes the handler's identity never refetches.
  const load = useRef(onLoad);
  load.current = onLoad;

  const kind = previewKind(attachment);
  const contentType = originalContentType(attachment);
  const saved = savingsPercent(attachment.size, attachment.storedSize);
  const canExpand = kind === "image" || kind === "pdf";
  const [expanded, setExpanded] = useState(kind === "image");

  useEffect(() => {
    let active = true;
    let url: string | null = null;
    setState({ status: "loading" });
    load
      .current(attachment)
      .then(async (blob) => {
        // The decompressed blob carries no media type, so restore the attached file's own.
        const typed = blob.type === contentType ? blob : new Blob([blob], { type: contentType });
        const whole = kind === "text" ? await typed.text() : null;
        if (!active) return;
        url = URL.createObjectURL(typed);
        setState({
          status: "ready",
          loaded: {
            url,
            text: whole === null ? null : whole.slice(0, TEXT_PREVIEW_LIMIT),
            clipped: whole !== null && whole.length > TEXT_PREVIEW_LIMIT,
          },
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : `${attachment.name} could not be loaded.`,
        });
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment, attempt, contentType, kind]);

  const full = canExpand && expanded;

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      open
    >
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] grid-rows-[auto_1fr_auto] overflow-hidden sm:max-w-2xl",
          full && "inset-2 max-h-none w-auto max-w-none translate-x-0 translate-y-0 sm:max-w-none",
        )}
        finalFocus={returnFocus}
      >
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="line-clamp-2 min-w-0 wrap-anywhere">{attachment.name}</DialogTitle>
          <DialogDescription>
            {formatBytes(attachment.size)}
            {saved > 0 ? ` · stored at ${formatBytes(attachment.storedSize)}, ${saved}% smaller` : ""}
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "min-h-32 min-w-0 overflow-auto rounded-lg border bg-muted/30 p-2",
            full && "flex items-center justify-center",
          )}
        >
          {state.status === "loading" && (
            <p className="flex h-full items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading preview…
            </p>
          )}
          {state.status === "error" && (
            <Alert className={cn(full && "w-auto")} variant="destructive">
              <TriangleAlert />
              <AlertTitle>This attachment could not be opened</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                <span className="wrap-anywhere">{state.message}</span>
                <Button onClick={() => setAttempt((value) => value + 1)} size="sm" variant="outline">
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {state.status === "ready" && kind === "image" && (
            // The image itself toggles, so a pointer can zoom out without hunting for a control;
            // the footer button is the same action on the keyboard path.
            <button
              aria-label={full ? `Shrink ${attachment.name}` : `Expand ${attachment.name}`}
              aria-pressed={full}
              className={cn(
                "flex h-full w-full min-w-0 items-center justify-center rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                full ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
              onClick={() => setExpanded((value) => !value)}
              type="button"
            >
              <img
                alt={attachment.name}
                className={cn(
                  "mx-auto max-w-full rounded-md object-contain",
                  full ? "max-h-full" : "max-h-[55dvh] w-auto",
                )}
                src={state.loaded.url}
              />
            </button>
          )}
          {state.status === "ready" && kind === "pdf" && (
            <iframe
              className={cn("w-full rounded-md bg-background", full ? "h-full" : "h-[55dvh]")}
              src={state.loaded.url}
              title={attachment.name}
            />
          )}
          {state.status === "ready" && kind === "text" && (
            <>
              <pre className="max-h-[55dvh] overflow-auto text-xs whitespace-pre-wrap text-foreground">
                {state.loaded.text}
              </pre>
              {state.loaded.clipped && (
                <p className="pt-2 text-xs text-muted-foreground">
                  Preview clipped — download the file to read all of it.
                </p>
              )}
            </>
          )}
          {state.status === "ready" && kind === "other" && (
            <p className="flex h-full items-center justify-center py-8 text-center text-sm text-muted-foreground">
              This file type cannot be shown here. Download it to open it.
            </p>
          )}
        </div>
        <DialogFooter showCloseButton>
          {canExpand && state.status === "ready" && (
            <Button
              className="sm:mr-auto"
              onClick={() => setExpanded((value) => !value)}
              variant="ghost"
            >
              {full ? (
                <Minimize2 data-icon="inline-start" />
              ) : (
                <Maximize2 data-icon="inline-start" />
              )}
              {full ? "Exit full screen" : "Full screen"}
            </Button>
          )}
          {state.status === "ready" && (
            <a
              className={cn(buttonVariants({ variant: "default" }), "no-underline")}
              download={attachment.name}
              href={state.loaded.url}
            >
              <Download data-icon="inline-start" />
              Download
            </a>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
