"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slug";
import { COUNTRY_OPTIONS, COUNTRY_KEY_MAP } from "@/lib/countries";

export function StudioSubmitForm() {
  const t = useTranslations("studio");
  const tCommon = useTranslations("common");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tCountries = useTranslations("countries") as any;

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(null);

  const countryOptions = COUNTRY_OPTIONS.map((c) => ({
    value: c,
    label: tCountries(COUNTRY_KEY_MAP[c]),
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
      type: String(form.get("type") || "studio"),
      description: String(form.get("description") || "").trim() || null,
      country: countries,
      website_url: String(form.get("website_url") || "").trim() || null,
    };

    const submitter_name = String(form.get("submitter_name") || "").trim() || null;
    const submitter_email = String(form.get("submitter_email") || "").trim() || null;

    const { error } = await supabase.from("studio_submissions").insert({
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
      <Link href="/" className="text-sm text-c-muted hover:text-c-text transition-colors">
        {tCommon("backToDirectory")}
      </Link>

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-c-text">
          {t("submitTitle")}
        </h1>
        <p className="text-c-muted text-sm mt-1">{t("submitSubtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Studio info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionStudioInfo")}
          </h2>

          <Field label={t("fieldName")} required>
            <input
              id="name"
              name="name"
              required
              className={inputClass}
              placeholder={t("placeholderName")}
            />
          </Field>

          <Field label={t("fieldType")} required>
            <select id="type" name="type" required className={inputClass} defaultValue="studio">
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
              className={inputClass + " resize-none"}
              placeholder={t("placeholderDescription")}
            />
          </Field>

          <Field label={t("fieldCountry")} required>
            <CheckboxGroup name="country" options={countryOptions} />
          </Field>

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

        {/* Submitter info */}
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider">
            {t("sectionYourInfo")}{" "}
            <span className="font-normal normal-case text-c-faint">{t("optional")}</span>
          </h2>

          <Field label={t("fieldSubmitterName")}>
            <input
              id="submitter_name"
              name="submitter_name"
              className={inputClass}
              placeholder={t("placeholderSubmitterName")}
            />
          </Field>

          <Field label={t("fieldSubmitterEmail")}>
            <input
              id="submitter_email"
              name="submitter_email"
              type="email"
              className={inputClass}
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
          {loading ? t("submittingButton") : t("submitButton")}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-c-soft">
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
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
