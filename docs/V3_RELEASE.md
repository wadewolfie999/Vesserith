# Vesserith v3.0.0 — implementation ledger

Status: RELEASED. The deployed application completed real GitHub sign-in,
account persistence, and two-account acceptance at the existing production URL.
Local/stub evidence and live evidence are distinguished below.

## Immutable starting points

- Existing target repository: wadewolfie999/Vesserith.
- Existing production address: https://wadewolfie999.github.io/Vesserith/.
- Pre-v3 rollback commit: `7f6291b89391780a5ec9a3d4650c945bd13e0bfb`.
- Implementation branch: `v3/github-pages`.
- Observatory reference: Nightpath v1.7.4, commit `509c486238c42dd15828b87b824d78d1d6a24eda`.
- Old Sites deployment, original browser entries, and Mac SQLite database are migration sources only and must remain intact.

## Delivery gates

- [x] React Observatory shell, /Vesserith/ subpath, hash navigation, English route codes.
- [x] Supabase migrations and RPC isolation validated in PostgreSQL.
- [x] GitHub identity-only OAuth and persistent PKCE sessions configured.
- [x] Private state, recovery drafts, revisions, conflicts, and reviewed imports.
- [x] Editable personal graph, gates, archive/trash, layout, resets.
- [x] Browser accessibility, layouts, learning regressions, WebMCP.
- [x] Two real accounts demonstrate isolation; Chrome and in-app browser demonstrate synchronization.
- [x] Reviewed migrations applied to dedicated project.
- [x] Exact verified commit deployed by GitHub Actions; live auth and persistence verified.

## Architecture boundaries

GitHub Pages contains public code and the sign-in screen only. Supabase is the sole authority for account data. Browser recovery entries are scoped by user and curriculum and cannot authorize access. PostgreSQL RLS restricts reads; fixed-search-path RPC functions derive ownership from auth.uid(), validate changes transactionally, and enforce revisions and idempotency. Client table writes are revoked. No service-role key or OAuth secret belongs in a frontend variable.

## Recovery

Do not deploy an unconfigured authentication screen over the existing site. Keep the pre-v3 commit as the frontend rollback reference. Applied database migrations are append-only; take a provider backup before production migration. Browser drafts stay under their original account namespace. A context export is private and must never be committed or uploaded as a Pages asset.

## Evidence chronology

The sections below retain the order of provider setup, local acceptance, and
production verification. No deployment was claimed during the earlier stages.
Observed release identifiers and recovery procedures are recorded at the end.

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

Local evidence: TypeScript check, production build, artifact allow-list check, and 36 automated tests pass. Database tests execute PostgreSQL through PGlite with stubbed auth identities; real browser-account evidence is recorded separately below. Deployment had not occurred at this stage.

Hosted post-install permission audit: **11 tables**, `all_rls_enabled=true`, `anon_denied=true`, `direct_writes_denied=true`. The SQL editor's subsequent attempted replacement retained earlier buffer content; the repeated execution warning was cancelled without execution. A fresh query containing only the permission SELECT produced this audit. Do not rerun the initial installation; use a fresh query for later checks.

## 23 September continuation evidence

