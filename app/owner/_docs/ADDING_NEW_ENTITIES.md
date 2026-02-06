# Adding New Entities to Owner Dashboard

This guide explains how to add a new entity (e.g., Vendors, Customers, Suppliers) to the owner dashboard using the scalable architecture.

## Overview

The owner dashboard uses a configuration-driven, component-based architecture that makes adding new entities straightforward. Follow these steps to add a new entity.

## Step-by-Step Guide

### Step 1: Add Entity Configuration

Edit `app/owner/_lib/entityConfig.js` and add your entity configuration:

```javascript
export const entityConfigs = {
  // ... existing entities ...
  
  vendor: {
    name: "Vendor",
    plural: "Vendors",
    icon: "solar:shop-2-outline", // Iconify icon name
    apiPath: "/api/v1/owner/vendors",
    listPath: "/owner/vendors",
    detailPath: (id) => `/owner/vendors/${id}`,
    editPath: (id) => `/owner/vendors/${id}/edit`,
    newPath: "/owner/vendors/new",
    columns: [
      { key: "name", label: "Vendor Name", sortable: true, type: "link" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status", type: "badge" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    filters: ["status"],
    stats: ["total", "active"],
    quickFilters: [
      { key: "status", value: "ACTIVE", label: "Active" },
      { key: "status", value: "INACTIVE", label: "Inactive" },
    ],
  },
};
```

**Configuration Options:**

- `name`: Singular entity name
- `plural`: Plural entity name
- `icon`: Iconify icon name for menu
- `apiPath`: API endpoint for CRUD operations
- `listPath`: Route to list page
- `detailPath`: Function or string template for detail page route
- `editPath`: Function or string template for edit page route
- `newPath`: Route to create new entity page
- `columns`: Table column definitions
  - `key`: Data field path (supports nested, e.g., "user.profile.name")
  - `label`: Column header
  - `sortable`: Whether column is sortable (future feature)
  - `type`: "badge", "date", "link", or default
- `filters`: Array of filter keys (status, verificationStatus, etc.)
- `stats`: Array of stat keys to calculate (total, verified, pending, active, inactive)
- `quickFilters`: Quick filter chips configuration

### Step 2: Create Entity-Specific Components

Create components in `app/owner/_components/[entity]/`:

#### EntityCard.jsx (Optional - for card view)

```javascript
"use client";

import Link from "next/link";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function VendorCard({ vendor, config }) {
  const detailHref = config?.detailPath
    ? typeof config.detailPath === "function"
      ? config.detailPath(vendor.id)
      : config.detailPath.replace("[id]", vendor.id)
    : `/owner/vendors/${vendor.id}`;

  return (
    <div className="card radius-12 h-100">
      <div className="card-body">
        <h6 className="mb-1">
          <Link href={detailHref} className="text-decoration-none text-dark">
            {vendor.name}
          </Link>
        </h6>
        <StatusBadge status={vendor.status} />
        {/* Add more fields as needed */}
      </div>
    </div>
  );
}
```

#### EntityDetailView.jsx (Optional - for detail page)

```javascript
"use client";

import Link from "next/link";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function VendorDetailView({ vendor, config, onEdit }) {
  if (!vendor) return null;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-0">Vendor Information</h6>
          {/* Add detail fields */}
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Create Pages

#### List Page: `app/owner/vendors/page.jsx`

```javascript
"use client";

import EntityListPage from "@/app/owner/_components/shared/EntityListPage";
import EntityTable from "@/app/owner/_components/shared/EntityTable";
import { useEntityList } from "@/app/owner/_hooks/useEntityList";
import { useEntityFilters } from "@/app/owner/_hooks/useEntityFilters";
import { getEntityConfig } from "@/app/owner/_lib/entityConfig";

export default function OwnerVendorsPage() {
  const config = getEntityConfig("vendor");
  const { filters, updateFilter } = useEntityFilters(config);
  const { data, loading, error, stats, refresh } = useEntityList(config, filters);

  return (
    <EntityListPage
      title="Vendors"
      subtitle="Manage your vendors"
      entityType="vendors"
      config={config}
      data={data}
      loading={loading}
      error={error}
      stats={stats}
      onCreateHref="/owner/vendors/new"
      onCreateLabel="New Vendor"
      onRefresh={refresh}
      filters={filters}
      onFilterChange={updateFilter}
    >
      <EntityTable
        data={data}
        config={config}
        entityType="vendors"
        renderCustomActions={(item) => (
          <div className="d-inline-flex gap-1">
            <Link
              href={`/owner/vendors/${item.id}`}
              className="btn btn-sm btn-outline-primary radius-12"
            >
              View
            </Link>
          </div>
        )}
      />
    </EntityListPage>
  );
}
```

#### Detail Page: `app/owner/vendors/[id]/page.jsx`

```javascript
"use client";

