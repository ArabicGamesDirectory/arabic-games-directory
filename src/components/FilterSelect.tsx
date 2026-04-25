"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ChangeEvent } from "react";

export default function FilterSelect({
  paramName,
  pageParamName,
  current,
  options,
  defaultLabel,
}: {
  paramName: string;
  pageParamName?: string;
  current: string;
  options: { value: string; label: string }[];
  defaultLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set(paramName, e.target.value);
    } else {
      params.delete(paramName);
    }
    if (pageParamName) params.delete(pageParamName);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <select
      value={current}
      onChange={onChange}
      className="bg-c-surface border border-c-border rounded-lg px-2 py-1 text-sm text-c-text focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-c-border-hover transition-colors"
    >
      <option value="">{defaultLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
