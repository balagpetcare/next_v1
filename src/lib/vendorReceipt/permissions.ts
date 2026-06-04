/** RBAC helpers for staff warehouse vendor receive / GRN flows. */

export function canExecuteVendorReceive(perms: string[]): boolean {
  const s = new Set(perms);
  return s.has("purchase.receive") || s.has("grn.post") || s.has("grn.create") || s.has("inbound.grn");
}

export function canConfirmGrn(perms: string[]): boolean {
  const s = new Set(perms);
  return s.has("grn.confirm.warehouse_manager") || s.has("inventory.emergency.override");
}