- Added migration `202609230004_atomic_mastery.sql`, SHA-256 `cfd830ffd04729f0acb0ee7d4ce7a805fc27dc322c254ad24e40c669d17cba98`. Hosted ledger confirms application at **2026-09-23 20:11:11.998313 UTC**. It adds a transactional multi-signal mastery RPC; it does not rewrite existing data or change the first three migrations. Anonymous execution is denied. The original single-field operation remains available.
- **Real account integration:** owner and second GitHub account each received a separate curriculum. New account: 11 template nodes, zero nonempty notes, all 18 signals Not yet. Authenticated RPC probes in both directions rejected another account's stage even with a forged owner ID. Each read remained scoped to its caller. Direct API access to the private table schema was rejected (`PGRST106`). This API evidence complements, not replaces, the automated PostgreSQL RLS and direct-DML tests.
- **Native WebMCP integration:** in-app browser discovered both existing tools. `get_learning_progress` returned authenticated dynamic stage IDs and no notes. A three-signal `set_stage_mastery` call succeeded via the new RPC while preserving the existing values; an unknown stage was rejected. Separate stub tests cover input validation, response structure, conflict retention, atomic updates and retries.
- **Real persistence:** the temporary Unicode/multiline/literal-HTML note saved on 18 September survived session restoration on 23 September. It was subsequently cleared through the editor and the empty value was observed in the other browser. No test note was imported into a new account.
- **Browser fixtures:** real application components with a disposable PGlite-backed account, never a production identity. Both Concept Graph views, all seven steps, Restart, Escape, concept-to-Notes focus, note expansion/collapse preserving selection, literal text, mastery radios, and expanded Deferred guidance exercised. Creating and saving Stage 06 → Gate B → Route E succeeded. Archiving the required stage changed Gate B to “Prerequisite unavailable”; restore retained its saved connections.
- **Measured reflow:** fixed CSS-pixel frames, not a nominal viewport affected by browser zoom. 1440 × 1106, 969 × 1106, and 320 × 1106. Concept graph passed text bounds, control clipping and node/label intersection checks at normal size and 32px root text (200%). A narrow enlarged-label defect was reproduced and fixed using wrapping, not hidden overflow. The 320px Explain toolbar is approximately 340px tall at default text size. Measurements wait for SVG reflow to settle.
- **Reduced motion:** switching the preference while the page is open changes the highlight's computed transition duration to `0s`. The subsequent runtime check below verifies cancellation independently of CSS.
- **Private migration source:** read-only SQLite snapshot of the original saved local store, revision 14, exported outside the repository with mode 0600. Six nonempty notes are present. All 18 source ratings are Independent, newer than the earlier Stage 01 reference checkpoint. Import review was pending here and completed below; this snapshot explicitly does not claim to capture unsent drafts in old browser origins. The database and original browser copies remain untouched.

### Defects repaired during verification

- Multi-signal tool writes now commit or conflict together rather than partially succeeding.
- Import retries freeze the original reviewed choices and request ID; duplicate clicks share one in-flight operation. Errors remain visible inside the import dialog.
- An immediate store shutdown retains pending durable navigation, including changes inside the debounce interval.
- An expanded note defers remote navigation even when focus moves away from its textarea.
- Earlier/Later ordering now swaps positions deterministically instead of generating tied order values. Displayed stage numbers follow saved order.
- Enlarged graph labels and view controls wrap without losing words; compact lens labels remain intact.

### Gates carried forward from the initial verification

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

Those release actions were then completed as recorded below.

## Confirmed production release

