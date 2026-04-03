"use client";

type Pair = { key: string; value: string };

type Props = {
  id?: string;
  label: string;
  hint?: string;
  pairs: Pair[];
  onChange: (next: Pair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addButtonLabel?: string;
};

/** Simple labeled variants (e.g. locale code → label). Serialized as a JSON object. */
export default function MedicineKeyValueListInput({
  id,
  label,
  hint,
  pairs,
  onChange,
  keyPlaceholder = "Label key",
  valuePlaceholder = "Display text",
  addButtonLabel = "Add label",
}: Props) {
  const list = pairs.length ? pairs : [{ key: "", value: "" }];

  const setAt = (index: number, patch: Partial<Pair>) => {
    const next = list.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange(next);
  };

  const remove = (index: number) => {
    const next = list.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ key: "", value: "" }]);
  };

  return (
    <div>
      <label className="form-label fw-medium" htmlFor={id}>
        {label}
      </label>
      {hint ? <p className="form-text small text-muted mb-2">{hint}</p> : null}
      <div className="d-flex flex-column gap-2">
        {list.map((pair, index) => (
          <div key={index} className="d-flex flex-wrap gap-2 align-items-center">
            <input
              id={index === 0 ? id : undefined}
              className="form-control"
              style={{ maxWidth: 200 }}
              value={pair.key}
              placeholder={keyPlaceholder}
              onChange={(e) => setAt(index, { key: e.target.value })}
              aria-label={`${label} key ${index + 1}`}
            />
            <input
              className="form-control flex-grow-1"
              value={pair.value}
              placeholder={valuePlaceholder}
              onChange={(e) => setAt(index, { value: e.target.value })}
              aria-label={`${label} value ${index + 1}`}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary radius-8 flex-shrink-0"
              onClick={() => remove(index)}
              disabled={list.length <= 1 && !pair.key.trim() && !pair.value.trim()}
              title="Remove row"
            >
              <i className="ri-close-line" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm btn-outline-primary radius-8 mt-2" onClick={() => onChange([...list, { key: "", value: "" }])}>
        {addButtonLabel}
      </button>
    </div>
  );
}
