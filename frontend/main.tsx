import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Entry = {
  id: string;
  title: string;
  area: string;
  state: string;
  origin: string;
  scope: string;
  next_action: string;
  stopping_point: string;
  waiting_for: string;
  review_date: string;
  uncertainty: string;
  references: string;
};
type Orientation = {
  objective: string;
  priority: string;
  constraints: string;
  focus: string;
  items: Entry[];
};
type Saved = { document: Orientation; revision: number; updated_at: string };
type Meta = {
  version: string;
  commit: string;
  status: string;
  schema: number;
  options: Record<string, string[]>;
  scope_help: Record<string, string>;
};
type History = {
  revision: number;
  recorded_at: string;
  reason: string;
  document: Orientation;
};
type View = 'now' | 'thesis' | 'mynyra' | 'history' | 'changes';

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error ||
        `Request failed (${response.status}). Your input is retained.`,
    );
  }
  return response.json();
}

function App() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [draft, setDraft] = useState<Orientation | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [view, setView] = useState<View>('now');
  const [editing, setEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [history, setHistory] = useState<History[] | null>(null);
  const [changes, setChanges] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  const dirty =
    !!saved && JSON.stringify(draft) !== JSON.stringify(saved.document);
  const pending = dirty || !!reason.trim();

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<Saved>('/api/orientation'), api<Meta>('/api/meta')])
      .then(([state, application]) => {
        if (cancelled) return;
        setSaved(state);
        setDraft(state.document);
        setMeta(application);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(String(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function leave(event: BeforeUnloadEvent) {
      if (pending) event.preventDefault();
    }
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [pending]);

  function navigate(next: View) {
    setView(next);
    setSelectedEntry(null);
    setEditing(false);
    requestAnimationFrame(() =>
      document.getElementById('workspace')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      }),
    );
  }

  async function openHistory() {
    try {
      setHistory(await api<History[]>('/api/history'));
      setChanges(null);
      navigate('history');
    } catch (caught) {
      setError(String(caught));
    }
  }

  async function openChanges() {
    try {
      const response = await fetch('/api/changes');
      if (!response.ok) throw new Error('Could not load changes.');
      setChanges(await response.text());
      setHistory(null);
      navigate('changes');
    } catch (caught) {
      setError(String(caught));
    }
  }

  async function save() {
    if (!saved || !draft) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<Saved>('/api/orientation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: draft,
          revision: saved.revision,
          reason,
        }),
      });
      setSaved(result);
      setDraft(result.document);
      setReason('');
      setNotice('Saved on this machine.');
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!draft || !saved || !meta) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">V</span>
        <h1>Vesserith</h1>
        <output>{error || 'Opening your orientation…'}</output>
        {error && (
          <button onClick={() => window.location.reload()}>Retry</button>
        )}
      </main>
    );
  }

  function field(key: keyof Omit<Orientation, 'items'>, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setNotice('');
  }

  function update(id: string, key: keyof Entry, value: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === id ? { ...item, [key]: value } : item,
            ),
          }
        : current,
    );
    setNotice('');
  }

  function add() {
    const id = crypto.randomUUID();
    setDraft((current) =>
      current
        ? {
            ...current,
            items: [
              ...current.items,
              {
                id,
                title: 'New parked idea',
                area: 'Other',
                state: 'Set aside',
                origin: 'Self-proposed',
                scope: 'Undecided',
                next_action: '',
                stopping_point: '',
                waiting_for: '',
                review_date: '',
                uncertainty: '',
                references: '',
              },
            ],
          }
        : current,
    );
    setSelectedEntry(id);
    setEditing(true);
    setNotice('Idea added as parked work. It is not active.');
  }

  const waiting = draft.items.filter((item) => item.state === 'Waiting');
  const parked = draft.items.filter((item) => item.state === 'Set aside');
  const thesisEntries = draft.items.filter((item) => item.area === 'Thesis');
  const incomeEntries = draft.items.filter((item) => item.area === 'Income');
  const selected = draft.items.find((item) => item.id === selectedEntry);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => navigate('now')}>
          <span className="brand-mark">V</span>
          <span>
            <strong>Vesserith</strong>
            <small>
              {meta.version} · {meta.status} · {meta.commit}
            </small>
          </span>
        </button>
        <nav aria-label="Application navigation" className="topnav">
          <button
            className={view === 'now' ? 'nav-active' : ''}
            onClick={() => navigate('now')}
          >
            Your NOW
          </button>
          <button
            className={view === 'history' ? 'nav-active' : ''}
            onClick={() => void openHistory()}
          >
            History
          </button>
          <button
            className={view === 'changes' ? 'nav-active' : ''}
            onClick={() => void openChanges()}
          >
            What changed
          </button>
          <button
            className="export-button"
            disabled={pending || busy}
            title={
              pending ? 'Save first to export this orientation' : undefined
            }
            onClick={() => {
              window.location.href = '/api/export';
            }}
          >
            Export
          </button>
        </nav>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <strong>Could not save that change.</strong> {error}
          <span>Your edits remain on this page.</span>
        </div>
      )}

      <section id="workspace" className="workspace">
        {view === 'now' && (
          <NowView
            draft={draft}
            thesisCount={thesisEntries.length}
            incomeCount={incomeEntries.length}
            onOpenMap={navigate}
            onEdit={() => setEditing(true)}
          />
        )}
        {(view === 'thesis' || view === 'mynyra') && (
          <WorldMapView
            area={view}
            draft={draft}
            entries={view === 'thesis' ? thesisEntries : incomeEntries}
            selected={selected}
            onBack={() => navigate('now')}
            onSelect={setSelectedEntry}
            onEdit={() => setEditing(true)}
          />
        )}
        {view === 'history' && (
          <RecordView
            title="History"
            kicker="SAVED ORIENTATIONS"
            onBack={() => navigate('now')}
          >
            <p className="record-intro">
              Each checkpoint is a full orientation, kept so you can see what
              you believed and chose at the time.
            </p>
            {history?.map((entry) => (
              <details className="history-card" key={entry.revision}>
                <summary>
                  <span className="history-revision">
                    REVISION {entry.revision}
                  </span>
                  <strong>{entry.reason || 'No reason supplied'}</strong>
                  <time>{new Date(entry.recorded_at).toLocaleString()}</time>
                </summary>
                <div className="history-snapshot">
                  <span>Main objective</span>
                  <p>{entry.document.objective || 'Not yet decided'}</p>
                  <span>Current focus</span>
                  <p>{entry.document.focus || 'Not yet decided'}</p>
                </div>
              </details>
            ))}
          </RecordView>
        )}
        {view === 'changes' && (
          <RecordView
            title="What changed"
            kicker="RELEASE NOTES"
            onBack={() => navigate('now')}
          >
            <p className="record-intro">
              The app changes through explicit, recoverable iterations. Personal
              entries remain separate from release history.
            </p>
            <pre className="changes-copy">{changes}</pre>
          </RecordView>
        )}
      </section>

      {editing && view !== 'history' && view !== 'changes' && (
        <EditorPanel
          draft={draft}
          meta={meta}
          selected={selected}
          busy={busy}
          reason={reason}
          onClose={() => setEditing(false)}
          onField={field}
          onUpdate={update}
          onReason={setReason}
          onSave={() => void save()}
        />
      )}

      {view !== 'history' && view !== 'changes' && (
        <section className="quick-rail" aria-label="Saved state">
          <div>
            <span className="rail-label">SIGNAL</span>
            <strong>
              {pending
                ? 'Unsaved changes'
                : notice || `Saved · revision ${saved.revision}`}
            </strong>
          </div>
          <div>
            <span className="rail-label">WAITING</span>
            <strong>
              {waiting.length ? waiting[0].title : 'Nothing pending'}
            </strong>
          </div>
          <div>
            <span className="rail-label">PARKED</span>
            <strong>
              {parked.length} idea{parked.length === 1 ? '' : 's'}
            </strong>
          </div>
          <button onClick={add}>
            Park an idea <span aria-hidden="true">＋</span>
          </button>
        </section>
      )}
    </main>
  );
}

