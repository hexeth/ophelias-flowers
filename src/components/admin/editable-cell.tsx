import type { ChangeEvent } from "react";

type EditableCellType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multi-combobox"
  | "tags"
  | "checkbox"
  | "image"
  | "readonly";

interface Option {
  label: string;
  value: string;
}

interface FormSubmitEvent {
  preventDefault: () => void;
  currentTarget: HTMLFormElement;
}

interface EditableCellProps {
  label: string;
  value: boolean | number | string | string[] | null;
  type: EditableCellType;
  isEditing: boolean;
  compact?: boolean;
  options?: Option[];
  onValueChange?: (nextValue: boolean | string | string[]) => void;
  onImageUpload?: (file: File) => Promise<void>;
}

function getFieldClassName(compact: boolean) {
  return compact
    ? "w-full border border-ink bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ink"
    : "w-full border border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink";
}

function formatValue(value: EditableCellProps["value"]) {
  if (typeof value === "boolean") {
    return value ? "Hidden" : "Visible";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value === null || value === "") {
    return "—";
  }

  return String(value);
}

function normalizeOptionValue(value: string) {
  return value.trim().toLowerCase();
}

export function EditableCell(props: EditableCellProps) {
  const {
    label,
    value,
    type,
    isEditing,
    compact = false,
    options = [],
    onValueChange,
    onImageUpload,
  } = props;

  const fieldClassName = getFieldClassName(compact);

  if (type === "image") {
    const imageUrl =
      typeof value === "string" && value.length > 0
        ? value
        : "/catalog-seed/placeholder-variety.jpg";
    const imageAlt = isEditing
      ? `Upload image for ${label}`
      : `${label} preview`;

    return (
      <div className={compact ? "space-y-2" : "min-w-[12rem] space-y-3"}>
        <label
          className={
            isEditing ? "group relative block cursor-pointer" : "block"
          }
          title={isEditing ? `Upload image for ${label}` : undefined}
          aria-label={isEditing ? `Upload image for ${label}` : undefined}
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            className={
              compact
                ? "aspect-[3/4] w-16 border border-ink object-cover"
                : "aspect-[3/4] w-28 border border-ink object-cover"
            }
          />
          {isEditing ? (
            <span className="absolute inset-0 flex items-center justify-center border border-ink bg-ink/0 text-white opacity-0 transition-opacity group-hover:bg-ink/65 group-hover:opacity-100 group-focus-within:bg-ink/65 group-focus-within:opacity-100">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={compact ? "h-4 w-4" : "h-6 w-6"}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 16V5" />
                <path d="m7 10 5-5 5 5" />
                <path d="M5 19h14" />
              </svg>
              <span className="sr-only">Upload image</span>
            </span>
          ) : null}
          {isEditing ? (
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) {
                  return;
                }

                try {
                  await onImageUpload?.(file);
                } finally {
                  input.value = "";
                }
              }}
            />
          ) : null}
        </label>
      </div>
    );
  }

  if (!isEditing || type === "readonly") {
    return (
      <span
        className={
          compact
            ? "block whitespace-pre-wrap text-xs leading-snug"
            : "block whitespace-pre-wrap text-sm leading-relaxed"
        }
      >
        {formatValue(value)}
      </span>
    );
  }

  if (type === "textarea") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onValueChange?.(event.target.value)}
        className={`${fieldClassName} ${compact ? "min-h-20" : "min-h-28"} resize-y`}
      />
    );
  }

  if (type === "select") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onValueChange?.(event.target.value)}
        className={fieldClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === "multi-combobox") {
    const selectedValues = Array.isArray(value) ? value : [];
    const normalizedSelectedValues = selectedValues
      .map(normalizeOptionValue)
      .filter(Boolean);
    const selectedValueSet = new Set(normalizedSelectedValues);
    const availableOptionsMap = new Map<string, Option>();

    for (const option of [
      ...options,
      ...selectedValues.map(
        (item): Option => ({ label: item, value: item }),
      ),
    ]) {
      const normalizedValue = normalizeOptionValue(option.value);
      if (!normalizedValue) {
        continue;
      }

      availableOptionsMap.set(normalizedValue, {
        label: option.label,
        value: normalizedValue,
      });
    }

    const availableOptions = Array.from(availableOptionsMap.values());
    const summaryText =
      selectedValues.length > 0
        ? selectedValues.join(", ")
        : `Select ${label.toLowerCase()}`;

    function toggleOption(optionValue: string, checked: boolean) {
      const normalizedValue = normalizeOptionValue(optionValue);
      if (!normalizedValue) return;

      const nextValues = checked
        ? Array.from(new Set([...normalizedSelectedValues, normalizedValue]))
        : normalizedSelectedValues.filter((item) => item !== normalizedValue);

      onValueChange?.(nextValues);
    }

    function addOption(event: FormSubmitEvent) {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      const rawValue = String(formData.get("new-option") ?? "");
      const normalizedValue = normalizeOptionValue(rawValue);
      if (!normalizedValue) {
        return;
      }

      onValueChange?.(
        Array.from(new Set([...normalizedSelectedValues, normalizedValue])),
      );
      event.currentTarget.reset();
    }

    return (
      <details className="relative min-w-[10rem]">
        <summary
          className={`${fieldClassName} flex cursor-pointer list-none items-center justify-between gap-2 select-none`}
        >
          <span className="truncate">{summaryText}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5 shrink-0"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="absolute left-0 top-full z-20 mt-px w-52 border border-ink bg-white">
          <div className="max-h-40 overflow-y-auto py-1">
            {availableOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs hover:bg-cream"
              >
                <input
                  type="checkbox"
                  checked={selectedValueSet.has(option.value)}
                  onChange={(event) =>
                    toggleOption(option.value, event.target.checked)
                  }
                  className="h-3.5 w-3.5 accent-ink"
                />
                <span className="truncate">{option.label}</span>
              </label>
            ))}
          </div>
          <form
            onSubmit={addOption}
            className="flex gap-2 border-t border-stone-300 p-2"
          >
            <input
              name="new-option"
              type="text"
              className="min-w-0 flex-1 border border-ink bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ink"
              placeholder="Add color"
            />
            <button
              type="submit"
              className="border border-ink px-2 py-1.5 text-[10px] uppercase tracking-widest hover:bg-ink hover:text-white transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      </details>
    );
  }

  if (type === "tags") {
    return (
      <input
        type="text"
        value={Array.isArray(value) ? value.join(", ") : ""}
        onChange={(event) =>
          onValueChange?.(
            event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
        className={fieldClassName}
        placeholder="blush, cream"
      />
    );
  }

  if (type === "checkbox") {
    return (
      <label
        className={
          compact
            ? "inline-flex items-center gap-2 text-xs"
            : "inline-flex items-center gap-3 text-sm"
        }
      >
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onValueChange?.(event.target.checked)}
          className="h-4 w-4 accent-ink"
        />
        <span>{value ? "Hidden" : "Visible"}</span>
      </label>
    );
  }

  return (
    <input
      type={type === "number" ? "number" : "text"}
      step={type === "number" ? "0.01" : undefined}
      value={
        typeof value === "number"
          ? String(value)
          : typeof value === "string"
            ? value
            : ""
      }
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onValueChange?.(
          type === "number" ? event.target.value : event.target.value,
        )
      }
      className={fieldClassName}
    />
  );
}
