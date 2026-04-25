const PALETTE = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-orange-500",
  "from-cyan-500 to-blue-600",
  "from-amber-500 to-red-500",
  "from-fuchsia-500 to-pink-600",
  "from-violet-500 to-indigo-600",
  "from-sky-500 to-cyan-600",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function TitleCover({
  name,
  seed,
  className = "",
}: {
  name: string;
  seed: string;
  className?: string;
}) {
  const gradient = PALETTE[hashString(seed) % PALETTE.length];
  return (
    <div
      className={`bg-linear-to-br ${gradient} flex items-center justify-center p-3 ${className}`}
    >
      <span
        dir="auto"
        className="text-white font-bold text-center text-base leading-tight line-clamp-3"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
      >
        {name}
      </span>
    </div>
  );
}
