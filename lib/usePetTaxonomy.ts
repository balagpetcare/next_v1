"use client";

import { useEffect, useState } from "react";
import {
  getAnimalTypes,
  getBreedsByAnimalType,
  getSubBreedsByBreed,
  getAnimalColors,
  getCoatPatterns,
  getAnimalSizes,
} from "./api";

export interface AnimalTypeItem {
  id: number;
  name: string;
}

export interface BreedItem {
  id: number;
  name: string;
}

export interface SubBreedItem {
  id: number;
  code: string;
  name: string;
}

export interface AnimalColorItem {
  id: number;
  code: string;
  name: string;
}

export interface CoatPatternItem {
  id: number;
  code: string;
  name: string;
}

export interface AnimalSizeItem {
  id: number;
  code: string;
  name: string;
}

/**
 * Fetches animal types (species) from the canonical common API.
 * Use for all pet/patient creation flows.
 */
export function useAnimalTypes(): {
  types: AnimalTypeItem[];
  loading: boolean;
  error: string | null;
} {
  const [types, setTypes] = useState<AnimalTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAnimalTypes()
      .then((t) => setTypes(Array.isArray(t) ? t : []))
      .catch((e) => {
        setTypes([]);
        setError(e?.message ?? "Failed to load species");
      })
      .finally(() => setLoading(false));
  }, []);

  return { types, loading, error };
}

/**
 * Fetches breeds for the given animal type from the canonical common API.
 * Returns empty list when animalTypeId is empty or invalid.
 * Use so breed options always depend on selected species.
 */
export function useBreedsByAnimalType(animalTypeId: string | number | null | undefined): {
  breeds: BreedItem[];
  loading: boolean;
  error: string | null;
} {
  const id = animalTypeId != null && animalTypeId !== "" ? Number(animalTypeId) : null;
  const [breeds, setBreeds] = useState<BreedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null || !Number.isFinite(id) || id <= 0) {
      setBreeds([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getBreedsByAnimalType(id)
      .then((b) => setBreeds(Array.isArray(b) ? b : []))
      .catch((e) => {
        setBreeds([]);
        setError(e?.message ?? "Failed to load breeds");
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { breeds, loading, error };
}

/**
 * Fetches sub-breeds for the given breed from the canonical common API.
 */
export function useSubBreedsByBreed(breedId: string | number | null | undefined): {
  subBreeds: SubBreedItem[];
  loading: boolean;
  error: string | null;
} {
  const id = breedId != null && breedId !== "" ? Number(breedId) : null;
  const [subBreeds, setSubBreeds] = useState<SubBreedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null || !Number.isFinite(id) || id <= 0) {
      setSubBreeds([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getSubBreedsByBreed(id)
      .then((s) => setSubBreeds(Array.isArray(s) ? s : []))
      .catch((e) => {
        setSubBreeds([]);
        setError(e?.message ?? "Failed to load sub-breeds");
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { subBreeds, loading, error };
}

/**
 * Fetches animal colors from the canonical common API.
 */
export function useAnimalColors(): {
  colors: AnimalColorItem[];
  loading: boolean;
  error: string | null;
} {
  const [colors, setColors] = useState<AnimalColorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAnimalColors()
      .then((c) => setColors(Array.isArray(c) ? c : []))
      .catch((e) => {
        setColors([]);
        setError(e?.message ?? "Failed to load colors");
      })
      .finally(() => setLoading(false));
  }, []);

  return { colors, loading, error };
}

/**
 * Fetches coat patterns from the canonical common API.
 */
export function useCoatPatterns(): {
  patterns: CoatPatternItem[];
  loading: boolean;
  error: string | null;
} {
  const [patterns, setPatterns] = useState<CoatPatternItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCoatPatterns()
      .then((p) => setPatterns(Array.isArray(p) ? p : []))
      .catch((e) => {
        setPatterns([]);
        setError(e?.message ?? "Failed to load coat patterns");
      })
      .finally(() => setLoading(false));
  }, []);

  return { patterns, loading, error };
}

/**
 * Fetches animal sizes from the canonical common API.
 */
export function useAnimalSizes(): {
  sizes: AnimalSizeItem[];
  loading: boolean;
  error: string | null;
} {
  const [sizes, setSizes] = useState<AnimalSizeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAnimalSizes()
      .then((s) => setSizes(Array.isArray(s) ? s : []))
      .catch((e) => {
        setSizes([]);
        setError(e?.message ?? "Failed to load sizes");
      })
      .finally(() => setLoading(false));
  }, []);

  return { sizes, loading, error };
}
