import { Link } from "@/i18n/navigation";
import TitleCover from "@/components/TitleCover";
import { STATUS_CLASSES } from "@/lib/gameStatus";

export type GameTileData = {
  slug: string;
  name: string;
  status: string;
  thumbnail_url: string | null;
};

// Compact game card — thumbnail (or TitleCover) + name + status badge. Used by
// the related-games strips on the game detail page and the country/genre hub
// grids. Width comes from the caller (`className`).
export default function GameTile({
  game,
  statusLabel,
  className = "",
}: {
  game: GameTileData;
  statusLabel: string;
  className?: string;
}) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className={`group block bg-c-surface border border-c-border rounded-lg overflow-hidden hover:border-indigo-500/50 transition-colors ${className}`}
    >
      {game.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.thumbnail_url}
          alt={game.name}
          width={230}
          height={108}
          loading="lazy"
          decoding="async"
          className="w-full aspect-[460/215] object-cover"
        />
      ) : (
        <TitleCover name={game.name} seed={game.slug} className="w-full aspect-[460/215]" />
      )}
      <div className="p-2.5">
        <p
          className="text-sm font-medium text-c-text truncate group-hover:text-indigo-500 transition-colors"
          dir="auto"
        >
          {game.name}
        </p>
        <span
          className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            STATUS_CLASSES[game.status] ?? "bg-c-tag text-c-muted"
          }`}
        >
          {statusLabel}
        </span>
      </div>
    </Link>
  );
}
