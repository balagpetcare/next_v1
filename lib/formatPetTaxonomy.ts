/**
 * Format pet taxonomy for display: Type / Breed / Sub-breed / Color / Size.
 * Prefers snapshot fields (historical consistency); falls back to relation names.
 */
export function formatPetTaxonomyLine(pet: {
  animalTypeNameSnapshot?: string | null;
  breedNameSnapshot?: string | null;
  subBreedNameSnapshot?: string | null;
  colorNameSnapshot?: string | null;
  sizeNameSnapshot?: string | null;
  animalType?: { name?: string } | null;
  breed?: { name?: string } | null;
  subBreed?: { name?: string } | null;
  color?: { name?: string } | null;
  size?: { name?: string } | null;
}): string {
  const typeName = pet.animalTypeNameSnapshot ?? pet.animalType?.name ?? "";
  const breedName = pet.breedNameSnapshot ?? pet.breed?.name ?? "";
  const subBreedName = pet.subBreedNameSnapshot ?? pet.subBreed?.name ?? "";
  const colorName = pet.colorNameSnapshot ?? pet.color?.name ?? "";
  const sizeName = pet.sizeNameSnapshot ?? pet.size?.name ?? "";
  const parts = [typeName, breedName, subBreedName, colorName, sizeName].filter(Boolean);
  return parts.join(" / ");
}
