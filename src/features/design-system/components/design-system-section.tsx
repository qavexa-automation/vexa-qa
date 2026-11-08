import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DesignSystemSection({
  title,
  description,
  rule,
  children,
  className,
}: {
  title: string;
  description: string;
  rule?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="max-w-3xl space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className={cn("@container rounded-xl border border-border glass p-4 shadow-xs", className)}>
        {children}
      </div>
      {rule ? (
        <p className="text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">Rule:</span> {rule}
        </p>
      ) : null}
    </section>
  );
}
