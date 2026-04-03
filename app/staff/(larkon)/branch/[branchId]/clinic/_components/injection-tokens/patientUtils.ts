import type { SelectedPetContext } from "./types";

export function mapApiPetToContext(row: unknown): SelectedPetContext | null {
  const r = row as Record<string, unknown> | null;
  if (!r?.id) return null;
  const owner = r.owner as Record<string, unknown> | undefined;
  if (!owner?.userId) return null;
  const animalType = r.animalType as Record<string, unknown> | undefined;
  const breed = r.breed as Record<string, unknown> | undefined;
  const subBreed = r.subBreed as Record<string, unknown> | undefined;
  return {
    petId: Number(r.id),
    patientUserId: Number(owner.userId),
    petName: (r.name as string) ?? "Pet",
    ownerDisplayName: (owner.displayName as string) ?? (owner.username as string) ?? "Owner",
    phone: (owner.phone as string) ?? null,
    email: (owner.email as string) ?? null,
    species: (animalType?.name as string) ?? null,
    breed:
      (breed?.name as string) ?? (subBreed?.name as string) ?? (r.customBreedText as string) ?? null,
    uniquePetId: (r.uniquePetId as string) ?? null,
    registeredBranchId: r.clinicRegisteredBranchId != null ? Number(r.clinicRegisteredBranchId) : null,
  };
}
