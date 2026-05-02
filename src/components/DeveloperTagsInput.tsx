"use client";

import { useState, useRef } from "react";

export default function DeveloperTagsInput({
  name,
  initialValues,
  suggestions,
  placeholder,
  removeAriaLabel,
  hasError,
}: {
  name: string;
  initialValues?: string[];
  suggestions: string[];
  placeholder: string;
  removeAriaLabel: string;
  hasError?: boolean;
}) {
  const [tags, setTags] = useState<string[]>(initialValues ?? []);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInput("");
      return;
    }
    setTags([...tags, trimmed]);
    setInput("");
    setShowSuggestions(false);
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }

  const filtered = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={`flex flex-wrap items-center gap-1.5 bg-c-surface border ${
          hasError
            ? "border-red-500/50 focus-within:ring-red-500"
            : "border-c-border focus-within:ring-indigo-500"
        } rounded-lg px-2 py-1.5 focus-within:outline-none focus-within:ring-2 focus-within:border-transparent transition-colors min-h-[42px] cursor-text`}
      >
        {tags.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-indigo-600 text-white text-sm ps-2 pe-1 py-0.5 rounded-md"
          >
            <input type="hidden" name={name} value={tag} />
            <span dir="auto">{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              aria-label={removeAriaLabel}
              className="text-white/80 hover:text-white text-base leading-none px-0.5"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? placeholder : ""}
          autoComplete="off"
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-c-text placeholder:text-c-faint py-1"
        />
      </div>
      {showSuggestions && filtered.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-c-surface border border-c-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.slice(0, 8).map((s) => (
            <li
              key={s}
              onMouseDown={() => addTag(s)}
              className="px-3 py-2 text-sm text-c-text hover:bg-c-bg cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
