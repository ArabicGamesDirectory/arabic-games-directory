"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slug";
import { COUNTRY_OPTIONS, COUNTRY_KEY_MAP } from "@/lib/countries";
import { COMMUNITY_TOPIC_VALUES } from "@/lib/communityTopics";

export type CommunityData = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  country: string[];
  website_url: string | null;
  social_links: Record<string, string | null> | null;
  topics: string[] | null;
  thumbnail_url: string | null;
};

// Pulled from @/lib/communityTopics so the homepage filter shares the same source.
const TOPIC_BASE_VALUES: readonly string[] = COMMUNITY_TOPIC_VALUES;

const SOCIAL_LINK_KEYS = [
  "Discord",
  "Telegram",
  "WhatsApp",
  "Reddit",
  "Facebook",
  "X (Twitter)",
  "YouTube",
  "Twitch",
  "Instagram",
  "Others",
] as const;

interface CommunitySubmitFormProps {
  initialData?: CommunityData;
  backHref?: string;
}

export function CommunitySubmitForm({ initialData, backHref = "/?tab=communities" }: CommunitySubmitFormProps) {
  const t = useTranslations("community");
  const tCommon = useTranslations("common");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tCountries = useTranslations("countries") as any;
  const tValidation = useTranslations("validation");

  const isUpdate = !!initialData;

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [topicOtherChecked, setTopicOtherChecked] = useState(
    !!initialData?.topics?.some((t) => !TOPIC_BASE_VALUES.includes(t))
  );
  const [topicOtherText, setTopicOtherText] = useState(
    initialData?.topics?.find((t) => !TOPIC_BASE_VALUES.includes(t)) ?? ""
  );

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

  const countryOptions = COUNTRY_OPTIONS.map((c) => ({
    value: c,
    label: tCountries(COUNTRY_KEY_MAP[c]),
  }));

  const topicOptions = TOPIC_BASE_VALUES.map((v) => ({
    value: v,
    label: t(topicI18nKey(v)),
  }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") || "").trim();
    const countries = form.getAll("country") as string[];
    const baseTopics = form.getAll("topics") as string[];
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = t("errorRequired");
    if (countries.length === 0) newErrors.country = t("countryRequired");

    // URL validation — optional, only validate if non-empty
    const websiteUrl = String(form.get("website_url") || "").trim();
    if (websiteUrl) {
      try {
        new URL(websiteUrl);
      } catch {
        newErrors.website_url = tValidation("invalidUrl");
      }
    }

    // Social links — gather + validate non-empty entries
    const socialLinks: Record<string, string | null> = {};
    for (const key of SOCIAL_LINK_KEYS) {
      const fieldName = socialLinkFieldName(key);
      const value = String(form.get(fieldName) || "").trim();
      if (value) {
        try {
          new URL(value);
          socialLinks[key] = value;
        } catch {
          newErrors[fieldName] = tValidation("invalidUrl");
        }
      } else {
        socialLinks[key] = null;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    // Topics: combine checkboxes + optional "Other" custom text
    const topics = [...baseTopics];
    if (topicOtherChecked) {
      const otherText = topicOtherText.trim();
      topics.push(otherText || "Other");
    }

    const payload = {
      name,
      slug: isUpdate ? initialData!.slug : slugify(name),
      type: String(form.get("type") || "online"),
      description: String(form.get("description") || "").trim() || null,
      country: countries,
      website_url: websiteUrl || null,
      social_links: socialLinks,
      topics,
      thumbnail_url: thumbnailUrl,
    };

    const { error } = await supabase.from("community_submissions").insert({
      payload,
      moderation_status: "pending",
      ...(isUpdate && { community_id: initialData!.id }),
    });

    setLoading(false);

    if (error) {
      setDone({ ok: false, message: "Error: " + error.message });
      return;
    }

    // Fire-and-forget Discord webhook ping for the admin.
    fetch("/api/notify-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "community",
        name,
        country: countries,
        isUpdate,
      }),
    }).catch(() => {});

    formEl.reset();
    setTopicOtherChecked(false);
    setTopicOtherText("");
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
          {isUpdate ? t("updateTitle") : t("submitTitle")}
        </h1>
        <p className="text-c-muted text-sm mt-1">
          {isUpdate ? t("updateSubtitle") : t("submitSubtitle")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Community info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionCommunityInfo")}
          </h2>

          <Field label={t("fieldName")} required error={errors.name}>
            <input
              id="name"
              name="name"
              defaultValue={initialData?.name}
              className={inputCls("name")}
              placeholder={t("placeholderName")}
            />
          </Field>

          <Field label={t("fieldType")} required>
            <select
              id="type"
              name="type"
              defaultValue={initialData?.type ?? "online"}
              className={inputCls()}
            >
              <option value="online">{t("typeOnline")}</option>
              <option value="in_person">{t("typeInPerson")}</option>
              <option value="hybrid">{t("typeHybrid")}</option>
            </select>
          </Field>

          <Field label={t("fieldDescription")}>
            <textarea
              id="description"
              name="description"
              rows={3}
              dir="auto"
              defaultValue={initialData?.description ?? ""}
              className={inputCls() + " resize-none"}
              placeholder={t("placeholderDescription")}
            />
          </Field>

          <Field label={t("fieldCountry")} required error={errors.country}>
            <CheckboxGroup
              name="country"
              options={countryOptions}
              initialValues={initialData?.country}
              grid3
            />
          </Field>

          <Field label={t("fieldTopics")}>
            <CheckboxGroup
              name="topics"
              options={topicOptions}
              initialValues={initialData?.topics?.filter((v) => TOPIC_BASE_VALUES.includes(v))}
            />
            <div className="mt-2 space-y-2">
              <label className="inline-flex items-center gap-1.5 bg-c-bg border border-c-border rounded-lg px-3 py-1.5 text-sm text-c-soft cursor-pointer hover:border-c-border-hover has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-colors select-none">
                <input
                  type="checkbox"
                  checked={topicOtherChecked}
                  onChange={(e) => setTopicOtherChecked(e.target.checked)}
                  className="sr-only"
                />
                {t("topicOther")}
              </label>
              {topicOtherChecked && (
                <input
                  type="text"
                  value={topicOtherText}
                  onChange={(e) => setTopicOtherText(e.target.value)}
                  className={inputCls()}
                  placeholder={t("placeholderTopicOther")}
                />
              )}
            </div>
          </Field>

          <Field label={t("fieldWebsiteUrl")} error={errors.website_url}>
            <input
              id="website_url"
              name="website_url"
              defaultValue={initialData?.website_url ?? ""}
              className={inputCls("website_url")}
              placeholder={t("placeholderWebsiteUrl")}
            />
          </Field>

          <Field label={t("fieldThumbnail")} error={errors.thumbnail}>
            <input
              ref={thumbnailInputRef}
              type="file"
              id="thumbnail-upload-community"
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
                htmlFor="thumbnail-upload-community"
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
        </div>

        {/* Social / community links */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionSocialLinks")}
          </h2>
          <p className="text-xs text-c-faint -mt-2">{t("socialLinksHint")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SOCIAL_LINK_KEYS.map((key) => {
              const fieldName = socialLinkFieldName(key);
              return (
                <Field key={key} label={key} error={errors[fieldName]}>
                  <input
                    name={fieldName}
                    defaultValue={initialData?.social_links?.[key] ?? ""}
                    className={inputCls(fieldName)}
                    placeholder="https://..."
                  />
                </Field>
              );
            })}
          </div>
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

function topicI18nKey(value: string): "topicGameDevelopment" | "topicGameProgramming" | "topicGameArt" | "topicGameDesign" {
  switch (value) {
    case "Game Development": return "topicGameDevelopment";
    case "Game Programming": return "topicGameProgramming";
    case "Game Art": return "topicGameArt";
    case "Game Design": return "topicGameDesign";
    default: return "topicGameDevelopment";
  }
}

function socialLinkFieldName(key: string): string {
  return "social_" + key.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-c-soft">
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
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
