"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slug";
import { COUNTRY_OPTIONS, COUNTRY_KEY_MAP } from "@/lib/countries";

export type GameData = {
  id: string;
  slug: string;
  name: string;
  developer: string | null;
  country: string[];
  platforms: string[];
  genres: string[];
  gameplay_modes: string[] | null;
  game_engine: string | null;
  monetization: string[] | null;
  short_description: string;
  status: string;
  release_date: string | null;
  website_url: string | null;
  store_links: Record<string, string | null>;
  publishing_type: string | null;
  publisher_name: string | null;
  thumbnail_url: string | null;
};

const PLATFORM_OPTIONS = [
  "iOS",
  "Android",
  "Windows",
  "macOS",
  "Linux",
  "Web",
  "PlayStation",
  "Xbox",
  "Nintendo Switch",
];

// Used for state initialization (no translations needed at this level)
const GENRE_BASE_VALUES = [
  "Action", "Adventure", "Arcade", "Card / Board Game", "Casual",
  "Educational", "Endless Runner", "Family", "Fighting", "Horror", "Idle / Clicker",
  "Made for Kids", "Platformer", "Puzzle", "Racing", "Resource Management", "Rogue-lite",
  "Roguelike", "RPG", "Shooter FPS", "Simulation", "Sports",
  "Strategy", "Tower Defense", "Visual Novel",
];

const ENGINE_OPTIONS = [
  "Unity",
  "Unreal Engine",
  "Godot",
  "GameMaker",
  "GameSalad",
  "Construct",
  "Cocos2d",
  "Custom Engine",
  "Others",
];

const STORE_FIELDS = [
  { id: "steam", label: "Steam", placeholder: "https://store.steampowered.com/app/..." },
  { id: "google_play", label: "Google Play", placeholder: "https://play.google.com/store/apps/..." },
  { id: "app_store", label: "App Store", placeholder: "https://apps.apple.com/..." },
  { id: "playstation", label: "PlayStation", placeholder: "https://store.playstation.com/..." },
  { id: "xbox", label: "Xbox", placeholder: "https://www.xbox.com/games/store/..." },
  { id: "nintendo", label: "Nintendo", placeholder: "https://www.nintendo.com/store/..." },
  { id: "itch", label: "itch.io", placeholder: "https://itch.io/..." },
  { id: "others", label: "Others", placeholder: "Any other store or platform URL" },
] as const;

const STORE_KEY_MAP: Record<string, string> = {
  steam: "Steam",
  google_play: "Google Play",
  app_store: "App Store",
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
  itch: "Itch",
  others: "Others",
};

interface SubmitFormProps {
  /** When provided, the form pre-fills with this data and submits an update. */
  initialData?: GameData;
  /** Back link href. Defaults to "/" (directory). */
  backHref?: string;
}

