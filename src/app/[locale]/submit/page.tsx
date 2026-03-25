"use client";

// TODO: Run this migration in the Supabase SQL editor before deploying:
//
// ALTER TABLE games ALTER COLUMN country TYPE text[] USING ARRAY[country];
//
// This converts existing single-country strings to single-element arrays.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slug";
import { COUNTRY_OPTIONS, COUNTRY_KEY_MAP } from "@/lib/countries";

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

const ENGINE_OPTIONS = [
  "Unity",
  "Unreal Engine",
  "Godot",
  "GameMaker",
  "Cocos2d",
  "LibGDX",
  "Custom Engine",
];

export default function SubmitPage() {
  const t = useTranslations("submit");
  const tCommon = useTranslations("common");
  const tCountries = useTranslations("countries");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(
    null
  );

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countryOptions = COUNTRY_OPTIONS.map((c) => ({
    value: c,
    label: tCountries(COUNTRY_KEY_MAP[c] as any),
  }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setDone(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") || "").trim();
    const countries = form.getAll("country") as string[];

    if (countries.length === 0) {
      setDone({ ok: false, message: t("countryRequired") });
      setLoading(false);
      return;
    }

    const payload = {
      name,
      slug: slugify(name),
      developer: String(form.get("developer") || "").trim() || null,
      country: countries,
      platforms: form.getAll("platforms") as string[],
      genres: String(form.get("genres") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      gameplay_modes: form.getAll("gameplay_modes") as string[],
      game_engine: String(form.get("game_engine") || "").trim() || null,
      monetization: form.getAll("monetization") as string[],
      short_description: String(form.get("short_description") || "").trim(),
      status: String(form.get("status") || "announced"),
      release_date: String(form.get("release_date") || "").trim() || null,
      website_url: String(form.get("website_url") || "").trim() || null,
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
    };

    const submitter_name =
      String(form.get("submitter_name") || "").trim() || null;
    const submitter_email =
      String(form.get("submitter_email") || "").trim() || null;

    const { error } = await supabase.from("submissions").insert({
      submitter_name,
      submitter_email,
      payload,
      moderation_status: "pending",
    });

    setLoading(false);

    if (error) {
      setDone({ ok: false, message: "Error: " + error.message });
      return;
    }

    formEl.reset();
    setDone({ ok: true, message: t("successMessage") });
  }

  const inputClass =
    "w-full bg-c-surface border border-c-border rounded-lg px-3 py-2 text-sm text-c-text placeholder:text-c-faint focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <Link
        href="/"
        className="text-sm text-c-muted hover:text-c-text transition-colors"
      >
        {tCommon("backToDirectory")}
      </Link>

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-c-text">
          {t("title")}
        </h1>
        <p className="text-c-muted text-sm mt-1">{t("subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Game info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionGameInfo")}
          </h2>

          <Field label={t("fieldGameName")} required>
            <input
              id="name"
              name="name"
              required
              className={inputClass}
              placeholder={t("placeholderGameName")}
            />
          </Field>

          <Field label={t("fieldDeveloper")}>
            <input
              id="developer"
              name="developer"
              className={inputClass}
              placeholder={t("placeholderDeveloper")}
            />
          </Field>

          <Field label={t("fieldCountry")} required>
            <CheckboxGroup name="country" options={countryOptions} />
          </Field>

          <Field label={t("fieldDescription")} required>
            <textarea
              id="short_description"
              name="short_description"
              required
              rows={4}
              className={inputClass + " resize-none"}
              placeholder={t("placeholderDescription")}
            />
          </Field>

          <Field
            label={t("fieldGenres")}
            required
            hint={t("fieldGenresHint")}
          >
            <input
              id="genres"
              name="genres"
              required
              className={inputClass}
              placeholder={t("placeholderGenres")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("fieldStatus")}>
              <select
                id="status"
                name="status"
                defaultValue="announced"
                className={inputClass}
              >
                <option value="announced">{t("statusAnnounced")}</option>
                <option value="in_dev">{t("statusInDev")}</option>
                <option value="early_access">{t("statusEarlyAccess")}</option>
                <option value="released">{t("statusReleased")}</option>
                <option value="cancelled">{t("statusCancelled")}</option>
              </select>
            </Field>

            <Field label={t("fieldReleaseDate")}>
              <input
                id="release_date"
                name="release_date"
                type="date"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label={t("fieldWebsiteUrl")}>
            <input
              id="website_url"
              name="website_url"
              type="url"
              className={inputClass}
              placeholder={t("placeholderWebsiteUrl")}
            />
          </Field>
        </div>

        {/* Platforms, modes, engine, monetization */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-5">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionPlatformDetails")}
          </h2>

          <Field label={t("fieldPlatforms")} required>
            <CheckboxGroup
              name="platforms"
              options={PLATFORM_OPTIONS.map((v) => ({ value: v, label: v }))}
            />
          </Field>

          <Field label={t("fieldGameplayModes")}>
            <CheckboxGroup name="gameplay_modes" options={GAMEPLAY_MODE_OPTIONS} />
          </Field>

          <Field label={t("fieldGameEngine")}>
            <input
              name="game_engine"
              list="engine-options"
              className={inputClass}
              placeholder={t("placeholderGameEngine")}
            />
            <datalist id="engine-options">
              {ENGINE_OPTIONS.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </Field>

          <Field label={t("fieldMonetization")}>
            <CheckboxGroup name="monetization" options={MONETIZATION_OPTIONS} />
          </Field>
        </div>

        {/* Store links */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionStoreLinks")}{" "}
            <span className="font-normal normal-case text-c-faint">
              {t("optional")}
            </span>
          </h2>

          {[
            {
              id: "steam",
              label: "Steam",
              placeholder: "https://store.steampowered.com/app/...",
            },
            {
              id: "google_play",
              label: "Google Play",
              placeholder: "https://play.google.com/store/apps/...",
            },
            {
              id: "app_store",
              label: "App Store",
              placeholder: "https://apps.apple.com/...",
            },
            {
              id: "playstation",
              label: "PlayStation",
              placeholder: "https://store.playstation.com/...",
            },
            {
              id: "xbox",
              label: "Xbox",
              placeholder: "https://www.xbox.com/games/store/...",
            },
            {
              id: "nintendo",
              label: "Nintendo",
              placeholder: "https://www.nintendo.com/store/...",
            },
            {
              id: "itch",
              label: "itch.io",
              placeholder: "https://itch.io/...",
            },
            {
              id: "others",
              label: "Others",
              placeholder: "Any other store or platform URL",
            },
          ].map(({ id, label, placeholder }) => (
            <Field key={id} label={label}>
              <input
                id={id}
                name={id}
                type="url"
                className={inputClass}
                placeholder={placeholder}
              />
            </Field>
          ))}
        </div>

        {/* Submitter info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionYourInfo")}{" "}
            <span className="font-normal normal-case text-c-faint">
              {t("optional")}
            </span>
          </h2>

          <Field label={t("fieldName")}>
            <input
              id="submitter_name"
              name="submitter_name"
              className={inputClass}
              placeholder={t("placeholderName")}
            />
          </Field>

          <Field label={t("fieldEmail")}>
            <input
              id="submitter_email"
              name="submitter_email"
              type="email"
              className={inputClass}
              placeholder={t("placeholderEmail")}
            />
          </Field>
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
          {loading ? t("submittingButton") : t("submitButton")}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-c-soft">
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
        {hint && (
          <span className="text-c-faint font-normal ms-1">— {hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

function CheckboxGroup({
  name,
  options,
}: {
  name: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-1.5 bg-c-bg border border-c-border rounded-lg px-3 py-1.5 text-sm text-c-soft cursor-pointer hover:border-c-border-hover has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-colors select-none"
        >
          <input
            type="checkbox"
            name={name}
            value={opt.value}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
