import type { Workspace } from "./model";
import { mergeWorkspaces, sameWorkspace } from "./workspace-merge";

export type CloudSnapshot = { workspace: Workspace; revision: number };
export type CloudBackend = {
  read: () => Promise<CloudSnapshot>;
  save: (workspace: Workspace, revision: number) => Promise<number>;
};

// All reads and writes are serialized. User edits remain immediate, including during a save.
export class CloudWorkspace {
  private base: Workspace;
  private revision: number;
  private queue: Promise<void> = Promise.resolve();
  private active = true;
  private blocked = false;
  local: Workspace;

  constructor(
    snapshot: CloudSnapshot,
    private backend: CloudBackend,
    private changed: (workspace: Workspace, pending: boolean) => void,
    private failed: (message: string) => void,
  ) {
    this.base = this.local = snapshot.workspace;
    this.revision = snapshot.revision;
  }

  get pending() {
    return !sameWorkspace(this.local, this.base);
  }
  get canSwitch() {
    return this.active && !this.blocked && !this.pending;
  }
  dispose() {
    this.active = false;
  }
  edit(workspace: Workspace) {
    if (!this.active || this.blocked) return;
    this.local = workspace;
    this.changed(this.local, this.pending);
  }
  private enqueue(task: () => Promise<void>) {
    this.queue = this.queue.then(async () => {
      if (!this.active || this.blocked) return;
      try {
        await task();
      } catch (error) {
        if (!this.active) return;
        this.blocked = true;
        this.failed(
          error instanceof Error
            ? error.message
            : "Cloud connection failed. Export your unsaved work before reloading.",
        );
      }
    });
    return this.queue;
  }
  private async pull() {
    const remote = await this.backend.read();
    if (!this.active || remote.revision <= this.revision) return;
    const merged = this.pending
      ? mergeWorkspaces(this.base, this.local, remote.workspace)
      : remote.workspace;
    this.base = remote.workspace;
    this.local = merged;
    this.revision = remote.revision;
    this.changed(this.local, this.pending);
  }
  refresh() {
    return this.enqueue(async () => {
      try {
        await this.pull();
      } catch (error) {
        // A missed background refresh can be retried after reconnecting. Keep access,
        // format, and merge errors visible; never retry a failed write blindly.
        if (!(error && typeof error === "object" && "retryable" in error && error.retryable))
          throw error;
      }
    });
  }
  save(initialize = false) {
    return this.enqueue(async () => {
      for (
        let attempt = 0;
        attempt < 4 && this.active && (this.pending || (initialize && this.revision === 0));
        attempt++
      ) {
        const snapshot = this.local;
        try {
          const revision = await this.backend.save(snapshot, this.revision);
          if (!this.active) return;
          this.base = snapshot;
          this.revision = revision;
          this.changed(this.local, this.pending);
          return;
        } catch (error) {
          if (!this.active) return;
          if (!(error && typeof error === "object" && "code" in error && error.code === "40001"))
            throw error;
          await this.pull();
        }
      }
      if (this.active && this.pending)
        throw new Error(
          "The workspace is busy. Export your unsaved work, then reload and try again.",
        );
    });
  }
}