function NowView({
  draft,
  thesisCount,
  incomeCount,
  onOpenMap,
  onEdit,
}: {
  draft: Orientation;
  thesisCount: number;
  incomeCount: number;
  onOpenMap: (view: View) => void;
  onEdit: () => void;
}) {
  return (
    <>
      <section className="now-hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR NOW</span>
          <h1>
            Two worlds.
            <br />
            <em>One orientation.</em>
          </h1>
          <p>
            Choose the world that needs your attention. Keep the other visible
            without letting it pull you into a loop.
          </p>
        </div>
        <div className="objective-slab">
          <div className="slab-topline">
            <span>MAIN OBJECTIVE</span>
            <button onClick={onEdit}>
              Edit orientation <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p>
            {draft.objective || 'Write the objective that should stay visible.'}
          </p>
          <div className="slab-foot">
            <span>DEFAULT PRIORITY</span>
            <strong>{draft.priority || 'Not yet decided'}</strong>
          </div>
        </div>
      </section>
      <section className="map-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ORIENTATION MAPS</span>
            <h2>Where do you need to look?</h2>
          </div>
          <span className="section-note">Click a map to enter it.</span>
        </div>
        <div className="map-grid">
          <button
            className="map-card thesis-map"
            onClick={() => onOpenMap('thesis')}
          >
            <div className="map-card-header">
              <span className="map-index">01</span>
              <span className="map-arrow" aria-hidden="true">
                ↗
              </span>
            </div>
            <div className="map-glyph thesis-glyph">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="map-type">THESIS WORLD</span>
            <h3>Thesis Worldmap</h3>
            <p>
              Research, delegated work, evidence recovery, and the open academic
              horizon.
            </p>
            <div className="map-card-footer">
              <span>
                {thesisCount} plotted signal{thesisCount === 1 ? '' : 's'}
              </span>
              <span>Enter map</span>
            </div>
          </button>
          <button
            className="map-card income-map"
            onClick={() => onOpenMap('mynyra')}
          >
            <div className="map-card-header">
              <span className="map-index">02</span>
              <span className="map-arrow" aria-hidden="true">
                ↗
              </span>
            </div>
            <div className="map-glyph income-glyph">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="map-type">INCOME WORLD</span>
            <h3>Mynyra Worldmap</h3>
            <p>
              A single potential income path, its evidence, and the decision
              that remains open.
            </p>
            <div className="map-card-footer">
              <span>
                {incomeCount} plotted signal{incomeCount === 1 ? '' : 's'}
              </span>
              <span>Enter map</span>
            </div>
          </button>
        </div>
      </section>
      <section className="orientation-strip">
        <div>
          <span className="strip-label">CURRENT FOCUS</span>
          <strong>{draft.focus || 'Not yet decided'}</strong>
        </div>
        <div>
          <span className="strip-label">OPEN LIMIT</span>
          <strong>
            {draft.constraints
              ? draft.constraints.split('.')[0]
              : 'No constraint recorded'}
          </strong>
        </div>
        <div>
          <span className="strip-label">NEXT ACTION</span>
          <strong>Choose a worldmap to inspect it.</strong>
        </div>
      </section>
    </>
  );
}

