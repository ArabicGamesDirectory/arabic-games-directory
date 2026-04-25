"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ChangeEvent } from "react";

export default function SortSelect({
  paramName,
  pageParamName,
  current,
  options,
  label,
}: {
  paramName: "sort" | "studiosSort";
  pageParamName: "page" | "studiosPage";
  current: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, e.target.value);
    params.delete(pageParamName);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-xs text-c-faint">{label}</span>
      <select
        value={current}
        onChange={onChange}
        className="bg-c-surface border border-c-border rounded-lg px-2 py-1 text-sm text-c-text focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-c-border-hover transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
