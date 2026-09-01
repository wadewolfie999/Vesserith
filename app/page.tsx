import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CircleDot,
  GitBranch,
  Layers3,
  Orbit,
  RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  evidenceEpoch,
  projects,
  shortRevision,
  statusTone,
} from '@/lib/registry';
import { mynyraShowcase } from '@/lib/mynyra-showcase';
import { cn } from '@/lib/utils';
import { githubStateLabel, githubStatus } from '@/lib/github-status';
import { publicationPath } from '@/lib/publication-path';

function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <Badge variant="outline" className={cn('border px-2.5 py-1', tone)}>
      {label}
    </Badge>
  );
}

export default function Home() {
  return (
    <main id="content" className="min-h-screen overflow-hidden">
      <div className="site-grid" aria-hidden="true" />

      <header className="relative z-20 border-b border-white/55 bg-background/80 backdrop-blur-xl">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <a
            href={publicationPath('/')}
            className="font-semibold tracking-tight"
          >
            <span>Vesserith</span>
          </a>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a
              className="transition-colors hover:text-foreground"
              href="#mynyra"
            >
              Mynyra
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#freshness"
            >
              Dashboard
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#evidence"
            >
              Method
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#projects"
            >
              Projects
            </a>
          </div>
          <a
            href="#evidence"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-cyan-950/10 bg-white/70 px-3 text-xs font-medium shadow-sm transition hover:border-cyan-950/20 hover:bg-white"
          >
            <CircleDot className="size-3.5 text-cyan-700" aria-hidden="true" />
            Evidence map
          </a>
        </nav>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
        <div className="max-w-3xl">
          <p className="eyebrow">
            Public evidence dashboard · Evidence epoch {evidenceEpoch}
          </p>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1] tracking-[-0.05em] text-cyan-950 sm:text-6xl lg:text-[4.5rem]">
            Three projects.
            <span className="block text-gradient">One evidence view.</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            A public GitHub Pages dashboard for Vesserith, Mynyra, and
            Hova—showing reviewed source, observed operation, and unresolved
            evidence without inventing progress.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#mynyra"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-cyan-950 px-5 text-sm font-medium text-white shadow-[0_12px_30px_rgb(8_47_73/20%)] transition hover:-translate-y-0.5 hover:bg-cyan-900"
            >
              Open Mynyra research lab
              <ArrowDownRight className="size-4" aria-hidden="true" />
            </a>
            <span className="inline-flex h-11 items-center gap-2 rounded-full border border-cyan-950/10 bg-white/70 px-4 text-sm text-muted-foreground">
              <Orbit className="size-4 text-cyan-700" aria-hidden="true" />
              GitHub Pages · public and read-only
            </span>
          </div>
        </div>
      </section>

      <section
        id="mynyra"
        aria-labelledby="mynyra-title"
        className="relative mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-20"
      >
        <div className="overflow-hidden rounded-3xl border border-cyan-950/10 bg-cyan-950 text-white shadow-[0_24px_80px_rgb(8_47_73/14%)]">
          <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-cyan-950 via-cyan-900 to-slate-900 p-6 sm:p-8 lg:p-10">
              <div
                className="absolute -right-24 -top-24 size-64 rounded-full bg-cyan-300/10 blur-3xl"
                aria-hidden="true"
              />
              <p className="eyebrow text-cyan-200/70">Focused project space</p>
              <h2
                id="mynyra-title"
                className="relative mt-4 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                {mynyraShowcase.title}
              </h2>
              <p className="relative mt-5 max-w-md text-sm leading-7 text-cyan-50/75 sm:text-base">
                {mynyraShowcase.summary}
              </p>
              <div className="relative mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={mynyraShowcase.links.evidenceRecord}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-cyan-950 transition hover:-translate-y-0.5 hover:bg-cyan-50"
                >
                  Open evidence record
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
                <a
                  href={mynyraShowcase.links.repository}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-medium text-cyan-50 transition hover:border-white/40 hover:bg-white/10"
                >
                  Repository
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              </div>
              <p className="relative mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/60">
                Source {mynyraShowcase.source.revision.slice(0, 8)} · reviewed{' '}
                {mynyraShowcase.source.reviewedAt}
              </p>
            </div>

            <div className="bg-white p-6 text-cyan-950 sm:p-8 lg:p-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Deterministic proof path</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The public view stops at evidence. It does not become a
                    provider, broker, or order boundary.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-cyan-900/10 bg-cyan-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.13em] text-cyan-800">
                  {mynyraShowcase.mode}
                </span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {mynyraShowcase.pipeline.map((stage, index) => (
                  <div key={stage.id} className="relative">
                    <article className="h-full rounded-2xl border border-cyan-950/10 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-700">
                          0{index + 1}
                        </span>
                        {index < mynyraShowcase.pipeline.length - 1 ? (
                          <ArrowRight
                            className="hidden size-4 text-cyan-500 sm:block"
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-cyan-950">
                        {stage.label}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {stage.detail}
                      </p>
                    </article>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {mynyraShowcase.signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="rounded-xl border border-cyan-950/8 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-600">
                        {signal.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-cyan-800">
                        {signal.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-cyan-950/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-slate-600">
                  Next gate: {mynyraShowcase.nextGate}
                </p>
                <a
                  href={mynyraShowcase.links.offlineReplay}
                  className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-cyan-900 hover:text-cyan-700"
                >
                  Read replay contract
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="evidence"
        aria-label="Evidence map method"
        className="relative mx-auto max-w-7xl px-5 pb-16 sm:px-8"
      >
        <div className="grid gap-px overflow-hidden rounded-2xl border border-cyan-950/10 bg-cyan-950/10 sm:grid-cols-3">
          {[
            [
              'Implementation',
              'Code that exists',
              'shell · prototype · implemented',
            ],
            [
              'Operation',
              'State that is proven',
              'not deployed · deferred · unverified',
            ],
            [
              'Evidence',
              'Why a claim is shown',
              'observed · recorded · inferred · unavailable',
            ],
          ].map(([title, detail, values]) => (
            <div key={title} className="bg-white/85 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-cyan-950">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-800/70">
                {values}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="projects"
        aria-labelledby="projects-title"
        className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-8"
      >
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Registry · exact source revisions</p>
            <h2
              id="projects-title"
              className="mt-3 text-3xl font-semibold tracking-tight text-cyan-950 sm:text-4xl"
            >
              Three projects, reviewed independently.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Each project owns its source, application, data, deployment, and
            recovery. Vesserith owns only this public evidence view.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project, index) => (
            <Card
              key={project.id}
              className={cn(
                'project-card border-0 bg-white/80 py-0 shadow-[0_18px_60px_rgb(15_23_42/6%)] ring-cyan-950/10 backdrop-blur-sm',
                index === 0 && 'lg:col-span-2',
              )}
            >
              <CardHeader className="gap-4 border-b border-cyan-950/7 px-6 py-6 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-950 text-sm font-bold text-white">
                      {project.mark}
                    </span>
                    <div>
                      <CardTitle className="text-xl text-cyan-950">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {project.role}
                      </CardDescription>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {shortRevision(project.source.revision)}
                  </span>
                </div>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  {project.summary}
                </p>
              </CardHeader>
              <CardContent className="px-6 py-6 sm:px-7">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={project.implementation.label}
                    tone={
                      statusTone.implementation[project.implementation.state]
                    }
                  />
                  <StatusBadge
                    label={project.operation.label}
                    tone={statusTone.operation[project.operation.state]}
                  />
                  <StatusBadge
                    label={project.evidence.label}
                    tone={statusTone.evidence[project.evidence.state]}
                  />
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-cyan-950/7 pt-5">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <a
                      href={publicationPath(`/projects/${project.id}/`)}
                      className="inline-flex items-center gap-2 font-semibold text-cyan-950 hover:text-cyan-700"
                    >
                      Evidence record
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                    {project.surfaces.repository ? (
                      <a
                        href={project.surfaces.repository}
                        className="inline-flex items-center gap-2 font-medium text-cyan-900 hover:text-cyan-700"
                      >
                        <GitBranch className="size-4" aria-hidden="true" />
                        Repository
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Layers3 className="size-4" aria-hidden="true" />
                        Source not published
                      </span>
                    )}
                    {project.surfaces.wiki ? (
                      <a
                        href={project.surfaces.wiki}
                        className="inline-flex items-center gap-2 font-medium text-cyan-900 hover:text-cyan-700"
                      >
                        <BookOpen className="size-4" aria-hidden="true" />
                        Wiki
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        id="freshness"
        aria-labelledby="freshness-title"
        className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-8"
      >
        <div className="rounded-2xl border border-cyan-950/10 bg-white/75 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">
                Derived GitHub snapshot · non-authoritative
              </p>
              <h2
                id="freshness-title"
                className="mt-3 text-2xl font-semibold tracking-tight text-cyan-950 sm:text-3xl"
              >
                Freshness without moving the evidence baseline.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Refreshed during publication. A failed lookup leaves the reviewed,
              commit-pinned registry intact.
            </p>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {githubStatus.entries.map((entry) => {
              const project = projects.find(
                (candidate) => candidate.id === entry.projectId,
              );
              return (
                <article
                  key={entry.projectId}
                  className="rounded-xl border border-cyan-950/8 bg-white/75 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-cyan-950">
                      {project?.name ?? entry.projectId}
                    </h3>
                    <RefreshCw
                      className="size-4 text-cyan-700"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-700">
                    {githubStateLabel[entry.state]}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {entry.observedDefaultBranch ?? 'lookup unavailable'} ·{' '}
                    {shortRevision(entry.observedDefaultRevision)}
                  </p>
                </article>
              );
            })}
          </div>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Snapshot {githubStatus.status} ·{' '}
            {githubStatus.generatedAt ?? 'no successful refresh recorded'}
          </p>
        </div>
      </section>

      <section
        id="principles"
        aria-labelledby="principles-title"
        className="relative border-y border-cyan-950/8 bg-cyan-950 text-white"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-18 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
          <div>
            <p className="eyebrow text-cyan-200/70">A thin center by design</p>
            <h2
              id="principles-title"
              className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Coherence without shared failure.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              [
                '01',
                'Product-owned',
                'Every project keeps authority over its code, data, deployment, and recovery.',
              ],
              [
                '02',
                'Evidence-bound',
                'Public claims identify their source revision, review date, and uncertainty.',
              ],
              [
                '03',
                'Operations apart',
                'This static dashboard never becomes a trading bus, private store, or privileged console.',
              ],
            ].map(([number, title, copy]) => (
              <div key={number} className="border-t border-white/15 pt-5">
                <p className="font-mono text-xs text-cyan-200/60">{number}</p>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-cyan-50/65">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-cyan-950/8 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <p>Vesserith · GitHub Pages evidence dashboard</p>
          <p>Reviewed {evidenceEpoch} · no operational authority</p>
        </div>
      </footer>
    </main>
  );
}
