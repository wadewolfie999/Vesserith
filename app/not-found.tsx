import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="content" className="grid min-h-screen place-items-center px-5">
      <div className="max-w-lg text-center">
        <p className="eyebrow">Unavailable evidence record</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-cyan-950">
          This project is not in the registry.
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Vesserith does not infer or invent missing project surfaces.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-cyan-950 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-900"
        >
          Return to the ecosystem map
        </Link>
      </div>
    </main>
  );
}
