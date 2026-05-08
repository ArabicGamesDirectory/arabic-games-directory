import { Link } from "@/i18n/navigation";

// FilterPill renders a tag/pill that, when clicked, navigates to the homepage
// with a single filter param applied (e.g. clicking "Action" → "/?genre=Action").
// Used on game cards and game/studio/community detail pages so visual tags
// double as shortcuts into the filtered directory listing. Locale prefix is
// handled by next-intl's Link.
//
// `param` must match a query key the homepage knows about. For game-related
// pills: status, country, platform, genre — leave `tab` unset (games is the
// default tab). For studios pass `tab="studios"` with `studioType` /
// `studioCountry`; for communities pass `tab="communities"` with `communityType`
// / `communityTopic` / `communityCountry`.
export default function FilterPill({
  param,
  value,
  tab,
  className,
  children,
}: {
  param: string;
  value: string;
  tab?: "studios" | "communities";
  className: string;
  children: React.ReactNode;
}) {
  const href = tab
    ? `/?tab=${tab}&${param}=${encodeURIComponent(value)}`
    : `/?${param}=${encodeURIComponent(value)}`;
  return (
    <Link
      href={href}
      className={`${className} hover:opacity-80 transition-opacity`}
    >
      {children}
    </Link>
  );
}
