"use client";

import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { Eye, Paperclip, Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/components/app-shell/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatBytes, savingsPercent } from "../lib/compression-plan";
import { MAX_ATTACHMENTS_PER_RECORD, type Attachment } from "../types/attachment";
import { AttachmentPreview } from "./attachment-preview";

/**
 * The Attachments cell. Files arrive by drop, by paste onto the focused cell, or through the
 * browse button, which is the keyboard path: drag and paste alone would leave the column
 * unreachable without a pointer.
 */
export function AttachmentCell({
  attachments,
  subject,
  busy = false,
  disabled = false,
  onAdd,
  onRemove,
  onLoad,
}: {
  attachments: Attachment[];
  /** Names the record in labels, e.g. "Portal: Login". */
  subject: string;
  busy?: boolean;
  disabled?: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (attachment: Attachment) => void;
  onLoad: (attachment: Attachment) => Promise<Blob>;
}) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const full = attachments.length >= MAX_ATTACHMENTS_PER_RECORD;
  const locked = disabled || busy;

  function accept(files: FileList | null | undefined) {
    const list = Array.from(files ?? []);
    if (list.length && !locked) onAdd(list);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer?.files);
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    if (!event.clipboardData?.files?.length) return;
    event.preventDefault();
    accept(event.clipboardData.files);
  }

  return (
    <div
      aria-label={`Attachments for ${subject}. Drop or paste a file here, or use the attach button.`}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-md border border-dashed border-transparent p-1 transition-colors",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        dragging && "border-brand bg-brand-subtle",
        locked && "opacity-60",
      )}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        if (locked) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={onDrop}
      onPaste={onPaste}
      role="group"
      tabIndex={0}
    >
      <input
        accept="*/*"
        className="sr-only"
        multiple
        onChange={(event) => {
          accept(event.target.files);
          event.target.value = "";
        }}
        ref={picker}
        tabIndex={-1}
        type="file"
      />
      {attachments.map((attachment) => {
        const saved = savingsPercent(attachment.size, attachment.storedSize);
        return (
          <div className="flex min-w-0 items-center gap-1" key={attachment.id}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label={`Preview ${attachment.name}`}
                    data-slot="attachment-preview-trigger"
                    className="flex min-w-0 flex-1 items-center gap-1 rounded-sm px-1 py-0.5 text-left text-xs text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    onClick={(event) => {
                      previewTrigger.current = event.currentTarget;
                      setPreview(attachment);
                    }}
                    type="button"
                  />
                }
              >
                <Paperclip aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <Eye aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                {attachment.name} · {formatBytes(attachment.storedSize)}
                {saved > 0 ? ` (${saved}% smaller than ${formatBytes(attachment.size)})` : ""}
                {" · click to preview"}
              </TooltipContent>
            </Tooltip>
            <IconButton
              ariaLabel={`Remove attachment ${attachment.name} from ${subject}`}
              className="size-6 shrink-0"
              destructive
              disabled={locked}
              icon={Trash2}
              label="Remove attachment"
              onClick={() => onRemove(attachment)}
            />
          </div>
        );
      })}
      {busy && (
        <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <Spinner className="size-3" />
          Compressing…
        </span>
      )}
      {!full && !busy && (
        <IconButton
          ariaLabel={`Attach a file to ${subject}`}
          className="size-6 self-start"
          disabled={locked}
          icon={Plus}
          label={attachments.length ? "Attach another file" : "Attach a file, or drop one here"}
          onClick={() => picker.current?.click()}
        />
      )}
      {!attachments.length && !busy && (
        <span aria-hidden="true" className="sr-only">
          No attachments
        </span>
      )}
      {preview && (
        <AttachmentPreview
          attachment={preview}
          onClose={() => setPreview(null)}
          onLoad={onLoad}
          returnFocus={previewTrigger}
        />
      )}
    </div>
  );
}
