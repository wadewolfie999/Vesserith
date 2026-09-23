import { describe, expect, it } from 'vitest';
import { ImportSubmission } from '../frontend/import-submission';
import type { MutationResult } from '../frontend/domain';

describe('Reviewed import submission', () => {
  it('deduplicates concurrent clicks and freezes choices across a lost response', async () => {
    const calls: unknown[] = [];
    let reject!: (error: Error) => void;
    const submission = new ImportSubmission({ commitImport: async (...args) => {
      calls.push(structuredClone(args));
      if (calls.length === 1) return new Promise<MutationResult>((_, no) => { reject = no; });
      return { ok: true, revisions: { curriculum: 1, learning: 2, ui: 1 } };
    } }, 'preview-1');
    const choices = { 'note:stage-1': true };
    const first = submission.commit(choices);
    choices['note:stage-1'] = false;
    expect(submission.commit(choices)).toBe(first);
    reject(new Error('Network response lost'));
    await expect(first).rejects.toThrow('Network response lost');
    expect((await submission.commit(choices)).ok).toBe(true);
    expect(calls[0]).toEqual(calls[1]);
    expect(calls).toHaveLength(2);
    expect(submission.submitted).toBe(true);
  });
});
