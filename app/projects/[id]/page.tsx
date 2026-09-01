import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CircleDot,
  GitBranch,
  Globe2,
  Milestone,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  projects,
  getProject,
  shortRevision,
  statusTone,
} from '@/lib/registry';
import { cn } from '@/lib/utils';
import { getGitHubStatus, githubStateLabel } from '@/lib/github-status';
import { publicationPath } from '@/lib/publication-path';

type ProjectPageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const project = getProject((await params).id);
  if (!project) return {};
  return {
    title: project.name,
    description: project.summary,
    openGraph: {
      title: `${project.name} · Vesserith`,
      description: project.summary,
      images: [],
    },
    twitter: {
      card: 'summary',
      title: `${project.name} · Vesserith`,
      description: project.summary,
      images: [],
    },
  };
}

function Status({ label, tone }: { label: string; tone: string }) {
  return (
    <Badge variant="outline" className={cn('border px-2.5 py-1', tone)}>
      {label}
    </Badge>
  );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = getProject((await params).id);
  if (!project) notFound();
  const github = getGitHubStatus(project.id);

  const surfaces = [
    ['Repository', project.surfaces.repository, GitBranch],
    ['Wiki', project.surfaces.wiki, BookOpen],
    ['GitHub Pages', project.surfaces.pages, BookOpen],
    ['Site', project.surfaces.site, Globe2],
  ] as const;

  return (
    <main id="content" className="min-h-screen overflow-hidden">
      <div className="site-grid" aria-hidden="true" />
      <header className="border-b border-white/60 bg-background/80 backdrop-blur-xl">
        <nav
          aria-label="Project navigation"
          className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8"
        >
          <a
            href={publicationPath('/')}
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-950 hover:text-cyan-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ecosystem map
          </a>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Reviewed {project.reviewedAt}
          </span>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-14 sm:px-8 sm:pt-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_19rem] lg:items-start">
          <div>
            <p className="eyebrow">{project.role}</p>
            <div className="mt-6 flex items-center gap-5">
              <span className="grid size-15 shrink-0 place-items-center rounded-2xl bg-cyan-950 text-xl font-bold text-white shadow-[0_16px_40px_rgb(8_47_73/18%)]">
                {project.mark}
              </span>
              <h1 className="text-5xl font-semibold tracking-[-0.05em] text-cyan-950 sm:text-7xl">
                {project.name}
              </h1>
            </div>
            <p className="mt-7 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              {project.summary}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Status
                label={project.implementation.label}
                tone={statusTone.implementation[project.implementation.state]}
              />
              <Status
                label={project.operation.label}
                tone={statusTone.operation[project.operation.state]}
              />
              <Status
                label={project.evidence.label}
                tone={statusTone.evidence[project.evidence.state]}
              />
            </div>
          </div>

          <aside className="rounded-2xl border border-cyan-950/10 bg-white/80 p-5 shadow-[0_18px_60px_rgb(15_23_42/6%)] backdrop-blur-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Desired public address
            </p>
            <p className="mt-3 break-all font-mono text-sm text-cyan-950">
              {project.surfaces.domain}
            </p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Desired namespace only. No live routing is claimed.
            </p>
            <div className="mt-5 border-t border-cyan-950/8 pt-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Pinned source
              </p>
              <p className="mt-2 font-mono text-xs text-cyan-950">
                {shortRevision(project.source.revision)}
              </p>
            </div>
            {github ? (
              <div className="mt-5 border-t border-cyan-950/8 pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Derived GitHub snapshot
                </p>
                <p className="mt-2 text-xs font-medium text-cyan-950">
                  {githubStateLabel[github.state]}
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {github.observedDefaultBranch ?? 'lookup unavailable'} ·{' '}
                  {shortRevision(github.observedDefaultRevision)}
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-18 sm:px-8 lg:grid-cols-2">
        <article className="rounded-2xl border border-cyan-950/10 bg-white/80 p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <CircleDot className="size-5 text-cyan-700" aria-hidden="true" />
            <h2 className="text-xl font-semibold tracking-tight text-cyan-950">
              Evidence basis
            </h2>
          </div>
          <p className="mt-5 leading-7 text-slate-600">
            {project.evidence.detail}
          </p>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
            {project.evidence.state} · reviewed {project.reviewedAt}
          </p>
        </article>

        <article className="rounded-2xl border border-cyan-950/10 bg-white/80 p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-cyan-700" aria-hidden="true" />
            <h2 className="text-xl font-semibold tracking-tight text-cyan-950">
              Authority boundaries
            </h2>
          </div>
          <ul className="mt-5 space-y-4">
            {project.boundaries.map((boundary) => (
              <li
                key={boundary}
                className="flex gap-3 text-sm leading-6 text-slate-600"
              >
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-600"
                  aria-hidden="true"
                />
                {boundary}
              </li>
            ))}
          </ul>
        </article>
      </section>

      {project.versions ? (
        <section
          aria-labelledby="versions-title"
          className="mx-auto max-w-6xl px-5 pb-18 sm:px-8"
        >
          <div className="rounded-2xl border border-cyan-950/10 bg-cyan-950 p-6 text-white sm:p-8">
            <div className="flex items-center gap-3">
              <Milestone className="size-5 text-cyan-200" aria-hidden="true" />
              <h2
                id="versions-title"
                className="text-xl font-semibold tracking-tight"
              >
                Version chronology
              </h2>
            </div>
            <div className="mt-7 grid gap-px overflow-hidden rounded-xl bg-white/15 md:grid-cols-3">
              {project.versions.map((version) => (
                <article key={version.label} className="bg-cyan-950 p-5">
                  <p className="font-mono text-sm text-cyan-100">
                    {version.label}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200/65">
                    {version.status}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-cyan-50/65">
                    {version.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-24 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-cyan-950/10 bg-white/80 p-6 sm:p-7">
          <h2 className="text-xl font-semibold tracking-tight text-cyan-950">
            Public surfaces
          </h2>
          <div className="mt-5 divide-y divide-cyan-950/8">
            {surfaces.map(([label, url, Icon]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </span>
                {url ? (
                  <a
                    href={url}
                    className="inline-flex items-center gap-1 font-medium text-cyan-900 hover:text-cyan-700"
                  >
                    Open
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-cyan-950/10 bg-white/80 p-6 sm:p-7">
          <h2 className="text-xl font-semibold tracking-tight text-cyan-950">
            Next acceptance gate
          </h2>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            {project.nextGate}
          </p>
          <p className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
            <Milestone className="size-3.5" aria-hidden="true" />
            No automatic progression
          </p>
        </article>
      </section>

      <footer className="border-t border-cyan-950/8 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <p>{project.name} · evidence record</p>
          <p>Vesserith coordinates navigation, not product authority.</p>
        </div>
      </footer>
    </main>
  );
}
