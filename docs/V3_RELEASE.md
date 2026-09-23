# Vesserith v3.0.0 — implementation ledger

Status: UNRELEASED. Code, local tests, provider setup, and live acceptance are separate gates.

## Immutable starting points

- Existing target repository: wadewolfie999/Vesserith.
- Existing production address: https://wadewolfie999.github.io/Vesserith/.
- Pre-v3 rollback commit: `7f6291b89391780a5ec9a3d4650c945bd13e0bfb`.
- Implementation branch: `v3/github-pages`.
- Observatory reference: Nightpath v1.7.4, commit `509c486238c42dd15828b87b824d78d1d6a24eda`.
- Old Sites deployment, original browser entries, and Mac SQLite database are migration sources only and must remain intact.

## Delivery gates

- [ ] React Observatory shell, /Vesserith/ subpath, hash navigation, English route codes.
- [ ] Supabase migrations and RPC isolation validated in PostgreSQL.
- [ ] GitHub identity-only OAuth and persistent PKCE sessions configured.
- [ ] Private state, recovery drafts, revisions, conflicts, and reviewed imports.
- [ ] Editable personal graph, gates, archive/trash, layout, resets.
- [ ] Browser accessibility, layouts, learning regressions, WebMCP.
- [ ] Two real accounts demonstrate isolation; Chrome and in-app browser demonstrate synchronization.
- [ ] Reviewed migrations applied to dedicated project.
- [ ] Exact verified commit deployed by GitHub Actions; live auth and persistence verified.

## Architecture boundaries

GitHub Pages contains public code and the sign-in screen only. Supabase is the sole authority for account data. Browser recovery entries are scoped by user and curriculum and cannot authorize access. PostgreSQL RLS restricts reads; fixed-search-path RPC functions derive ownership from auth.uid(), validate changes transactionally, and enforce revisions and idempotency. Client table writes are revoked. No service-role key or OAuth secret belongs in a frontend variable.

## Recovery

Do not deploy an unconfigured authentication screen over the existing site. Keep the pre-v3 commit as the frontend rollback reference. Applied database migrations are append-only; take a provider backup before production migration. Browser drafts stay under their original account namespace. A context export is private and must never be committed or uploaded as a Pages asset.

## Pending evidence

Source commit, applied migration IDs, Actions run, timestamp, production verification, and rollback deployment instructions will be recorded only when observed. At initialization no v3 deployment has occurred.

## Provider setup and schema installation

- Dedicated free Supabase project: `kpayfphiaukctbkfoodn` (Vesserith organization, Tokyo region).
- GitHub OAuth application: Vesserith, application `3865533`; identity-only scopes configured in the client. The user transferred the client secret directly into Supabase; it was not read or written into source.
- Supabase GitHub provider confirmed Enabled. Site URL and allow-list: `https://wadewolfie999.github.io/Vesserith/`; exact development redirect: `http://127.0.0.1:4180/Vesserith/`. No wildcard redirect.
- Hosted preflight returned no Vesserith schema, zero public application tables, and zero auth users. This was a fresh installation with no learner data to migrate or back up.
- The three migrations below were applied together in one transaction at **2026-09-17 23:43:26.642375 UTC**. A private, RLS-protected `vesserith.schema_migrations` ledger records these hashes. These files are now immutable; corrections require a new migration.

| Migration | SHA-256 |
| --- | --- |
| `202609180001_private_trails.sql` | `8189d1d17f79e38b0b269ae145a50a8abeaed9cf3f98f7a985f326932aaf7c1e` |
| `202609180002_transactional_mutations.sql` | `1a40541ca9a7a45cad7349b9b7e7b87a677741e3f5f5d9c70308da93f4446a94` |
| `202609180003_reviewed_imports.sql` | `2f8e5b6c0fc14fa369d58ed66bc16108ddd25873a65dd09066fc3058643344ee` |

Local evidence so far: TypeScript check, production build, artifact allow-list check, and 36 automated tests pass. Database tests execute PostgreSQL through PGlite with stubbed auth identities; real browser-account evidence is recorded separately below. No v3 GitHub Pages deployment has occurred.

Hosted post-install permission audit: **11 tables**, `all_rls_enabled=true`, `anon_denied=true`, `direct_writes_denied=true`. The SQL editor's subsequent attempted replacement retained earlier buffer content; the repeated execution warning was cancelled without execution. A fresh query containing only the permission SELECT produced this audit. Do not rerun the initial installation; use a fresh query for later checks.

## 23 September continuation evidence

