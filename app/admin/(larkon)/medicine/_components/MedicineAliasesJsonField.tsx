"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  type AliasFormState,
  classifyAliasesJson,
  serializeAliasFormState,
} from "../_lib/medicineAliasesJsonMappers";
import MedicineKeyValueListInput from "./MedicineKeyValueListInput";
import MedicineStringListInput from "./MedicineStringListInput";

export type MedicineAliasesJsonFieldHandle = {
  serialize: () => { ok: true; value: unknown } | { ok: false; message: string };
};

type Props = {
  /** `aliasesJson` from API (after load). */
  initialValue: unknown;
  /** Increment when the parent reloads the row so local state resets. */
  reloadToken: number;
  /** Field id prefix for a11y. */
  idPrefix: string;
  listLabel?: string;
  listHint?: string;
  mapLabel?: string;
  mapHint?: string;
};

/**
 * Operator-friendly editing for `aliasesJson`: string list, flat key/value map, or
 * developer-only JSON when the stored value is not representable safely.
 */
const MedicineAliasesJsonField = forwardRef<MedicineAliasesJsonFieldHandle, Props>(function MedicineAliasesJsonFieldInner(
  {
    initialValue,
    reloadToken,
    idPrefix,
    listLabel = "Alternate names",
    listHint = "Other spellings or synonyms that should match this master in imports and search. One name per line.",
    mapLabel = "Labeled variants",
    mapHint = "Optional key/value labels (for example locale or source-specific names). Stored as a JSON object.",
  },
  ref
) {
  const [state, setState] = useState<AliasFormState>(() => classifyAliasesJson(initialValue));

  useEffect(() => {
    setState(classifyAliasesJson(initialValue));
  }, [initialValue, reloadToken]);

  useImperativeHandle(ref, () => ({
    serialize: () => serializeAliasFormState(state),
  }));

  if (state.shape === "advanced") {
    return (
      <div>
        <div className="alert alert-warning radius-12 small mb-3 py-2">
          This record uses a <strong>custom alias structure</strong> that cannot be shown as a simple list. Edit below only if you know the
          expected JSON shape for this master.
        </div>
        <label className="form-label fw-medium" htmlFor={`${idPrefix}-aliases-adv`}>
          Developer — alias JSON
        </label>
        <p className="form-text small text-muted mb-2">
          Must be valid JSON (array, object, or empty). Empty clears to an empty list on save.
        </p>
        <textarea
          id={`${idPrefix}-aliases-adv`}
          className="form-control font-monospace small"
          rows={10}
          value={state.rawText}
          onChange={(e) => setState({ shape: "advanced", rawText: e.target.value })}
          spellCheck={false}
        />
      </div>
    );
  }

  if (state.shape === "map") {
    return (
      <MedicineKeyValueListInput
        id={`${idPrefix}-aliases-map`}
        label={mapLabel}
        hint={mapHint}
        pairs={state.pairs}
        onChange={(pairs) => setState({ shape: "map", pairs })}
      />
    );
  }

  return (
    <MedicineStringListInput
      id={`${idPrefix}-aliases-list`}
      label={listLabel}
      hint={listHint}
      items={state.strings}
      onChange={(strings) => setState({ shape: "list", strings })}
    />
  );
});

MedicineAliasesJsonField.displayName = "MedicineAliasesJsonField";

export default MedicineAliasesJsonField;