| Evidence | Observed value |
| --- | --- |
| Application source commit | `ff51f691b4c157edc32325e3d012d2df3df3b279` |
| Branch verification | [35923230995](https://github.com/wadewolfie999/Vesserith/actions/runs/35923230995), success; deployment skipped |
| Main verification and publication | [35923545001](https://github.com/wadewolfie999/Vesserith/actions/runs/35923545001), both jobs successful |
| GitHub Pages deployment | `6624999152` |
| Successful deployment status | **2026-09-23 21:37:42 UTC** |
| Confirmed URL | https://wadewolfie999.github.io/Vesserith/ |
| Backend migrations | `202609180001`, `202609180002`, `202609180003`, `202609230004`; hashes above |

The user paused execution after publication had been initiated. Deployment
completed independently. On explicit resume, the successful terminal status was
read from GitHub before production acceptance continued. No duplicate website or
replacement repository was created. Sites and the legacy local database were
not modified by this release.

### Live acceptance after deployment

- Signed-out production entry contains the public sign-in screen, not the learning workspace. Owner OAuth returned successfully to `/Vesserith/`; the account menu confirmed the owner identity, Gate A readiness, and account save status.
- All six production note values exactly matched the private migration source. Logout hid the workspace. Relogin and reload restored account data and durable selection. Hash-based waypoint URLs loaded without a server routing error.
- The second real GitHub identity signed into production in Chrome with its own neutral curriculum and six empty notes. Its temporary Unicode/multiline/HTML-like note survived reload; intentional clearing then survived another reload. The owner notes remained separate. Earlier authenticated foreign-read/write probes against this same hosted backend passed in both directions; the development audit page was never published.
- Both production Concept Graph views advanced through all seven steps. The Notes transition focused the existing Stage 01 editor without changing its text. All four lenses and Routes A–D worked; Route D content and the five Deferred categories rendered.
- Fresh production reload produced no `Runtime.exceptionThrown` or browser `Log.entryAdded` errors. Both native WebMCP tools were advertised at the production origin. Native valid/invalid tool executions were verified earlier against the same hosted account service; additional unit tests use an explicitly isolated stub.
- All four public files returned HTTP 200 and matched the local verified build byte-for-byte. The artifact contains only the static sign-in/application assets; private notes, databases, migration snapshots, and development fixtures are absent.
- A development-only motion probe loaded the actual app bootstrap. Before changing the preference it observed a running Web Animation; switching to reduced motion yielded `animation: idle` and `running: 0`. The emulated preference was restored and the probe tab closed. The probe is excluded from `dist`.

Artifact SHA-256 values (documentation/test-only follow-ups leave these unchanged):

| File | SHA-256 |
| --- | --- |
| `index.html` | `cfbeed5d30482f6c845de21a669820fa181a3e8f0070c1ee81748dd47f641b48` |
| `vesserith.svg` | `ff17bef3693ac503fad7096f031e3d1fed03b3cbacdbce79aaaad1e74f8bc39c` |
| `assets/index-B5QNzd7l.js` | `0a9b4d9c65c1332970bbde923d7454a9a8c08b4bb2186fdceca77b981f509905` |
| `assets/index-GysagPn6.css` | `c718de5a31fadd420a33aa2777b2b4690cfbf9026976cacdde195e717ac3d94d` |

### Evidence limits

- Cross-browser updates were observed, and visible polling runs every two seconds; an exact end-to-end network-latency guarantee was not benchmarked.
- Expiry, storage failure, lost acknowledgments, conflicting edits, composition handling, and concurrent topology changes are covered by isolated automated tests. Do not describe every simulated fault as a production outage experiment.
- The migration includes saved SQLite state, not unidentified unsent drafts in old browser origins. Original copies remain available for any later reviewed import.
- This is functional and account-isolation verification, not an independent penetration test or sustained 20-user load test.

## Operational handoff and rollback

Use the Pages URL and sign into the same GitHub account in each browser. V3's
localhost preview and Pages app share that Supabase account; the old Nightpath
localhost service and old Sites origin do not. Account exports are private.

For an ordinary frontend regression, use a clean checkout of this verified
application commit and the existing main-only Pages workflow, then repeat the
asset and sign-in smoke checks. Prefer a reviewed forward-fix or ordinary revert
commit; do not force-reset shared history.

If returning to the pre-v3 product is explicitly chosen, preserve current account
exports first. The pre-v3 repository reference is
`7f6291b89391780a5ec9a3d4650c945bd13e0bfb`; the last observed successful older
Pages deployment used `3231d3c64e3bc9993b638c59e2b224b9723875b5`, run
`33561213686`, deployment `6210693765`. Build the selected historical static
frontend in an isolated checkout and validate it before publishing through the
existing Pages environment. Historical build dependencies may need review.

A frontend rollback must not drop Supabase tables, reverse applied migrations,
delete user data, or restore the old local database over account storage. Future
SQL changes are append-only and require their own backup and validation plan.
