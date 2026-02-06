"use client";

import { useState } from "react";
import { ownerPost, ownerPatch, ownerDelete } from "@/app/owner/_lib/ownerApi";
import { useRouter } from "next/navigation";

/**
 * Hook for entity CRUD operations
 * Handles create, update, delete with loading and error states
 */
export function useEntityActions(config) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (payload) => {
    if (!config?.apiPath) {
      throw new Error("API path not configured");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ownerPost(config.apiPath, payload);
      return response?.data || response;
    } catch (err) {
      const errorMsg =
        err?.message || err?.error || "Failed to create";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id, payload) => {
    if (!config?.apiPath) {
      throw new Error("API path not configured");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ownerPatch(`${config.apiPath}/${id}`, payload);
      return response?.data || response;
    } catch (err) {
      const errorMsg =
        err?.message || err?.error || "Failed to update";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!config?.apiPath) {
      throw new Error("API path not configured");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ownerDelete(`${config.apiPath}/${id}`);
      return response?.data || response;
    } catch (err) {
      const errorMsg =
        err?.message || err?.error || "Failed to delete";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const navigateToList = () => {
    if (config?.listPath) {
      router.push(config.listPath);
    }
  };

  const navigateToDetail = (id) => {
    if (config?.detailPath) {
      const path =
        typeof config.detailPath === "function"
          ? config.detailPath(id)
          : config.detailPath.replace("[id]", id);
      router.push(path);
    }
  };

  return {
    create,
    update,
    remove,
    loading,
    error,
    navigateToList,
    navigateToDetail,
  };
}
