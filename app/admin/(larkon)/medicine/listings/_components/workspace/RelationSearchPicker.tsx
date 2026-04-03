"use client";

/**
 * Human-friendly alias for master entity async search (generics, brands, dosage forms, manufacturers).
 */
import MedicineWorkspaceAsyncSelect, { type AsyncEntityOption } from "../MedicineWorkspaceAsyncSelect";

export type RelationOption = AsyncEntityOption;

type Kind = "generic" | "brand" | "dosageForm" | "manufacturer";

export default function RelationSearchPicker(
  props: {
    label: string;
    placeholder?: string;
    value: RelationOption | null;
    onChange: (v: RelationOption | null) => void;
    kind: Kind;
    disabled?: boolean;
  }
) {
  return <MedicineWorkspaceAsyncSelect {...props} kind={props.kind} />;
}