function WorldMapView({
  area,
  draft,
  entries,
  selected,
  onBack,
  onSelect,
  onEdit,
}: {
  area: 'thesis' | 'mynyra';
  draft: Orientation;
  entries: Entry[];
  selected?: Entry;
  onBack: () => void;
  onSelect: (id: string) => void;
  onEdit: () => void;
}) {
  const thesis = area === 'thesis';
  const title = thesis ? 'Thesis Worldmap' : 'Mynyra Worldmap';
  const description = thesis
    ? 'The academic track: objective, delegated work, and evidence that still needs to be recovered.'
    : 'The income track: one possible route, completed comparison evidence, and an undecided continuation.';
  const objective = thesis
    ? draft.objective
    : 'Explore whether XAUUSD M1 trading can become a reproducible, feasible source of income.';
  const centerLabel = thesis ? 'THESIS OBJECTIVE' : 'POTENTIAL INCOME PATH';
  return (
    <section
      className={`worldmap-view ${thesis ? 'thesis-world' : 'income-world'}`}
    >
      <div className="map-toolbar">
        <button className="back-button" onClick={onBack}>
          ← Your NOW
        </button>
        <span className="map-status">
          LIVE ORIENTATION · {thesis ? '01' : '02'}
        </span>
      </div>
      <div className="world-title">
        <div>
          <span className="eyebrow">
            {thesis ? 'THESIS WORLD' : 'INCOME WORLD'}
          </span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button className="soft-button" onClick={onEdit}>
          Edit map context <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="map-layout">
        <div className="map-canvas">
          <div className="map-canvas-grid" aria-hidden="true" />
          <div className="map-route route-one" aria-hidden="true" />
          <div className="map-route route-two" aria-hidden="true" />
          <div className="map-node map-center-node">
            <span className="node-label">{centerLabel}</span>
            <strong>{objective}</strong>
            <button onClick={onEdit}>Open context ↗</button>
          </div>
          {entries.map((entry, index) => (
            <button
              className={`map-node signal-node signal-${index + 1} ${selected?.id === entry.id ? 'node-selected' : ''}`}
              key={entry.id}
              onClick={() => onSelect(entry.id)}
            >
              <span className="node-dot" aria-hidden="true" />
              <span className="node-label">
                {entry.state === 'Considering'
                  ? 'CONSIDERING · NOT COMMITTED'
                  : entry.state.toUpperCase()}
              </span>
              <strong>{entry.title}</strong>
              <small>
                {entry.next_action ||
                  entry.uncertainty ||
                  'Open the signal to inspect it.'}
              </small>
            </button>
          ))}
          {!entries.length && (
            <div className="empty-map">
              No signals plotted here yet.
              <br />
              <button onClick={onEdit}>Add context</button>
            </div>
          )}
        </div>
        <aside className="map-inspector">
          {selected ? (
            <EntryInspector entry={selected} onEdit={onEdit} />
          ) : (
            <>
              <span className="eyebrow">MAP READING</span>
              <h2>Select a signal</h2>
              <p>
                Each node is a saved situation, possibility, or piece of work.
                Open one to see its uncertainty and stopping point.
              </p>
              <div className="inspector-rule" />
              <span className="inspector-label">CURRENT FOCUS</span>
              <strong>{draft.focus || 'Not yet decided'}</strong>
              <span className="inspector-label">CONSTRAINT</span>
              <strong>{draft.constraints || 'Not yet decided'}</strong>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function EntryInspector({
  entry,
  onEdit,
}: {
  entry: Entry;
  onEdit: () => void;
}) {
  return (
    <>
      <span className="eyebrow">SELECTED SIGNAL</span>
      <h2>{entry.title}</h2>
      <span className="status-chip">
        {entry.state === 'Considering'
          ? 'Considering · not committed'
          : entry.state}
      </span>
      <div className="inspector-block">
        <span className="inspector-label">POSSIBLE NEXT ACTION</span>
        <p>{entry.next_action || 'No action recorded.'}</p>
      </div>
      <div className="inspector-block">
        <span className="inspector-label">UNCERTAINTY</span>
        <p>{entry.uncertainty || 'No uncertainty recorded.'}</p>
      </div>
      <div className="inspector-block">
        <span className="inspector-label">STOPPING POINT</span>
        <p>{entry.stopping_point || 'Not defined.'}</p>
      </div>
      <button className="soft-button full-button" onClick={onEdit}>
        Edit this signal ↗
      </button>
    </>
  );
}

function EditorPanel({
  draft,
  meta,
  selected,
  busy,
  reason,
  onClose,
  onField,
  onUpdate,
  onReason,
  onSave,
}: {
  draft: Orientation;
  meta: Meta;
  selected?: Entry;
  busy: boolean;
  reason: string;
  onClose: () => void;
  onField: (key: keyof Omit<Orientation, 'items'>, value: string) => void;
  onUpdate: (id: string, key: keyof Entry, value: string) => void;
  onReason: (value: string) => void;
  onSave: () => void;
}) {
  const item = selected;
  return (
    <section className="editor-panel" aria-label="Edit orientation">
      <div className="editor-heading">
        <div>
          <span className="eyebrow">EDITING CONTEXT</span>
          <h2>{item ? item.title : 'Orientation context'}</h2>
        </div>
        <button className="close-button" onClick={onClose}>
          Close <span aria-hidden="true">×</span>
        </button>
      </div>
      {!item ? (
        <div className="context-editor">
          <label>
            Main objective
            <textarea
              rows={3}
              value={draft.objective}
              onChange={(event) => onField('objective', event.target.value)}
            />
          </label>
          <label>
            Default priority
            <input
              value={draft.priority}
              onChange={(event) => onField('priority', event.target.value)}
            />
          </label>
          <label>
            Current focus
            <textarea
              rows={2}
              value={draft.focus}
              onChange={(event) => onField('focus', event.target.value)}
            />
          </label>
          <label>
            Constraints and open limits
            <textarea
              rows={3}
              value={draft.constraints}
              onChange={(event) => onField('constraints', event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="context-editor">
          <label>
            Signal title
            <input
              value={item.title}
              onChange={(event) =>
                onUpdate(item.id, 'title', event.target.value)
              }
            />
          </label>
          <label>
            Commitment or situation
            <select
              value={item.state}
              onChange={(event) =>
                onUpdate(item.id, 'state', event.target.value)
              }
            >
              {meta.options.state.map((choice) => (
                <option key={choice} value={choice}>
                  {choice === 'Considering'
                    ? 'Considering — not committed'
                    : choice}
                </option>
              ))}
            </select>
          </label>
          <label>
            Possible next action
            <textarea
              rows={2}
              value={item.next_action}
              onChange={(event) =>
                onUpdate(item.id, 'next_action', event.target.value)
              }
            />
          </label>
          <label>
            Stopping point
            <textarea
              rows={2}
              value={item.stopping_point}
              onChange={(event) =>
                onUpdate(item.id, 'stopping_point', event.target.value)
              }
            />
          </label>
          <label className="editor-wide">
            Uncertainty / decision notes
            <textarea
              rows={3}
              value={item.uncertainty}
              onChange={(event) =>
                onUpdate(item.id, 'uncertainty', event.target.value)
              }
            />
          </label>
        </div>
      )}
      <div className="editor-footer">
        <label>
          Reason or stopping note
          <input
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="What changed, why, or where you stopped"
          />
        </label>
        <button className="save-button" disabled={busy} onClick={onSave}>
          {busy ? 'Saving…' : 'Save checkpoint'}{' '}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}

function RecordView({
  title,
  kicker,
  onBack,
  children,
}: {
  title: string;
  kicker: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="record-view">
      <button className="back-button" onClick={onBack}>
        ← Your NOW
      </button>
      <div className="record-heading">
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
      </div>
      <div className="record-content">{children}</div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
