import { Link } from "@/i18n/navigation";

// FilterPill renders a tag/pill that, when clicked, navigates to the homepage
// with a single filter param applied (e.g. clicking "Action" → "/?genre=Action").
// Used on game cards and game/studio detail pages so visual tags double as
// shortcuts into the filtered directory listing. Locale prefix is handled by
// next-intl's Link.
//
// `param` must match a query key the homepage knows about — for game-related
// pills: status, country, platform, genre. Studio/community tabs use different
// param names and are intentionally not wrapped here yet.
export default function FilterPill({
  param,
  value,
  className,
  children,
}: {
  param: string;
  value: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/?${param}=${encodeURIComponent(value)}`}
      className={`${className} hover:opacity-80 transition-opacity`}
    >
      {children}
    </Link>
  );
}