import { useParams } from "next/navigation";
import EntityDetailPage from "@/app/owner/_components/shared/EntityDetailPage";
import { useEntityDetail } from "@/app/owner/_hooks/useEntityDetail";
import { getEntityConfig, buildBreadcrumbs } from "@/app/owner/_lib/entityConfig";
import VendorDetailView from "@/app/owner/_components/vendor/VendorDetailView";

export default function OwnerVendorDetailPage() {
  const params = useParams();
  const id = params?.id;
  const config = getEntityConfig("vendor");
  const { data, loading, error, refresh } = useEntityDetail(config, id);

  return (
    <EntityDetailPage
      title={data?.name || "Vendor Details"}
      subtitle={`Vendor ID: ${id}`}
      entityId={id}
      config={{ ...config, breadcrumbs: buildBreadcrumbs("vendor", "detail") }}
      loading={loading}
      error={error}
      onRefresh={refresh}
      onEdit={() => window.location.href = `/owner/vendors/${id}/edit`}
    >
      <VendorDetailView vendor={data} config={config} />
    </EntityDetailPage>
  );
}
```

#### Create/Edit Pages

Follow similar patterns for `new/page.jsx` and `[id]/edit/page.jsx`.

### Step 4: Add Menu Item

Edit `src/lib/permissionMenu.ts` and add your entity to the owner menu:

```typescript
{
  id: "owner.myBusiness",
  label: "My Business",
  icon: "solar:buildings-2-outline",
  required: ["org.read", "branch.read", "staff.read"],
  children: [
    // ... existing items ...
    {
      id: "owner.vendors",
      label: "Vendors",
      href: "/owner/vendors",
      required: ["vendor.read"],
      badgeType: "count", // Enables badge count
      children: [
        { id: "owner.vendors.list", label: "All Vendors", href: "/owner/vendors", required: ["vendor.read"] },
        { id: "owner.vendors.new", label: "New Vendor", href: "/owner/vendors/new", required: ["vendor.create"] },
      ],
    },
  ],
}
```

### Step 5: Add Badge Count (Optional)

If you want badge counts in the menu, update `app/owner/_hooks/useEntityCounts.js`:

```javascript
export function useEntityCounts() {
  const [counts, setCounts] = useState({
    organizations: 0,
    branches: 0,
    staffs: 0,
    vendors: 0, // Add your entity
  });
  
  // ... in useEffect, add:
  const vendorsRes = await ownerGet("/api/v1/owner/vendors");
  // ... process and add to counts
}
```

## Component Customization

### Custom Table Cells

Use `renderCustomCell` prop in `EntityTable`:

```javascript
<EntityTable
  renderCustomCell={(item, column) => {
    if (column.key === "customField") {
      return <CustomComponent value={item.customField} />;
    }
    return undefined; // Falls back to default rendering
  }}
/>
```

### Custom Actions

Use `renderCustomActions` prop:

```javascript
<EntityTable
  renderCustomActions={(item) => (
    <div className="d-inline-flex gap-1">
      <button onClick={() => handleCustomAction(item)}>
        Custom Action
      </button>
    </div>
  )}
/>
```

### Custom Filters

Add to entity config:

```javascript
advancedFilters: [
  {
    key: "customFilter",
    label: "Custom Filter",
    type: "select",
    options: [
      { value: "option1", label: "Option 1" },
      { value: "option2", label: "Option 2" },
    ],
  },
],
```

## Best Practices

1. **Follow Naming Conventions**: Use consistent naming (singular for config, plural for paths)
2. **Reuse Components**: Leverage shared components before creating custom ones
3. **Consistent Styling**: Use `radius-12` and WowDash classes
4. **Error Handling**: Always handle errors gracefully
5. **Loading States**: Show loading indicators during data fetching
6. **Type Safety**: Use TypeScript types when possible
7. **Documentation**: Document any custom logic or complex features

## Testing Checklist

- [ ] List page loads and displays data
- [ ] Filters work correctly
- [ ] Search functionality works
- [ ] Detail page displays correctly
- [ ] Create form works
- [ ] Edit form works
- [ ] Delete/archive works
- [ ] Menu item appears correctly
- [ ] Badge counts update (if implemented)
- [ ] Responsive design works on mobile
- [ ] Error states display properly

## Troubleshooting

### Entity not appearing in menu
- Check `permissionMenu.ts` configuration
- Verify permissions are set correctly
- Check if `required` permissions match user's permissions

### Badge not showing
- Verify `badgeType: "count"` is set in menu config
- Check `useEntityCounts` hook includes your entity
- Verify API endpoint returns data correctly

### Table not displaying data
- Check `columns` configuration matches data structure
- Verify `apiPath` is correct
- Check browser console for errors
- Ensure data is in expected format (array)

## Examples

See existing implementations:
- Organizations: `app/owner/organizations/page.jsx`
- Branches: `app/owner/branches/page.jsx`
- Staffs: `app/owner/staffs/page.jsx`

## Support

For questions or issues, refer to:
- `BPA_STANDARD.md` for coding standards
- `PROJECT_CONTEXT.md` for project overview
- Existing entity implementations for reference
