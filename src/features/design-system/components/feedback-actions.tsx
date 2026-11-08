"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function FeedbackActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast.success("Changes saved.")} variant="outline">Success toast</Button>
      <Button onClick={() => toast.info("A background task is still running.")} variant="outline">Info toast</Button>
      <Button
        onClick={() => toast.error("Could not save changes.", { description: "Check your connection and try again." })}
        variant="outline"
      >
        Error toast
      </Button>
    </div>
  );
}
