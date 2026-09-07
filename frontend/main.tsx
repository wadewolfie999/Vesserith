import React, { useEffect, useState } from 'react';
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
  const [saved, setSaved] = useState<Saved | null>(null),
    [draft, setDraft] = useState<Orientation | null>(null),
    [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState('');
  const [history, setHistory] = useState<History[] | null>(null),
    [changes, setChanges] = useState<string | null>(null);
  const dirty =
    !!saved && JSON.stringify(draft) !== JSON.stringify(saved.document);
  const pending = dirty || !!reason.trim();
  useEffect(() => {
    let cancelled = false;
    Promise.all([api<Saved>('/api/orientation'), api<Meta>('/api/meta')])
      .then(([s, m]) => {
        if (cancelled) return;
        setSaved(s);
        setDraft(s.document);
        setMeta(m);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    function leave(e: BeforeUnloadEvent) {
      if (dirty || reason.trim()) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty, reason]);
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
      setHistory(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  if (!draft || !saved || !meta)
    return (
      <main>
        <h1>Vesserith</h1>
        <output>{error || 'Opening your orientation…'}</output>
        {error && (
          <button onClick={() => window.location.reload()}>Retry</button>
        )}
      </main>
    );
  function field(key: keyof Omit<Orientation, 'items'>, value: string) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setNotice('');
  }
  function update(id: string, key: keyof Entry, value: string) {
    setDraft((d) =>
      d
        ? {
            ...d,
            items: d.items.map((i) =>
              i.id === id ? { ...i, [key]: value } : i,
            ),
          }
        : d,
    );
    setNotice('');
  }
  function add() {
    setDraft((d) =>
      d
        ? {
            ...d,
            items: [
              ...d.items,
              {
                id: crypto.randomUUID(),
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
        : d,
    );
    setNotice('Idea added below. It is set aside until you choose otherwise.');
  }
  const chosen = draft.items.find((i) => i.state === 'Chosen');
  const possible = draft.items.filter((i) => i.state === 'Considering');
  const waiting = draft.items.filter((i) => i.state === 'Waiting');
  const parked = draft.items.filter((i) => i.state === 'Set aside');
  return (
    <main>
      <header>
        <div>
          <span className="brand">Vesserith</span>
          <span className="version">
            {meta.version} · {meta.status} · {meta.commit}
          </span>
        </div>
        <nav aria-label="Records">
          <a href="#entries">Entries</a>
          <button
            disabled={pending || busy}
            title={dirty ? 'Save first to export this orientation' : undefined}
            onClick={() => {
              window.location.href = '/api/export';
            }}
          >
            Export context
          </button>
          <button
            onClick={async () => {
              try {
                setHistory(
                  history ? null : await api<History[]>('/api/history'),
                );
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            History
          </button>
          <button
            onClick={async () => {
              try {
                const r = await fetch('/api/changes');
                if (!r.ok) throw Error('Could not load changes');
                setChanges(changes ? null : await r.text());
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            What changed
          </button>
        </nav>
      </header>
      <div className="intro">
        <div>
          <p className="eyebrow">Your current orientation</p>
          <h1>Now</h1>
        </div>
        <p className="quiet">Not yet decided is a valid answer.</p>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <p>
            Your edits remain on this page. If another tab saved, copy your
            draft before reloading.
          </p>
        </div>
      )}
      <fieldset disabled={busy} className="workspace">
        <section className="orientation" aria-label="Orientation">
          <article className="objective">
            <label htmlFor="objective">Main objective</label>
            <textarea
              id="objective"
              rows={2}
              value={draft.objective}
              placeholder="What matters most?"
              onChange={(e) => field('objective', e.target.value)}
            />
            <label htmlFor="priority">Current priority</label>
            <input
              id="priority"
              value={draft.priority}
              placeholder="Not yet decided"
              onChange={(e) => field('priority', e.target.value)}
            />
          </article>
          <article>
            <label htmlFor="constraints">Constraints and open limits</label>
            <textarea
              id="constraints"
              rows={4}
              value={draft.constraints}
              placeholder="Chosen limits; what is still unknown"
              onChange={(e) => field('constraints', e.target.value)}
            />
          </article>
          <article>
            <label htmlFor="focus">Current focus</label>
            <textarea
              id="focus"
              rows={2}
              value={draft.focus}
              placeholder="Not yet decided"
              onChange={(e) => field('focus', e.target.value)}
            />
            <p className="quiet">A focus does not commit you to an action.</p>
          </article>
          <article className="action">
            <h2>Next physical action</h2>
            {chosen ? (
              <>
                <p className="strong">{chosen.next_action}</p>
                <p>Stop when: {chosen.stopping_point}</p>
                <span className="pill">
                  {chosen.origin} · {chosen.scope}
                </span>
              </>
            ) : (
              <>
                <p className="strong">No action chosen</p>
                {possible.map((i) => (
                  <p key={i.id}>
                    <span className="pill">Considering · not committed</span>
                    <br />
                    {i.next_action || i.title}
                  </p>
                ))}
              </>
            )}
          </article>
        </section>
        <section className="shelves" aria-label="Waiting and postponed">
          <article>
            <h2>Waiting for</h2>
            {waiting.length ? (
              waiting.map((i) => (
                <p key={i.id}>
                  {i.waiting_for || i.title}
                  {i.review_date && (
                    <span className="quiet block">
                      Review {i.review_date} · check manually
                    </span>
                  )}
                </p>
              ))
            ) : (
              <p className="quiet">No waiting conditions recorded.</p>
            )}
          </article>
          <article>
            <h2>Deliberately postponed</h2>
            {parked.length ? (
              <ul>
                {parked.map((i) => (
                  <li key={i.id}>{i.title}</li>
                ))}
              </ul>
            ) : (
              <p className="quiet">Nothing parked.</p>
            )}
            <button onClick={add}>Park an idea</button>
          </article>
        </section>
        <section id="entries">
          <div className="section-title">
            <h2>Entries and possibilities</h2>
            <p className="quiet">
              Open an entry to update it. Nothing here runs external work.
            </p>
          </div>
          {draft.items.length === 0 && (
            <p>No entries yet. Park an idea to begin.</p>
          )}
          {draft.items.map((item) => (
            <details key={item.id} className="entry">
              <summary>
                <span>{item.title}</span>
                <span className="pill">
                  {item.area} ·{' '}
                  {item.state === 'Considering'
                    ? 'Considering · not committed'
                    : item.state}
                </span>
              </summary>
              <div className="entry-form">
                <label className="wide">
                  Title
                  <input
                    value={item.title}
                    onChange={(e) => update(item.id, 'title', e.target.value)}
                  />
                </label>
                {(['area', 'state', 'origin', 'scope'] as const).map((key) => (
                  <label key={key}>
                    {
                      {
                        area: 'Pursuit',
                        state: 'Commitment or situation',
                        origin: 'Where this came from',
                        scope: 'Scope',
                      }[key]
                    }
                    <select
                      value={item[key]}
                      onChange={(e) => update(item.id, key, e.target.value)}
                    >
                      {meta.options[key].map((v) => (
                        <option key={v} value={v}>
                          {v === 'Considering'
                            ? 'Considering — not committed'
                            : v}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <p className="quiet wide">
                  {meta.scope_help[item.scope]} Choosing an action does not
                  grant new authorization.
                </p>
                {(
                  [
                    'next_action',
                    'stopping_point',
                    'waiting_for',
                    'uncertainty',
                    'references',
                  ] as const
                ).map((key) => (
                  <label
                    className={key === 'references' ? 'wide' : ''}
                    key={key}
                  >
                    {
                      {
                        next_action:
                          'Concrete next action (possible or chosen)',
                        stopping_point: 'Stopping point',
                        waiting_for: 'Waiting for',
                        uncertainty: 'What remains uncertain / decision notes',
                        references: 'Links, machine names, and file paths',
                      }[key]
                    }
                    <textarea
                      rows={2}
                      value={item[key]}
                      onChange={(e) => update(item.id, key, e.target.value)}
                    />
                  </label>
                ))}
                <label>
                  Review date (optional)
                  <input
                    type="date"
                    value={item.review_date}
                    onChange={(e) =>
                      update(item.id, 'review_date', e.target.value)
                    }
                  />
                </label>
              </div>
            </details>
          ))}
        </section>
        <footer className="savebar">
          <label>
            Reason or stopping note (optional)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What changed, why, or where you stopped"
            />
          </label>
          <button
            className="primary"
            disabled={(!dirty && !reason.trim()) || busy}
            onClick={() => void save()}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <output>
            {pending
              ? 'Unsaved changes'
              : notice || `Saved · revision ${saved.revision}`}
          </output>
        </footer>
      </fieldset>
      {history && (
        <section className="panel">
          <h2>Saved history</h2>
          <p className="quiet">
            Each saved revision retains the full orientation. Read-only; it does
            not change your current state.
          </p>
          {history.map((h) => (
            <details key={h.revision}>
              <summary>
                Revision {h.revision} ·{' '}
                {new Date(h.recorded_at).toLocaleString()} ·{' '}
                {h.reason || 'No reason supplied'}
              </summary>
              <pre>{JSON.stringify(h.document, null, 2)}</pre>
            </details>
          ))}
        </section>
      )}
      {changes && (
        <section className="panel">
          <h2>What changed</h2>
          <pre>{changes}</pre>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
