import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  description?: string;
  onClear?: () => void;
  clearLabel?: string;
};

export function EmptyState({
  title = "No accounts match this filter",
  description = "Try clearing the search or selecting a different category.",
  onClear,
  clearLabel = "Clear filters",
}: Props) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/70 bg-card/30 py-16 text-center">
      <svg
        viewBox="0 0 96 96"
        className="h-16 w-16 text-muted-foreground/60 animate-empty-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      >
        <circle cx="40" cy="40" r="22" />
        <line x1="58" y1="58" x2="80" y2="80" strokeLinecap="round" />
        <line x1="30" y1="40" x2="50" y2="40" strokeLinecap="round" opacity="0.5" />
      </svg>
      <div className="space-y-1">
        <div className="serif text-lg text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {onClear ? (
        <Button size="sm" variant="outline" onClick={onClear}>
          {clearLabel}
        </Button>
      ) : null}
    </div>
  );
}
