import { ArrowRight, Braces, Layers3, Sprout } from "lucide-react";
import { ApiStatus } from "@/features/system/api-status";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 sm:px-10">
      <a href="#main" className="sr-only rounded-md bg-card p-3 focus:not-sr-only focus:absolute focus:top-2 focus:z-10">Skip to content</a>
      <header className="flex items-center justify-between gap-4 border-b border-border py-7">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sprout className="size-5" aria-hidden="true" /></span>
          <span className="text-sm font-semibold tracking-tight">Student Savings Planner</span>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">VTHacks · Starter</span>
      </header>

      <main id="main" className="flex-1 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <section>
            <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><span className="h-px w-7 bg-primary" /> A little clarity. A better plan.</p>
            <h1 className="font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl">Small decisions.<br /><span className="text-primary">Bigger possibilities.</span></h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">A foundation for helping Virginia Tech students connect everyday spending with the things they’re saving for.</p>
            <div className="mt-9 flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-primary" /> Development starter <ArrowRight className="ml-1 size-4 text-muted-foreground" aria-hidden="true" /></div>
          </section>
          <ApiStatus />
        </div>

        <section className="mt-20 grid gap-5 border-t border-border pt-8 sm:grid-cols-3" aria-label="Project workspaces">
          <Workspace icon={<Layers3 className="size-4" />} number="01" title="Frontend" path="frontend/" description="Screens, components, and the student experience. An independent Next.js app." />
          <Workspace icon={<Braces className="size-4" />} number="02" title="Backend" path="backend/" description="The API, financial engine, and integrations. An independent Fastify app." />
          <Workspace icon={<ArrowRight className="size-4" />} number="03" title="Shared agreement" path="contracts/" description="API shapes and synthetic examples that keep both teams working together." />
        </section>
      </main>

      <footer className="flex flex-col justify-between gap-2 border-t border-border py-6 text-xs leading-relaxed text-muted-foreground sm:flex-row">
        <span>Built for students. Developed at VTHacks.</span>
        <span>Unofficial student project · No financial accounts connected</span>
      </footer>
    </div>
  );
}

function Workspace({ icon, number, title, path, description }: { icon: React.ReactNode; number: string; title: string; path: string; description: string }) {
  return (
    <div className="rounded-xl p-3 sm:p-4">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground"><span aria-hidden="true">{icon}</span><span className="font-mono text-xs">{number}</span></div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
      <p className="mt-4 font-mono text-xs text-primary">{path}</p>
    </div>
  );
}
