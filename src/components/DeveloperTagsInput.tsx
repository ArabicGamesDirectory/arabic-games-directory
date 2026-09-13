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

  // Dedupe case-insensitively first: the studios table can hold two rows with
  // the same name, which would list the suggestion twice and collide on the
  // React key below.
  const uniqueSuggestions = suggestions.filter(
    (s, i) => suggestions.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i
  );
  const filtered = uniqueSuggestions.filter(
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
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          // Commit whatever is typed when focus leaves. Only chips emit hidden
          // inputs, so without this a name typed but never Enter'd is silently
          // dropped and the form rejects with "add at least one developer"
          // while the field visibly contains text. Clicking Submit blurs this
          // input first, and React flushes the blur update before the click's
          // submit handler reads FormData, so the new chip is included.
          onBlur={() => {
            addTag(input);
            setShowSuggestions(false);
          }}
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
              // preventDefault keeps focus in the text input. Otherwise the
              // resulting blur would ALSO commit the partial text typed so far
              // (e.g. "Sem" alongside the picked "Semaphore Studios").
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
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
