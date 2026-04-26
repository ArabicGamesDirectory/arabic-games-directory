"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Category = "feedback" | "suggestion" | "bug" | "studio_claim" | "other";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const t = useTranslations("contact");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<Category>("feedback");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const message = String(form.get("message") || "").trim();
    const honeypot = String(form.get("website_url_extra") || "").trim();

    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = t("errorEmailRequired");
    else if (!EMAIL_RE.test(email)) newErrors.email = t("errorEmailInvalid");
    if (!message) newErrors.message = t("errorMessageRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          category,
          message,
          website_url_extra: honeypot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDone({ ok: false, message: data.error || t("errorGeneric") });
      } else {
        formEl.reset();
        setCategory("feedback");
        setDone({ ok: true, message: t("successMessage") });
      }
    } catch {
      setDone({ ok: false, message: t("errorGeneric") });
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (field?: string) =>
    `w-full bg-c-surface border ${
      field && errors[field]
        ? "border-red-500/50 focus:ring-red-500"
        : "border-c-border focus:ring-indigo-500"
    } rounded-lg px-3 py-2 text-sm text-c-text placeholder:text-c-faint focus:outline-none focus:ring-2 focus:border-transparent transition-colors`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-c-muted hover:text-c-text transition-colors">
        {tCommon("backToDirectory")}
      </Link>

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-c-text">{t("title")}</h1>
        <p className="text-c-muted text-sm mt-1">{t("subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="bg-c-surface border border-c-border rounded-xl p-5 space-y-4">
          {/* Honeypot — invisible to humans, bots fill it in */}
          <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
            <label>
              Do not fill this field
              <input
                type="text"
                name="website_url_extra"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>

          <Field label={t("fieldName")}>
            <input
              id="name"
              name="name"
              autoComplete="name"
              className={inputCls("name")}
              placeholder={t("placeholderName")}
            />
          </Field>

          <Field label={t("fieldEmail")} required error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={inputCls("email")}
              placeholder={t("placeholderEmail")}
            />
          </Field>

          <Field label={t("fieldCategory")} required>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={inputCls()}
            >
              <option value="feedback">{t("categoryFeedback")}</option>
              <option value="suggestion">{t("categorySuggestion")}</option>
              <option value="bug">{t("categoryBug")}</option>
              <option value="studio_claim">{t("categoryStudioClaim")}</option>
              <option value="other">{t("categoryOther")}</option>
            </select>
          </Field>

          <Field label={t("fieldMessage")} required error={errors.message}>
            <textarea
              id="message"
              name="message"
              rows={6}
              dir="auto"
              maxLength={2000}
              className={inputCls("message") + " resize-none"}
              placeholder={t("placeholderMessage")}
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
