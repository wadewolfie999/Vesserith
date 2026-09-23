import type { AccountService } from './service';
import type { MutationResult } from './domain';

// Freeze the reviewed choices at the first submission. A lost acknowledgment
// must retry the identical operation, even if the caller changes its own object.
export class ImportSubmission {
  readonly requestId = crypto.randomUUID();
  private choices: Record<string, boolean> | null = null;
  private pending: Promise<MutationResult> | null = null;
  constructor(private service: Pick<AccountService, 'commitImport'>, private previewId: string) {}
  get submitted() { return this.choices !== null; }
  commit(choices: Record<string, boolean>): Promise<MutationResult> {
    this.choices ??= { ...choices };
    if (!this.pending) {
      this.pending = this.service.commitImport(this.previewId, this.choices, this.requestId)
        .finally(() => { this.pending = null; });
    }
    return this.pending;
  }
}
