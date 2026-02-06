export type Option = { id: string; name: string; parentId?: string };

// Demo data (replace with API)
export const divisions: Option[] = [
  { id: "dhaka", name: "Dhaka" },
  { id: "chattogram", name: "Chattogram" },
  { id: "khulna", name: "Khulna" },
  { id: "barishal", name: "Barishal" }
];

export const districts: Option[] = [
  { id: "dhaka", name: "Dhaka", parentId: "dhaka" },
  { id: "gazipur", name: "Gazipur", parentId: "dhaka" },
  { id: "chattogram", name: "Chattogram", parentId: "chattogram" },
  { id: "cumilla", name: "Cumilla", parentId: "chattogram" },
  { id: "khulna", name: "Khulna", parentId: "khulna" },
  { id: "barishal", name: "Barishal", parentId: "barishal" }
];

export const upazilas: Option[] = [
  { id: "dhanmondi", name: "Dhanmondi", parentId: "dhaka" },
  { id: "mirpur", name: "Mirpur", parentId: "dhaka" },
  { id: "gazipur-sadar", name: "Gazipur Sadar", parentId: "gazipur" },
  { id: "pahartali", name: "Pahartali", parentId: "chattogram" },
  { id: "kotwali", name: "Kotwali", parentId: "chattogram" },
  { id: "sonadanga", name: "Sonadanga", parentId: "khulna" },
  { id: "barishal-sadar", name: "Barishal Sadar", parentId: "barishal" }
];

export function filterByParent(list: Option[], parentId?: string) {
  if (!parentId) return [];
  return list.filter((x) => x.parentId === parentId);
}
