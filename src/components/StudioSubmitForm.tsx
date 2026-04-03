"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slug";
import { COUNTRY_OPTIONS, COUNTRY_KEY_MAP } from "@/lib/countries";

export type StudioData = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  country: string[];
  website_url: string | null;
  thumbnail_url: string | null;
};

interface StudioSubmitFormProps {
  initialData?: StudioData;
  backHref?: string;
}

export function StudioSubmitForm({ initialData, backHref = "/" }: StudioSubmitFormProps) {
  const t = useTranslations("studio");
  const tCommon = useTranslations("common");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tCountries = useTranslations("countries") as any;

  const isUpdate = !!initialData;

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitterName, setSubmitterName] = useState(() =>
    !isUpdate && typeof window !== "undefined" ? localStorage.getItem("submitter_name") ?? "" : ""
  );
  const [submitterEmail, setSubmitterEmail] = useState(() =>
    !isUpdate && typeof window !== "undefined" ? localStorage.getItem("submitter_email") ?? "" : ""
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialData?.thumbnail_url ?? null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialData?.thumbnail_url ?? null);
  const [thumbnailStatus, setThumbnailStatus] = useState<"idle" | "uploading" | "done" | "error">(
    initialData?.thumbnail_url ? "done" : "idle"
  );

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
    if (file.size > 150 * 1024) {
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") || "").trim();
    const countries = form.getAll("country") as string[];
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = t("errorRequired");
    if (countries.length === 0) newErrors.country = t("countryRequired");
    if (!submitterName.trim()) newErrors.submitter_name = t("errorRequired");
    if (!submitterEmail.trim()) newErrors.submitter_email = t("errorRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    const payload = {
      name,
      // Preserve slug on updates so URLs don't break.
      slug: isUpdate ? initialData!.slug : slugify(name),
      type: String(form.get("type") || "studio"),
      description: String(form.get("description") || "").trim() || null,
      country: countries,
      website_url: String(form.get("website_url") || "").trim() || null,
      thumbnail_url: thumbnailUrl,
    };

    const submitter_name = submitterName.trim() || null;
    const submitter_email = submitterEmail.trim() || null;

    const { error } = await supabase.from("studio_submissions").insert({
      submitter_name,
      submitter_email,
      payload,
      moderation_status: "pending",
      ...(isUpdate && { studio_id: initialData!.id }),
    });

    setLoading(false);

    if (error) {
      setDone({ ok: false, message: "Error: " + error.message });
      return;
    }

    localStorage.setItem("submitter_name", submitter_name ?? "");
    localStorage.setItem("submitter_email", submitter_email ?? "");
    formEl.reset();
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
        {tCommon("backToDirectory")}
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
        {/* Studio info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionStudioInfo")}
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
              defaultValue={initialData?.type ?? "studio"}
              className={inputCls()}
            >
              <option value="individual">{t("typeIndividual")}</option>
              <option value="team">{t("typeTeam")}</option>
              <option value="studio">{t("typeStudio")}</option>
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
            />
          </Field>

          <Field label={t("fieldWebsiteUrl")}>
            <input
              id="website_url"
              name="website_url"
              type="url"
              defaultValue={initialData?.website_url ?? ""}
              className={inputCls()}
              placeholder={t("placeholderWebsiteUrl")}
            />
          </Field>

          <Field label={t("fieldThumbnail")} error={errors.thumbnail}>
            <div className="flex items-start gap-4">
              {thumbnailPreview && (
                <img
                  src={thumbnailPreview}
                  alt=""
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-lg object-cover border border-c-border"
                />
              )}
              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleThumbnailChange}
                  className="block w-full text-sm text-c-soft file:me-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-c-tag file:text-c-tag-text hover:file:bg-c-border file:cursor-pointer file:transition-colors"
                />
                <p className="text-xs text-c-faint">{t("thumbnailHint")}</p>
                {thumbnailStatus === "uploading" && (
                  <p className="text-xs text-amber-500">{t("thumbnailUploading")}</p>
                )}
                {thumbnailStatus === "done" && (
                  <p className="text-xs text-emerald-500">{t("thumbnailDone")}</p>
                )}
              </div>
            </div>
          </Field>
        </div>

        {/* Submitter info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionYourInfo")}
          </h2>

          <Field label={t("fieldSubmitterName")} required error={errors.submitter_name}>
            <input
              id="submitter_name"
              name="submitter_name"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              className={inputCls("submitter_name")}
              placeholder={t("placeholderSubmitterName")}
            />
          </Field>

          <Field label={t("fieldSubmitterEmail")} required error={errors.submitter_email}>
            <input
              id="submitter_email"
              name="submitter_email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              className={inputCls("submitter_email")}
              placeholder={t("placeholderSubmitterEmail")}
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
}: {
  name: string;
  options: { value: string; label: string }[];
  initialValues?: string[];
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
            defaultChecked={initialValues?.includes(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