- Added migration `202609230004_atomic_mastery.sql`, SHA-256 `cfd830ffd04729f0acb0ee7d4ce7a805fc27dc322c254ad24e40c669d17cba98`. Hosted ledger confirms application at **2026-09-23 20:11:11.998313 UTC**. It adds a transactional multi-signal mastery RPC; it does not rewrite existing data or change the first three migrations. Anonymous execution is denied. The original single-field operation remains available.
- **Real account integration:** owner and second GitHub account each received a separate curriculum. New account: 11 template nodes, zero nonempty notes, all 18 signals Not yet. Authenticated RPC probes in both directions rejected another account's stage even with a forged owner ID. Each read remained scoped to its caller. Direct API access to the private table schema was rejected (`PGRST106`). This API evidence complements, not replaces, the automated PostgreSQL RLS and direct-DML tests.
- **Native WebMCP integration:** in-app browser discovered both existing tools. `get_learning_progress` returned authenticated dynamic stage IDs and no notes. A three-signal `set_stage_mastery` call succeeded via the new RPC while preserving the existing values; an unknown stage was rejected. Separate stub tests cover input validation, response structure, conflict retention, atomic updates and retries.
- **Real persistence:** the temporary Unicode/multiline/literal-HTML note saved on 18 September survived session restoration on 23 September. It was subsequently cleared through the editor and the empty value was observed in the other browser. No test note was imported into a new account.
- **Browser fixtures:** real application components with a disposable PGlite-backed account, never a production identity. Both Concept Graph views, all seven steps, Restart, Escape, concept-to-Notes focus, note expansion/collapse preserving selection, literal text, mastery radios, and expanded Deferred guidance exercised. Creating and saving Stage 06 → Gate B → Route E succeeded. Archiving the required stage changed Gate B to “Prerequisite unavailable”; restore retained its saved connections.
- **Measured reflow:** fixed CSS-pixel frames, not a nominal viewport affected by browser zoom. 1440 × 1106, 969 × 1106, and 320 × 1106. Concept graph passed text bounds, control clipping and node/label intersection checks at normal size and 32px root text (200%). A narrow enlarged-label defect was reproduced and fixed using wrapping, not hidden overflow. The 320px Explain toolbar is approximately 340px tall at default text size. Measurements wait for SVG reflow to settle.
- **Reduced motion:** switching the preference while the page is open changes the highlight's computed transition duration to `0s`. Runtime cancellation of existing animations is implemented separately from CSS; full live-animation cancellation proof remains to be completed.
- **Private migration source:** read-only SQLite snapshot of the original saved local store, revision 14, exported outside the repository with mode 0600. Six nonempty notes are present. All 18 source ratings are Independent, newer than the earlier Stage 01 reference checkpoint. Import review is pending; this snapshot explicitly does not claim to capture unsent drafts in old browser origins. The database and original browser copies remain untouched.

### Defects repaired during verification

- Multi-signal tool writes now commit or conflict together rather than partially succeeding.
- Import retries freeze the original reviewed choices and request ID; duplicate clicks share one in-flight operation. Errors remain visible inside the import dialog.
- An immediate store shutdown retains pending durable navigation, including changes inside the debounce interval.
- An expanded note defers remote navigation even when focus moves away from its textarea.
- Earlier/Later ordering now swaps positions deterministically instead of generating tied order values. Displayed stage numbers follow saved order.
- Enlarged graph labels and view controls wrap without losing words; compact lens labels remain intact.

### Still-open release gates

- Finish the remaining editor, concurrency/failure, focus and visual checks; record limitations without upgrading fixture evidence to real-account proof.
- Complete reviewed owner-context import and confirm all six note values against the private source.
- Complete the current same-account Chrome/in-app synchronization check.
- Commit/push the complete source, run GitHub Actions, deploy verified main, then verify actual production OAuth, persistence, assets and account isolation at the existing URL.

The Pages environment permits deployment from `main` only. The workflow also verifies `v3/**` pushes without deploying them, so branch CI cannot replace the live application.

## Final local acceptance, 23 September UTC

- Owner OAuth completed in the Wolfski Chrome profile; the second account remains separate in Wade. Owner note changes and intentional clearing propagated between Chrome and the in-app browser. A focused editor retained its selection (39–40) and deferred a remote lens change until blur. This is real cross-browser evidence; exact network latency was not benchmarked. Visible polling is configured and tested at two seconds.
- Imported the latest saved Nightpath checkpoint and six notes into the owner account only. The six preview values and the six resulting editor values matched the private source exactly. Chrome reload confirmed account persistence. Latest source ratings were all Independent, so Gate A is ready; no ratings were inferred or scored. Older source copies remain untouched. Unsent drafts in old origins are not asserted to be included.
- The disposable editor verified archive/save, deletion from saved Trash, automatic layout, and a confirmed reset back to the neutral six-stage/four-route template. Found and repaired a UI mismatch: permanent deletion now requires a previously saved archive, matching database validation. Automated PostgreSQL tests cover stale topology/reset revisions and both gate thresholds.
- A 320px/200% Self-check overflow was reproduced and repaired by allowing option text to wrap. The enlarged trail editor measured zero horizontal text overflow, clipping, or overlapping labels. Escape restored focus to the Concept Graph entry control. Both graph views retained measured node/edge layouts.
- The developer fixture now disposes its store during hot replacement and preserves server validation errors as such. This avoids stale test subscriptions and misleading offline messages in the test harness; it is not shipped.
- TypeScript, all 36 tests, production build, and the four-file static artifact allow-list passed again after the repairs. Automated failure/expiry/IME cases and PostgreSQL auth stubs remain clearly distinct from real OAuth and browser evidence.

Remaining release actions: commit and branch CI, verified main deployment, production sign-in/persistence/isolation, asset and console checks, then record release identifiers. No v3 production deployment is claimed yet.
