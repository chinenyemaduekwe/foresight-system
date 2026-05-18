import { Radar } from "lucide-react";

type Props = {
  title: string;
  eyebrow?: string;
  meta?: React.ReactNode;
  /** Override the standard product subtitle line. */
  tagline?: string;
  children?: React.ReactNode;
};

const DEFAULT_TAGLINE =
  "Foresight identifies accounts at risk of churning before it happens — so you can act first.";

export function PageHeader({ title, eyebrow, meta, tagline = DEFAULT_TAGLINE, children }: Props) {
  return (
    <header className="animate-fade-up space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <h1 className="font-serif text-4xl leading-none tracking-tight text-foreground sm:text-[42px]">
            {title}
          </h1>
          {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
        </div>
        {children ? <div className="flex items-center gap-2">{children}</div> : null}
      </div>
      <div className="flex items-start gap-2 border-l-2 border-primary/60 pl-3">
        <Radar className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary/70" />
        <p className="text-[12px] leading-snug text-muted-foreground">{tagline}</p>
      </div>
    </header>
  );
}