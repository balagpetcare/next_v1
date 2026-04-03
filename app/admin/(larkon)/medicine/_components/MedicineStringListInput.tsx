"use client";

type Props = {
  id?: string;
  label: string;
  hint?: string;
  items: string[];
  onChange: (next: string[]) => void;
  addButtonLabel?: string;
  placeholder?: string;
};

/** One text field per line; empty lines are dropped on save (handled by serializer). */
export default function MedicineStringListInput({
  id,
  label,
  hint,
  items,
  onChange,
  addButtonLabel = "Add alternate name",
  placeholder = "e.g. regional spelling, INN synonym…",
}: Props) {
  const list = items.length ? items : [""];

  const setAt = (index: number, value: string) => {
    const next = [...list];
    next[index] = value;
    onChange(next);
  };

  const remove = (index: number) => {
    const next = list.filter((_, i) => i !== index);
    onChange(next.length ? next : []);
  };

  return (
    <div>
      <label className="form-label fw-medium" htmlFor={id}>
        {label}
      </label>
      {hint ? <p className="form-text small text-muted mb-2">{hint}</p> : null}
      <div className="d-flex flex-column gap-2">
        {list.map((line, index) => (
          <div key={index} className="d-flex gap-2 align-items-center">
            <input
              id={index === 0 ? id : undefined}
              className="form-control"
              value={line}
              placeholder={placeholder}
              onChange={(e) => setAt(index, e.target.value)}
              aria-label={`${label} ${index + 1}`}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary radius-8 flex-shrink-0"
              onClick={() => remove(index)}
              disabled={list.length <= 1 && !line.trim()}
              title="Remove line"
            >
              <i className="ri-close-line" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm btn-outline-primary radius-8 mt-2" onClick={() => onChange([...list, ""])}>
        {addButtonLabel}
      </button>
    </div>
  );
}
