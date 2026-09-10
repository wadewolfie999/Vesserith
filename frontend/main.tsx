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
      setNotice('Saved.');
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
        <output>{error || 'Opening…'}</output>
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
    setNotice('Parked.');
  }

  const waiting = draft.items.filter((item) => item.state === 'Waiting');
  const parked = draft.items.filter((item) => item.state === 'Set aside');
  const thesisEntries = draft.items.filter((item) => item.area === 'Thesis');
  const incomeEntries = draft.items.filter((item) => item.area === 'Income');
  const chosenAction = draft.items.find((item) => item.state === 'Chosen')
    ?.next_action;
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
              pending ? 'Save to export' : undefined
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
          <strong>Not saved.</strong> {error}
          <span>Edits kept.</span>
        </div>
      )}

      <section id="workspace" className="workspace">
        {view === 'now' && (
          <NowView
            draft={draft}
            thesisCount={thesisEntries.length}
            incomeCount={incomeEntries.length}
            chosenAction={chosenAction}
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
            onBack={() => navigate('now')}
          >
            {history?.map((entry) => (
              <details className="history-card" key={entry.revision}>
                <summary>
                  <span className="history-revision">
                    #{entry.revision}
                  </span>
                  <strong>{entry.reason || 'No note'}</strong>
                  <time>{new Date(entry.recorded_at).toLocaleString()}</time>
                </summary>
                <div className="history-snapshot">
                  <span>Objective</span>
                  <p>{entry.document.objective || 'Unset'}</p>
                  <span>Focus</span>
                  <p>{entry.document.focus || 'Unset'}</p>
                </div>
              </details>
            ))}
          </RecordView>
        )}
        {view === 'changes' && (
          <RecordView
            title="What changed"
            onBack={() => navigate('now')}
          >
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
            <span className="rail-label">STATE</span>
            <strong>
              {pending
                ? 'Unsaved'
                : notice || `Saved #${saved.revision}`}
            </strong>
          </div>
          <div>
            <span className="rail-label">WAITING</span>
            <strong>
              {waiting.length ? waiting[0].title : 'None'}
            </strong>
          </div>
          <div>
            <span className="rail-label">PARKED</span>
            <strong>
              {parked.length} idea{parked.length === 1 ? '' : 's'}
            </strong>
          </div>
          <button onClick={add}>
            Park idea <span aria-hidden="true">＋</span>
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
  chosenAction,
  onOpenMap,
  onEdit,
}: {
  draft: Orientation;
  thesisCount: number;
  incomeCount: number;
  chosenAction?: string;
  onOpenMap: (view: View) => void;
  onEdit: () => void;
}) {
  return (
    <>
      <section className="now-hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR NOW</span>
          <h1>Orientation</h1>
        </div>
        <div className="objective-slab">
          <div className="slab-topline">
            <span>OBJECTIVE</span>
            <button onClick={onEdit}>
              Edit <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p>
            {draft.objective || 'Unset'}
          </p>
        </div>
      </section>
      <section className="map-section">
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
            <h3>Thesis</h3>
            <div className="map-card-footer">
              <span>
                {thesisCount} signal{thesisCount === 1 ? '' : 's'}
              </span>
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
            <h3>Mynyra</h3>
            <div className="map-card-footer">
              <span>
                {incomeCount} signal{incomeCount === 1 ? '' : 's'}
              </span>
            </div>
          </button>
        </div>
      </section>
      <section className="orientation-strip">
        <div>
          <span className="strip-label">FOCUS</span>
          <strong>{draft.focus || 'Unset'}</strong>
        </div>
        <div>
          <span className="strip-label">ACTION</span>
          <strong>{chosenAction || 'Unset'}</strong>
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
  const title = thesis ? 'Thesis' : 'Mynyra';
  const objective = thesis
    ? draft.objective
    : 'XAUUSD M1 feasibility';
  const centerLabel = thesis ? 'OBJECTIVE' : 'POTENTIAL PATH';
  return (
    <section
      className={`worldmap-view ${thesis ? 'thesis-world' : 'income-world'}`}
    >
      <div className="map-toolbar">
        <button className="back-button" onClick={onBack}>
          ← Now
        </button>
      </div>
      <div className="world-title">
        <div>
          <h1>{title}</h1>
        </div>
        <button className="soft-button" onClick={onEdit}>
          Edit <span aria-hidden="true">↗</span>
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
            <button onClick={onEdit}>Edit ↗</button>
          </div>
          {entries.map((entry, index) => (
            <button
              className={`map-node signal-node signal-${index + 1} ${selected?.id === entry.id ? 'node-selected' : ''}`}
              key={entry.id}
              onClick={() => onSelect(entry.id)}
            >
              <span className="node-dot" aria-hidden="true" />
              <span className="node-label">
                {entry.state.toUpperCase()}
              </span>
              <strong>{entry.title}</strong>
            </button>
          ))}
          {!entries.length && (
            <div className="empty-map">
              No signals.
              <br />
              <button onClick={onEdit}>Add</button>
            </div>
          )}
        </div>
        <aside className="map-inspector">
          {selected ? (
            <EntryInspector entry={selected} onEdit={onEdit} />
          ) : (
            <>
              <h2>Select a signal</h2>
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
      <h2>{entry.title}</h2>
      <span className="status-chip">
        {entry.state}
      </span>
      <div className="inspector-block">
        <span className="inspector-label">NEXT</span>
        <p>{entry.next_action || 'Unset'}</p>
      </div>
      <div className="inspector-block">
        <span className="inspector-label">UNCERTAINTY</span>
        <p>{entry.uncertainty || 'Unset'}</p>
      </div>
      <div className="inspector-block">
        <span className="inspector-label">STOP</span>
        <p>{entry.stopping_point || 'Unset'}</p>
      </div>
      <button className="soft-button full-button" onClick={onEdit}>
        Edit ↗
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
          <h2>{item ? item.title : 'Orientation'}</h2>
        </div>
        <button className="close-button" onClick={onClose}>
          Close <span aria-hidden="true">×</span>
        </button>
      </div>
      {!item ? (
        <div className="context-editor">
          <label>
            Objective
            <textarea
              rows={3}
              value={draft.objective}
              onChange={(event) => onField('objective', event.target.value)}
            />
          </label>
          <label>
            Priority
            <input
              value={draft.priority}
              onChange={(event) => onField('priority', event.target.value)}
            />
          </label>
          <label>
            Focus
            <textarea
              rows={2}
              value={draft.focus}
              onChange={(event) => onField('focus', event.target.value)}
            />
          </label>
          <label>
            Limits
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
            Title
            <input
              value={item.title}
              onChange={(event) =>
                onUpdate(item.id, 'title', event.target.value)
              }
            />
          </label>
          <label>
            State
            <select
              value={item.state}
              onChange={(event) =>
                onUpdate(item.id, 'state', event.target.value)
              }
            >
              {meta.options.state.map((choice) => (
                <option key={choice} value={choice}>
                  {choice === 'Considering'
                    ? 'Considering'
                    : choice}
                </option>
              ))}
            </select>
          </label>
          <label>
            Next
            <textarea
              rows={2}
              value={item.next_action}
              onChange={(event) =>
                onUpdate(item.id, 'next_action', event.target.value)
              }
            />
          </label>
          <label>
            Stop
            <textarea
              rows={2}
              value={item.stopping_point}
              onChange={(event) =>
                onUpdate(item.id, 'stopping_point', event.target.value)
              }
            />
          </label>
          <label className="editor-wide">
            Uncertainty
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
          Note
          <input
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <button className="save-button" disabled={busy} onClick={onSave}>
          {busy ? 'Saving…' : 'Save'}{' '}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}

function RecordView({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="record-view">
      <button className="back-button" onClick={onBack}>
        ← Now
      </button>
      <div className="record-heading">
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
