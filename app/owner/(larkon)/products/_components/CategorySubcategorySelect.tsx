"use client";

import { useMemo } from "react";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkSelect from "@larkon-ui/components/LkSelect";

export type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  children?: CategoryNode[];
};

function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  function walk(list: CategoryNode[]) {
    if (!Array.isArray(list)) return;
    for (const n of list) {
      // Preserve all properties including parentId, but remove children
      const { children, ...nodeWithoutChildren } = n;
      out.push(nodeWithoutChildren);
      // Recursively process children
      if (n.children && Array.isArray(n.children) && n.children.length > 0) {
        walk(n.children);
      }
    }
  }
  walk(nodes);
  return out;
}

type Props = {
  categories: CategoryNode[];
  categoryId: string;
  subCategoryId: string;
  onCategoryChange: (id: string) => void;
  onSubCategoryChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function CategorySubcategorySelect({
  categories,
  categoryId,
  subCategoryId,
  onCategoryChange,
  onSubCategoryChange,
  disabled,
  className = "",
}: Props) {
  
  const flat = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) {
      return [];
    }
    return flattenTree(categories);
  }, [categories]);

  const topLevel = useMemo(
    () => flat.filter((c) => c.parentId == null).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [flat]
  );

  const subOptions = useMemo(() => {
    // Check if categoryId is valid (not empty, null, or undefined)
    if (!categoryId || categoryId === '' || categoryId === '0') {
      return [];
    }
    
    // Convert categoryId to number for comparison
    const selectedId = parseInt(String(categoryId), 10);
    if (isNaN(selectedId)) {
      return [];
    }
    
    // First, try to get sub-categories from the tree structure (children array)
    let fromTree: CategoryNode[] = [];
    function findCategoryById(nodes: CategoryNode[], id: number): CategoryNode | null {
      for (const node of nodes) {
        if (Number(node.id) === id) {
          return node;
        }
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          const found = findCategoryById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    }
    
    const selectedCategory = findCategoryById(categories, selectedId);
    
    if (selectedCategory && selectedCategory.children && Array.isArray(selectedCategory.children) && selectedCategory.children.length > 0) {
      fromTree = selectedCategory.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        parentId: selectedId, // Ensure parentId is set to the selected category
        sortOrder: child.sortOrder ?? 0,
      }));
    }
    
    // Also filter from flattened list as fallback
    const fromFlat = flat.filter((c) => {
      if (c.parentId == null) return false;
      return Number(c.parentId) === selectedId;
    });
    
    // Combine both sources, removing duplicates by id
    const combined = [...fromTree, ...fromFlat];
    const uniqueMap = new Map<number, CategoryNode>();
    for (const item of combined) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }
    const unique = Array.from(uniqueMap.values());
    
    return unique.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [flat, categoryId, categories]);


  return (
    <div className={className}>
      <div className="row g-3">
        <div className="col-md-6">
          <LkFormGroup label="Category">
            <LkSelect
              className="radius-12"
              value={categoryId}
              onChange={(e) => {
                onCategoryChange(e.target.value);
                onSubCategoryChange("");
              }}
              disabled={disabled}
            >
              <option value="">Select category</option>
              {topLevel.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c?.name ?? "—"}
                </option>
              ))}
            </LkSelect>
          </LkFormGroup>
        </div>
        <div className="col-md-6">
          <LkFormGroup label="Sub-category">
            <LkSelect
              className="radius-12"
              value={subCategoryId}
              onChange={(e) => onSubCategoryChange(e.target.value)}
              disabled={disabled || !categoryId || categoryId === ''}
            >
              <option value="">Select sub-category (optional)</option>
              {subOptions.length > 0 ? (
                subOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c?.name ?? `Category ${c.id}`}
                  </option>
                ))
              ) : categoryId && categoryId !== '' ? (
                <option value="" disabled>
                  No sub-categories available
                </option>
              ) : null}
            </LkSelect>
          </LkFormGroup>
        </div>
      </div>
    </div>
  );
}
