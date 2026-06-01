import { Eye } from "lucide-react";

type Props = {
  title: string;
  meta?: React.ReactNode;
};

export const FORESIGHT_TAGLINE =
  "Foresight identifies accounts at risk of churning before it happens — so you can act first.";

export function PageHeader({ title, meta }: Props) {
  return (
    <div className="animate-fade-up space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="serif text-[34px] font-normal leading-none tracking-tight text-foreground animate-shimmer">
          {title}
        </h1>
        {meta ? (
          <div className="text-xs text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      <div className="flex items-start gap-2 border-l-2 border-primary/60 pl-2.5">
        <Eye className="mt-px h-3 w-3 shrink-0 text-primary/80" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {FORESIGHT_TAGLINE}
        </p>
      </div>
    </div>
  );
}
