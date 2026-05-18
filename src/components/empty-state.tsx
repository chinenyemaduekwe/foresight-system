import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  description?: string;
  onReset?: () => void;
  resetLabel?: string;
};

export function EmptyState({
  title = "No accounts match this filter",
  description = "Try widening the filter or clearing the search.",
  onReset,
  resetLabel = "Clear filters",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center animate-fade-up">
      <svg
        viewBox="0 0 120 120"
        className="h-24 w-24 text-muted-foreground/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <circle cx="60" cy="60" r="42" strokeDasharray="2 4" />
        <circle cx="60" cy="60" r="28" strokeDasharray="2 4" />
        <circle cx="60" cy="60" r="3" fill="currentColor" stroke="none" />
        <line x1="60" y1="18" x2="60" y2="6" />
        <line x1="60" y1="114" x2="60" y2="102" />
        <line x1="18" y1="60" x2="6" y2="60" />
        <line x1="114" y1="60" x2="102" y2="60" />
        <path
          d="M 60 60 L 92 38"
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onReset ? (
        <Button variant="outline" size="sm" onClick={onReset}>
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}