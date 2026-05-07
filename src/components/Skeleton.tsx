// Tailwind v4-compatible skeleton primitive. Renders an animated gray block
// using the existing `bg-c-tag` token so it themes light/dark correctly.
// `animate-pulse` is a Tailwind built-in.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-c-tag rounded ${className}`} />;
}
