# Owner Panel — Permission Keys (Canonical)

Navigation and menu visibility are driven by permission keys returned from `GET /api/v1/auth/me` (e.g. `user.permissions` or `me.permissions`). The UI expects **canonical** keys below; the backend may return plural forms (e.g. `branches.read`) and adds canonical aliases so both work.

## Canonical keys (UI / permissionMenu)

| Resource   | Read        | Write / Create   |
|-----------|-------------|------------------|
| org       | `org.read`  | `org.write`, `org.create` |
| branch    | `branch.read` | `branch.write`, `branch.create` |
| staff     | `staff.read` | `staff.write`, `staff.create` |
| product   | `product.read` | `product.write`, `product.create` |
| orders    | `orders.read` | `orders.write` |
| inventory | `inventory.read` | `inventory.write` |
| customers | `customers.read` | `customers.write` |
| reports   | `reports.read` | — |
| settings  | `settings.read` | `settings.write`, `settings.manage` |

## Backend compatibility

- Backend legacy roles use `branches.read` / `branches.write`. The permissions utility adds `branch.read` / `branch.write` (and `branch.create` when `branch.write` is present) so sidebar items requiring `branch.read` show correctly.
- Same for `products.*` → `product.*` when DB returns product permissions.
- See `backend-api/src/api/v1/utils/permissions.js`: `addCanonicalAliases()`.
