# Admin Panel Updates - Usage Guide

## ✅ Status: No Errors Found

All code has been checked and there are **no linter errors**. The implementation is ready to use.

---

## 🚀 How to Use the Updates

### 1. **Product Moderation Queue** (NEW)

**Location:** `/admin/products/moderation`

**Features:**
- Tabs: Pending | Approved | Rejected
- Filter by search (name, slug, ID)
- Click any product row to open review drawer
- Approve/Reject actions in drawer

**How to Use:**
1. Navigate to `/admin/products/moderation`
2. Select a tab (Pending/Approved/Rejected)
3. Use search box to find specific products
4. Click a product row or "Review" button
5. In the drawer:
   - Review product details
   - Click "Approve" to approve (no confirmation needed)
   - Click "Reject" to open rejection modal (reason optional)

**Backend API:**
- `GET /api/v1/products?approvalStatus=PENDING_APPROVAL`
- `POST /api/v1/products/:id/approve`
- `POST /api/v1/products/:id/reject` (with optional `reason`)

---

### 2. **Orders & Finance** (ENHANCED)

**Location:** `/admin/orders`

**New Features:**
- **Funnel KPIs:** Placed, Processing, Shipped, Delivered, Cancelled/Refunded
- **FilterPanel:** Status dropdown + search
- **Quick Links:** Returns, Wallet/Payouts

**How to Use:**
1. View funnel metrics at the top (auto-calculated from all orders)
2. Use FilterPanel to filter by status or search
3. Click "Returns" or "Wallet / Payouts" for related pages
4. Table shows filtered results

**Note:** All orders are loaded once; filtering is client-side for performance.

---

### 3. **Services Catalog** (ENHANCED)

**Location:** `/admin/services`

**New Features:**
- FilterPanel with category and search filters
- Link to Appointments page

**How to Use:**
1. Use category input to filter by category name
2. Use search to find services by name/category
3. Click "Appointments" to view appointments (placeholder)

---

### 4. **Inventory Intelligence** (ENHANCED)

**Location:** `/admin/inventory`

**New Features:**
- **Expiry Watchlist:** 7/15/30 day buckets
- FilterPanel (low stock toggle + search)
- Existing KPIs preserved

**How to Use:**
1. View expiry watchlist section at top
2. Switch between 7, 15, 30 day buckets
3. Use FilterPanel to toggle "Low stock only" or search
4. View inventory table below

**Backend API:**
- `GET /api/v1/inventory/expiring?daysAhead=7` (or 15, 30)

---

### 5. **New Hub Pages** (Placeholders)

These pages are ready for future backend implementation:

#### **Delivery & Logistics**
- `/admin/delivery` - Hub with links
- `/admin/delivery/jobs` - Delivery jobs (placeholder)
- `/admin/delivery/riders` - Riders directory (placeholder)
- `/admin/delivery/hubs` - Hubs management (placeholder)
- `/admin/delivery/incidents` - Incidents queue (placeholder)

#### **Support System**
- `/admin/support` - Hub with links
- `/admin/support/tickets` - Tickets queue (placeholder)
- `/admin/support/reviews` - Reviews moderation (placeholder)
- `/admin/support/reports` - Reports/abuse (placeholder)

#### **Content & Notifications**
- `/admin/content` - Hub with links
- `/admin/content/announcements` - Announcements composer (placeholder)
- `/admin/content/notifications` - Notification logs (placeholder)
- `/admin/content/templates` - Template library (placeholder)
- `/admin/content/cms` - CMS pages editor (placeholder)

#### **Policy Center**
- `/admin/policy` - Hub with links
- `/admin/policy/verification` - Verification requirements (placeholder)
- `/admin/policy/refund` - Refund/discount policy (placeholder)
- `/admin/policy/commission` - Commission policy (placeholder)

#### **System & Security**
- `/admin/system` - Hub with links
- `/admin/system/integrations` - Integration status (placeholder)
- `/admin/system/sessions` - Active sessions (placeholder)
- `/admin/health` - System health (enhanced with API check)
- `/admin/audit` - Audit logs (existing, unchanged)

---

## 🔧 Backend Changes

### Product Rejection Endpoint

**New Route:** `POST /api/v1/products/:id/reject`

**Request Body:**
```json
{
  "reason": "Optional rejection reason"
}
```

**Response:**
- Sets `approvalStatus` to `"REJECTED"`
- Stores `rejectionReason` in `metaJson` field
- Returns success message

**Permission Required:** `admin.product.approve`

---

## 📋 Quick Access Links

From the main admin dashboard, you can now access:

1. **Products → Moderation Queue** (new link in products page)
2. **Orders → Returns / Wallet** (new links in orders page)
3. **Services → Appointments** (new link in services page)
4. **System → Health / Audit / Integrations / Sessions** (via system hub)

---

## ⚠️ Important Notes

1. **Placeholder Pages:** Many pages show "not yet implemented" - these are ready for backend modules to be added.

2. **API Dependencies:**
   - Product moderation requires `approvalStatus` field on products
   - Inventory expiry requires `expiryDate` field on inventory items
   - Orders funnel works with any order status values

3. **Permissions:**
   - Product approve/reject requires `admin.product.approve` permission
   - Other endpoints use existing permission checks

4. **Error Handling:**
   - All API calls have try/catch with user-friendly error messages
   - Failed API calls show alerts at the top of pages

---

## 🧪 Testing Checklist

- [ ] Product moderation: Approve a pending product
- [ ] Product moderation: Reject a pending product (with and without reason)
- [ ] Orders: Filter by status and search
- [ ] Inventory: View expiry watchlist (7/15/30 days)
- [ ] Inventory: Toggle low stock filter
- [ ] Services: Filter by category and search
- [ ] Health page: Verify API status check
- [ ] All hub pages: Verify links work

---

## 📝 Next Steps (Future Implementation)

When backend modules are ready, update these placeholder pages:

1. **Appointments:** Connect to appointments API
2. **Delivery:** Connect to delivery jobs/riders/hubs/incidents APIs
3. **Support:** Connect to tickets/reviews/reports APIs
4. **Content:** Connect to announcements/notifications/templates/CMS APIs
5. **Policy:** Connect to policy management APIs
6. **System:** Add integration status and active sessions APIs

---

## 🐛 Troubleshooting

**Issue:** Product moderation shows no products
- **Solution:** Check that products have `approvalStatus` field set

**Issue:** Inventory expiry watchlist is empty
- **Solution:** Verify inventory items have `expiryDate` field populated

**Issue:** Orders funnel shows 0 for all metrics
- **Solution:** Ensure orders API returns data with `status` field

**Issue:** Health page shows "API unreachable"
- **Solution:** Check `NEXT_PUBLIC_API_BASE_URL` environment variable

---

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check network tab for failed requests
4. Review backend logs for API errors

---

**Last Updated:** 2026-01-27
**Version:** Admin Panel v2.0