export function SubmitForm({ initialData, backHref = "/" }: SubmitFormProps) {
  const t = useTranslations("submit");
  const tCommon = useTranslations("common");
  const tCountries = useTranslations("countries");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tGenres = useTranslations("genres");
  const tValidation = useTranslations("validation");

  const isUpdate = !!initialData;

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(null);
  const [studioNames, setStudioNames] = useState<string[]>([]);
  const [developerValue, setDeveloperValue] = useState(initialData?.developer ?? "");
  const [showDeveloperSuggestions, setShowDeveloperSuggestions] = useState(false);
  // Open store links by default when updating a game that already has some
  const [storeLinksOpen, setStoreLinksOpen] = useState(true);
  const [publishingType, setPublishingType] = useState(initialData?.publishing_type ?? "");
  const [genreOtherChecked, setGenreOtherChecked] = useState(
    () => initialData?.genres?.some((g) => g === "Other" || !GENRE_BASE_VALUES.includes(g)) ?? false
  );
  const [genreOtherText, setGenreOtherText] = useState(
    () => initialData?.genres?.find((g) => g !== "Other" && !GENRE_BASE_VALUES.includes(g)) ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialData?.thumbnail_url ?? null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialData?.thumbnail_url ?? null);
  const [thumbnailStatus, setThumbnailStatus] = useState<"idle" | "uploading" | "done" | "error">(
    initialData?.thumbnail_url ? "done" : "idle"
  );
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  function handleThumbnailRemove() {
    setThumbnailUrl(null);
    setThumbnailPreview(null);
    setThumbnailStatus("idle");
    setErrors((prev) => { const next = { ...prev }; delete next.thumbnail; return next; });
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }

  async function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
    if (!ACCEPTED.includes(file.type)) {
      setThumbnailStatus("error");
      setThumbnailPreview(null);
      setThumbnailUrl(null);
      setErrors((prev) => ({ ...prev, thumbnail: t("thumbnailInvalidType") }));
      return;
    }
    if (file.size > 200 * 1024) {
      setThumbnailStatus("error");
      setThumbnailPreview(null);
      setThumbnailUrl(null);
      setErrors((prev) => ({ ...prev, thumbnail: t("thumbnailTooLarge") }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.thumbnail;
      return next;
    });

    // Show local preview immediately
    setThumbnailPreview(URL.createObjectURL(file));
    setThumbnailStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);
    const nameInput = document.getElementById("name") as HTMLInputElement | null;
    const slug = isUpdate ? initialData!.slug : slugify(nameInput?.value || "upload");
    formData.append("slug", slug);

    try {
      const res = await fetch("/api/upload-thumbnail", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setThumbnailUrl(data.url);
      setThumbnailStatus("done");
    } catch {
      setThumbnailStatus("error");
      setErrors((prev) => ({ ...prev, thumbnail: t("thumbnailError") }));
    }
  }

  useEffect(() => {
    supabase
      .from("studios")
      .select("name")
      .order("name")
      .then(({ data }) => {
        if (data) setStudioNames(data.map((s: { name: string }) => s.name));
      });
  }, []);

  const GAMEPLAY_MODE_OPTIONS = [
    { value: "Single Player", label: t("modeSinglePlayer") },
    { value: "Multiplayer", label: t("modeMultiplayer") },
    { value: "Co-op", label: t("modeCoop") },
    { value: "PvP", label: t("modePvP") },
    { value: "MMO", label: t("modeMMO") },
  ];

  const MONETIZATION_OPTIONS = [
    { value: "Free", label: t("monetizationFree") },
    { value: "Premium", label: t("monetizationPremium") },
    { value: "Ads", label: t("monetizationAds") },
    { value: "In-App Purchases", label: t("monetizationIAP") },
    { value: "Subscription", label: t("monetizationSubscription") },
  ];

  const GENRE_OPTIONS_BASE = (
    [
      { value: "Action", key: "action" },
      { value: "Adventure", key: "adventure" },
      { value: "Arcade", key: "arcade" },
      { value: "Card / Board Game", key: "cardBoardGame" },
      { value: "Casual", key: "casual" },
      { value: "Educational", key: "educational" },
      { value: "Endless Runner", key: "endlessRunner" },
      { value: "Family", key: "family" },
      { value: "Fighting", key: "fighting" },
      { value: "Horror", key: "horror" },
      { value: "Idle / Clicker", key: "idleClicker" },
      { value: "Made for Kids", key: "madeForKids" },
      { value: "Platformer", key: "platformer" },
      { value: "Puzzle", key: "puzzle" },
      { value: "Racing", key: "racing" },
      { value: "Resource Management", key: "resourceManagement" },
      { value: "Rogue-lite", key: "rogueLite" },
      { value: "Roguelike", key: "roguelike" },
      { value: "RPG", key: "rpg" },
      { value: "Shooter FPS", key: "shooterFPS" },
      { value: "Simulation", key: "simulation" },
      { value: "Sports", key: "sports" },
      { value: "Strategy", key: "strategy" },
      { value: "Tower Defense", key: "towerDefense" },
      { value: "Visual Novel", key: "visualNovel" },
    ] as const
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map(({ value, key }) => ({ value, label: tGenres(key as any) }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countryOptions = COUNTRY_OPTIONS.map((c) => ({
    value: c,
    label: tCountries(COUNTRY_KEY_MAP[c] as any),
  }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("short_description") || "").trim();
    const countries = form.getAll("country") as string[];
    const baseGenres = form.getAll("genres") as string[];
    const allGenres = genreOtherChecked
      ? [...baseGenres, genreOtherText.trim() || "Other"]
      : baseGenres;
    const platforms = form.getAll("platforms") as string[];
    const gameplayModes = form.getAll("gameplay_modes") as string[];
    const gameEngine = String(form.get("game_engine") || "").trim();
    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = t("errorRequired");
    if (!description) newErrors.short_description = t("errorRequired");
    if (countries.length === 0) newErrors.country = t("countryRequired");
    if (allGenres.length === 0) newErrors.genres = t("genreRequired");
    if (platforms.length === 0) newErrors.platforms = t("platformRequired");
    if (!developerValue.trim()) newErrors.developer = t("errorRequired");
    if (gameplayModes.length === 0) newErrors.gameplay_modes = t("gameplayModesRequired");
    if (!gameEngine) newErrors.game_engine = t("errorRequired");

    // URL validation — optional fields, only validate if non-empty
    const urlFields: [string, string][] = [
      ["website_url", String(form.get("website_url") || "").trim()],
      ["steam", String(form.get("steam") || "").trim()],
      ["google_play", String(form.get("google_play") || "").trim()],
      ["app_store", String(form.get("app_store") || "").trim()],
      ["playstation", String(form.get("playstation") || "").trim()],
      ["xbox", String(form.get("xbox") || "").trim()],
      ["nintendo", String(form.get("nintendo") || "").trim()],
      ["itch", String(form.get("itch") || "").trim()],
      ["others", String(form.get("others") || "").trim()],
    ];
    for (const [field, value] of urlFields) {
      if (value) {
        try {
          new URL(value);
        } catch {
          newErrors[field] = tValidation("invalidUrl");
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    const payload = {
      name,
      // For updates, preserve the existing slug so URLs don't break.
      slug: isUpdate ? initialData!.slug : slugify(name),
      developer: String(form.get("developer") || "").trim() || null,
      country: countries,
      platforms,
      genres: allGenres,
      gameplay_modes: form.getAll("gameplay_modes") as string[],
      game_engine: String(form.get("game_engine") || "").trim() || null,
      monetization: form.getAll("monetization") as string[],
      short_description: String(form.get("short_description") || "").trim(),
      status: String(form.get("status") || "announced"),
      release_date: String(form.get("release_date") || "").trim() || null,
      website_url: String(form.get("website_url") || "").trim() || null,
      publishing_type: publishingType || null,
      publisher_name: publishingType === "with_publisher" ? String(form.get("publisher_name") || "").trim() || null : null,
      store_links: {
        Steam: String(form.get("steam") || "").trim() || null,
        "Google Play": String(form.get("google_play") || "").trim() || null,
        "App Store": String(form.get("app_store") || "").trim() || null,
        Itch: String(form.get("itch") || "").trim() || null,
        Others: String(form.get("others") || "").trim() || null,
        PlayStation: String(form.get("playstation") || "").trim() || null,
        Xbox: String(form.get("xbox") || "").trim() || null,
        Nintendo: String(form.get("nintendo") || "").trim() || null,
      },
      thumbnail_url: thumbnailUrl,
    };

    const { error } = await supabase.from("submissions").insert({
      payload,
      moderation_status: "pending",
      // Link to existing game when this is an update submission.
      ...(isUpdate && { game_id: initialData!.id }),
    });

    setLoading(false);

    if (error) {
      setDone({ ok: false, message: "Error: " + error.message });
      return;
    }

    // Auto-submit a studio entry if the developer name isn't already in the directory.
    const developerName = payload.developer;
    if (
      !isUpdate &&
      developerName &&
      !studioNames.some((n) => n.toLowerCase() === developerName.toLowerCase())
    ) {
      const { error: studioError } = await supabase.from("studio_submissions").insert({
        payload: {
          name: developerName,
          slug: slugify(developerName),
          type: "unspecified",
          description: null,
          country: countries,
          website_url: null,
        },
        moderation_status: "pending",
      });
      if (studioError) {
        console.error("Studio auto-submit failed:", studioError.message);
      }
    }

    formEl.reset();
    setDeveloperValue("");
    setGenreOtherChecked(false);
    setGenreOtherText("");
    setStoreLinksOpen(false);
    setThumbnailUrl(null);
    setThumbnailPreview(null);
    setThumbnailStatus("idle");
    setDone({
      ok: true,
      message: isUpdate ? t("updateSuccessMessage") : t("successMessage"),
    });
  }

  const inputCls = (field?: string) =>
    `w-full bg-c-surface border ${
      field && errors[field]
        ? "border-red-500/50 focus:ring-red-500"
        : "border-c-border focus:ring-indigo-500"
    } rounded-lg px-3 py-2 text-sm text-c-text placeholder:text-c-faint focus:outline-none focus:ring-2 focus:border-transparent transition-colors`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <Link href={backHref} className="text-sm text-c-muted hover:text-c-text transition-colors">
        {isUpdate ? tCommon("backToItem", { name: initialData!.name }) : tCommon("backToDirectory")}
      </Link>

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-c-text">
          {isUpdate ? t("updateTitle") : t("title")}
        </h1>
        <p className="text-c-muted text-sm mt-1">
          {isUpdate ? t("updateSubtitle") : t("subtitle")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Game info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionGameInfo")}
          </h2>

          <Field label={t("fieldThumbnail")} error={errors.thumbnail}>
            <input
              ref={thumbnailInputRef}
              type="file"
              id="thumbnail-upload-game"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleThumbnailChange}
              className="sr-only"
            />
            {thumbnailPreview ? (
              <div className="relative aspect-[460/215] w-full overflow-hidden rounded-lg">
                <img
                  src={thumbnailPreview}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {thumbnailStatus === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-c-bg/60 rounded-lg">
                    <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleThumbnailRemove}
                  className="absolute top-2 end-2 bg-c-bg/80 hover:bg-c-bg text-c-soft hover:text-c-text rounded-full w-7 h-7 flex items-center justify-center transition-colors text-base leading-none"
                  aria-label="Remove thumbnail"
                >
                  ×
                </button>
              </div>
            ) : (
              <label
                htmlFor="thumbnail-upload-game"
                className={`flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  errors.thumbnail
                    ? "border-red-500/50"
                    : "border-c-border hover:border-c-border-hover hover:bg-c-surface"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-c-faint mb-3">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                <p className="text-sm text-c-soft">{t("thumbnailClickToUpload")}</p>
                <p className="text-xs text-c-faint mt-1">{t("thumbnailHint")}</p>
              </label>
            )}
          </Field>

          <Field label={t("fieldGameName")} required error={errors.name}>
            <input
              id="name"
              name="name"
              defaultValue={initialData?.name}
              className={inputCls("name")}
              placeholder={t("placeholderGameName")}
            />
          </Field>

          <Field label={t("fieldDeveloper")} required error={errors.developer}>
            <div className="relative">
              <input
                id="developer"
                name="developer"
                value={developerValue}
                onChange={(e) => setDeveloperValue(e.target.value)}
                onFocus={() => setShowDeveloperSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDeveloperSuggestions(false), 150)}
                autoComplete="off"
                className={inputCls("developer")}
                placeholder={t("placeholderDeveloper")}
              />
              {showDeveloperSuggestions && studioNames.filter((n) =>
                n.toLowerCase().includes(developerValue.toLowerCase())
              ).length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-c-surface border border-c-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {studioNames
                    .filter((n) => n.toLowerCase().includes(developerValue.toLowerCase()))
                    .slice(0, 8)
                    .map((name) => (
                      <li
                        key={name}
                        onMouseDown={() => {
                          setDeveloperValue(name);
                          setShowDeveloperSuggestions(false);
                        }}
                        className="px-3 py-2 text-sm text-c-text hover:bg-c-bg cursor-pointer"
                      >
                        {name}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </Field>

          <Field label={t("fieldPublishing")}>
            <select
              name="publishing_type"
              value={publishingType}
              onChange={(e) => setPublishingType(e.target.value)}
              className={inputCls()}
            >
              <option value="">{t("publishingUnknown")}</option>
              <option value="self_published">{t("publishingSelf")}</option>
              <option value="with_publisher">{t("publishingWith")}</option>
            </select>
          </Field>

          {publishingType === "with_publisher" && (
            <Field label={t("fieldPublisherName")}>
              <input
                name="publisher_name"
                defaultValue={initialData?.publisher_name ?? ""}
                className={inputCls()}
                placeholder={t("placeholderPublisherName")}
              />
            </Field>
          )}

          <Field label={t("fieldCountry")} required error={errors.country}>
            <CheckboxGroup
              name="country"
              options={countryOptions}
              initialValues={initialData?.country}
              grid3
            />
          </Field>

          <Field label={t("fieldDescription")} required error={errors.short_description}>
            <textarea
              id="short_description"
              name="short_description"
              rows={4}
              dir="auto"
              defaultValue={initialData?.short_description}
              className={inputCls("short_description") + " resize-none"}
              placeholder={t("placeholderDescription")}
            />
          </Field>

          <Field label={t("fieldGenres")} required error={errors.genres}>
            <CheckboxGroup
              name="genres"
              options={GENRE_OPTIONS_BASE}
              initialValues={initialData?.genres?.filter((g) => GENRE_BASE_VALUES.includes(g))}
            />
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-1.5 bg-c-bg border border-c-border rounded-lg px-3 py-1.5 text-sm text-c-soft cursor-pointer hover:border-c-border-hover has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-colors select-none w-fit">
                <input
                  type="checkbox"
                  checked={genreOtherChecked}
                  onChange={(e) => setGenreOtherChecked(e.target.checked)}
                  className="sr-only"
                />
                {tGenres("other")}
              </label>
              {genreOtherChecked && (
                <input
                  type="text"
                  value={genreOtherText}
                  onChange={(e) => setGenreOtherText(e.target.value)}
                  className={inputCls()}
                  placeholder={t("placeholderGenreOther")}
                />
              )}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("fieldStatus")}>
              <select
                id="status"
                name="status"
                defaultValue={initialData?.status ?? "announced"}
                className={inputCls()}
              >
                <option value="announced">{t("statusAnnounced")}</option>
                <option value="in_dev">{t("statusInDev")}</option>
                <option value="prototype">{t("statusPrototype")}</option>
                <option value="early_access">{t("statusEarlyAccess")}</option>
                <option value="released">{t("statusReleased")}</option>
                <option value="on_hold">{t("statusOnHold")}</option>
                <option value="cancelled">{t("statusCancelled")}</option>
                <option value="delisted">{t("statusDelisted")}</option>
              </select>
            </Field>

            <Field label={t("fieldReleaseDate")}>
              <input
                id="release_date"
                name="release_date"
                type="date"
                defaultValue={isUpdate ? (initialData?.release_date ?? "") : ""}
                className={inputCls()}
              />
            </Field>
          </div>

          <Field label={t("fieldWebsiteUrl")} error={errors.website_url}>
            <input
              id="website_url"
              name="website_url"
              defaultValue={initialData?.website_url ?? ""}
              className={inputCls("website_url")}
              placeholder={t("placeholderWebsiteUrl")}
            />
          </Field>
        </div>

        {/* Platforms, modes, engine, monetization */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-5">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionPlatformDetails")}
          </h2>

          <Field label={t("fieldPlatforms")} required error={errors.platforms}>
            <CheckboxGroup
              name="platforms"
              options={PLATFORM_OPTIONS.map((v) => ({ value: v, label: v }))}
              initialValues={initialData?.platforms}
            />
          </Field>

          <Field label={t("fieldGameplayModes")} required error={errors.gameplay_modes}>
            <CheckboxGroup
              name="gameplay_modes"
              options={GAMEPLAY_MODE_OPTIONS}
              initialValues={initialData?.gameplay_modes ?? undefined}
            />
          </Field>

          <Field label={t("fieldGameEngine")} required error={errors.game_engine}>
            <input
              name="game_engine"
              list="engine-options"
              defaultValue={initialData?.game_engine ?? ""}
              className={inputCls("game_engine")}
              placeholder={t("placeholderGameEngine")}
            />
            <datalist id="engine-options">
              {ENGINE_OPTIONS.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </Field>

          <Field label={t("fieldMonetization")}>
            <CheckboxGroup
              name="monetization"
              options={MONETIZATION_OPTIONS}
              initialValues={initialData?.monetization ?? undefined}
            />
          </Field>
        </div>

        {/* Store links — collapsible */}
        <div className="bg-c-surface border border-c-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setStoreLinksOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 text-start"
          >
            <span className="text-xs font-semibold text-c-faint uppercase tracking-wider">
              {t("sectionStoreLinks")}{" "}
              <span className="font-normal normal-case">{t("optional")}</span>
            </span>
            <span className="text-c-faint text-sm">{storeLinksOpen ? "↑" : "↓"}</span>
          </button>

          {storeLinksOpen && (
            <div className="px-5 pb-5 space-y-4 border-t border-c-border pt-4">
              {STORE_FIELDS.map(({ id, label, placeholder }) => (
                <Field key={id} label={label} error={errors[id]}>
                  <input
                    id={id}
                    name={id}
                    defaultValue={initialData?.store_links?.[STORE_KEY_MAP[id]] ?? ""}
                    className={inputCls(id)}
                    placeholder={placeholder}
                  />
                </Field>
              ))}
            </div>
          )}
        </div>

        {done && (
          <div
            className={`p-4 rounded-lg text-sm border ${
              done.ok
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-red-500/10 text-red-600 border-red-500/20"
            }`}
          >
            {done.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading
            ? t("submittingButton")
            : isUpdate
            ? t("updateButton")
            : t("submitButton")}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-c-soft">
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
        {hint && <span className="text-c-faint font-normal ms-1">— {hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CheckboxGroup({
  name,
  options,
  initialValues,
  grid3,
}: {
  name: string;
  options: { value: string; label: string }[];
  initialValues?: string[];
  grid3?: boolean;
}) {
  return (
    <div className={grid3 ? "grid grid-cols-3 gap-2" : "flex flex-wrap gap-2"}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-1.5 min-w-0 bg-c-bg border border-c-border rounded-lg px-3 py-1.5 text-sm text-c-soft cursor-pointer hover:border-c-border-hover has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-colors select-none"
        >
          <input
            type="checkbox"
            name={name}
            value={opt.value}
            defaultChecked={initialValues?.includes(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
