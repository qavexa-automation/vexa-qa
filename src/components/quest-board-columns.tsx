import { useState, type ReactElement, type ReactNode } from "react";
import { BookOpen, Bug, CheckCheck, MoreHorizontal, Plus, Zap } from "lucide-react";

import { InlineStatusSelect } from "@/components/forms/inline-status-select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { initials } from "@/components/workspace-tables/cells";
import { STATUSES, type Issue, type Status } from "@/lib/model";
import { priorityTone, statusTone } from "@/lib/status-tones";

export type QuestBoardIssue = Issue & { boardKey?: string; workspace?: string };
export const questBoardKey = (issue: QuestBoardIssue) => issue.boardKey ?? issue.id;
export type QuestTrigger = (issue: QuestBoardIssue, trigger: ReactElement) => ReactNode;

const icons = { Bug, Task: CheckCheck, Story: BookOpen };

export function QuestBoardColumns({
  issues,
  onOpen,
  renderTrigger,
  renderStatus,
  onAdd,
  onMove,
  canAdd = true,
}: {
  issues: QuestBoardIssue[];
  onOpen?: (issue: QuestBoardIssue) => void;
  renderTrigger?: QuestTrigger;
  renderStatus?: (issue: QuestBoardIssue) => ReactNode;
  onAdd: (status: Status) => void;
  onMove: (key: string, status: Status) => void;
  canAdd?: boolean;
}) {
  const [dropColumn, setDropColumn] = useState<Status | null>(null);

  return (
    <div className="kanban" aria-label="Quest board">
      {STATUSES.map((status) => (
        <section
          key={status}
          aria-labelledby={`quest-column-${status.replaceAll(" ", "-")}`}
          className={`kanban-column ${dropColumn === status ? "drag-over" : ""}`}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("text/plain")) return;
            event.preventDefault();
            setDropColumn(status);
          }}
          onDragLeave={() => setDropColumn(null)}
          onDrop={(event) => {
            event.preventDefault();
            const key = event.dataTransfer.getData("text/plain");
            if (issues.some((issue) => questBoardKey(issue) === key && issue.status !== status))
              onMove(key, status);
            setDropColumn(null);
          }}
        >
          <div className="column-heading">
            <h2 id={`quest-column-${status.replaceAll(" ", "-")}`}>
              <StatusBadge label={status} tone={statusTone(status)} />
            </h2>
            <Button
              aria-label={`Add quest to ${status}`}
              disabled={!canAdd}
              variant="ghost"
              size="icon"
              onClick={() => onAdd(status)}
            >
              <Plus aria-hidden="true" size={15} />
            </Button>
          </div>
          <div className="column-cards">
            {issues
              .filter((issue) => issue.status === status)
              .map((issue) => {
                const Icon = icons[issue.type];
                const key = questBoardKey(issue);
                const card = (
                  <button
                    data-slot="quest-card-trigger"
                    type="button"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", key)}
                    onDragEnd={() => setDropColumn(null)}
                    className="w-full cursor-grab rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
                    onClick={onOpen ? () => onOpen(issue) : undefined}
                  >
                    <div className="quest-card-top">
                      <span className={`type-icon ${issue.type.toLowerCase()}`}>
                        <Icon size={13} aria-label={issue.type} />
                      </span>
                      <span>{issue.id}</span>
                      <MoreHorizontal aria-hidden="true" size={16} />
                    </div>
                    <h3>{issue.title}</h3>
                    <div className="tags">
                      {[...new Set(issue.labels)].map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                    {issue.workspace && (
                      <p
                        className="mb-2 truncate text-xs text-muted-foreground"
                        title={issue.workspace}
                      >
                        {issue.workspace}
                      </p>
                    )}
                    <div className="quest-card-bottom">
                      <StatusBadge
                        label={issue.priority}
                        tone={priorityTone(issue.priority)}
                        size="sm"
                      />
                      <span className="xp">
                        <Zap aria-hidden="true" size={11} />
                        {issue.xp}
                      </span>
                      <Avatar size="sm" title={issue.assignee || "Unassigned"}>
                        <AvatarFallback>{initials(issue.assignee)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </button>
                );
                return (
                  <div key={key} className="quest-card">
                    {renderTrigger ? renderTrigger(issue, card) : card}
                    <div className="mt-2">
                      {renderStatus ? renderStatus(issue) : (
                        <InlineStatusSelect
                          label={`Status for ${issue.id} · ${issue.title}`}
                          onChange={(next) => onMove(key, next)}
                          options={STATUSES}
                          tone={statusTone}
                          value={issue.status}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            <button
              className="add-card"
              type="button"
              disabled={!canAdd}
              onClick={() => onAdd(status)}
            >
              <Plus aria-hidden="true" size={14} /> Add quest
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
