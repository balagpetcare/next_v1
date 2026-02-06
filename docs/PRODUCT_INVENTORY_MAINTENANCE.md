# Product & Inventory Management System - Maintenance Guide

## Overview
This document describes the maintenance strategy for the Product and Inventory Management System integrated with Owners Dashboard and Branches Dashboard.

## System Architecture

### Product Management (Organization Level)
- **Location**: Main database at organization level (`orgId`)
- **Access**: Owner account has full control
- **Scope**: Product master data, variants, categories, brands

### Inventory Management (Branch Level)
- **Location**: Branch-specific inventory entries
- **Access**: Branch managers can manage their branch inventory
- **Scope**: Stock quantities, minStock levels, expiry dates per branch

## Maintenance Workflows

### 1. Product Creation Maintenance

**When Owner Creates a Product:**

1. **Product Master Data Creation**
   - Product is created in main database with `orgId`
   - Product variants are created
   - Product status: ACTIVE/INACTIVE
   - Approval status: DRAFT → PENDING_APPROVAL → APPROVED → PUBLISHED

2. **Optional: Add to Branches**
   - Owner can select branches to add inventory
   - System creates inventory entries for selected branches
   - Initial quantity and minStock can be set
   - If not added during creation, branches can add later

3. **Best Practices:**
   - Always create product at organization level first
   - Use approval workflow before publishing
   - Add to branches only after product is APPROVED or PUBLISHED
   - Set appropriate minStock levels

### 2. Product Update Maintenance

**When Owner Updates Product:**

1. **Main Database Update**
   - Product details updated in main database (orgId level)
   - Variants updated in main database
   - Changes logged in audit trail
   - **Inventory quantities remain unchanged**

2. **Branch Notification (Optional)**
   - If "Notify Branches" option enabled:
     - Notification sent to branches using this product
     - Shown in branch dashboard
     - Branch manager can review changes

3. **Inventory Preservation**
   - Inventory quantities remain unchanged
   - Branch-specific inventory settings preserved
   - Only product master data updated

4. **Sync Options:**
   - **Manual Sync**: Branch manager reviews and syncs
   - **Auto Sync**: Automatic sync for non-critical changes
   - **Selective Sync**: Branch chooses what to sync

### 3. Product Deletion/Deactivation Maintenance

**When Product is Deleted or Deactivated:**

1. **Options Available:**
   - **Option 1**: Clear inventory from all branches
   - **Option 2**: Keep inventory but mark product as inactive
   - **Option 3**: Prevent new inventory entries for inactive products

2. **Recommended Approach:**
   - Deactivate product (set status to INACTIVE) instead of deleting
   - Keep existing inventory entries
   - Prevent new inventory entries
   - Allow existing inventory to be sold/transferred

### 4. Inventory Maintenance

**Daily Operations:**
1. Stock adjustments (IN/OUT/ADJUST)
2. Stock transfers between branches
3. Low stock monitoring
4. Expiring items tracking

**Weekly Operations:**
1. Inventory reconciliation
2. Stock movement reports
3. Slow-moving items review
4. MinStock level review

**Monthly Operations:**
1. Inventory valuation
2. ABC analysis
3. Stock forecasting
4. Reorder planning

## Data Consistency Rules

### Product-Inventory Consistency
- Product must exist before inventory entry
- Product deletion → Option to clear inventory
- Product deactivation → Prevent new inventory entries
- Variant deletion → Handle inventory for that variant

### Branch-Organization Consistency
- Branch must belong to organization
- Product must belong to organization
- Inventory entries must match branch-organization relationship

## API Endpoints for Maintenance

### Product Summary
- `GET /api/v1/owner/products/summary` - Get product summary for dashboard

### Product Branch Availability
- `GET /api/v1/owner/products/branch-availability?productId={id}` - Check product availability across branches

### Add Product to Branches
- `POST /api/v1/owner/products/:id/add-to-branches` - Add product to multiple branches with inventory

### Branch Products with Inventory
- `GET /api/v1/owner/branches/:id/products-with-inventory` - Get products with inventory for a branch

### Branch Product Inventory Management
- `POST /api/v1/owner/branches/:id/products/:productId/inventory` - Create/update inventory for branch

## Best Practices

### Product Management
1. Always create product at organization level first
2. Use approval workflow for product publishing
3. Maintain product variants properly
4. Keep product master data clean and consistent
5. Review and update product information regularly

### Inventory Management
1. Regular stock counts and reconciliation
2. Set appropriate minStock levels based on sales history
3. Monitor and act on low stock alerts immediately
4. Track all stock movements (IN/OUT/TRANSFER/ADJUST)
5. Maintain accurate expiry dates for perishable items
6. Review slow-moving items monthly
7. Optimize stock levels based on demand patterns

### User Permissions
1. **Owners**: Full product and inventory management
2. **Branch Managers**: Branch-specific inventory management
3. **Staff**: Limited inventory operations (read-only or limited edit)
4. Clear permission boundaries must be maintained

## Troubleshooting

### Common Issues

1. **Product not showing in branch**
   - Check if product belongs to same organization
   - Verify product approval status (should be APPROVED or PUBLISHED)
   - Check if inventory entry exists for the branch

2. **Inventory quantity mismatch**
   - Review stock transactions
   - Check for pending transfers
   - Verify stock adjustments

3. **Low stock alerts not showing**
   - Verify minStock is set correctly
   - Check if inventory entry exists
   - Verify branch belongs to owner's organization

4. **Product update not reflecting**
   - Check if notification was sent
   - Verify branch manager reviewed changes
   - Check sync status

## Performance Optimization

1. **Database Indexing**
   - Index on `branchId`, `productId`, `variantId` in Inventory table
   - Index on `orgId` in Product table
   - Index on `status` and `approvalStatus` in Product table

2. **Caching**
   - Cache product master data
   - Cache product summary for dashboard
   - Cache branch inventory summaries

3. **Query Optimization**
   - Use pagination for large product lists
   - Use aggregation queries for dashboard metrics
   - Limit data fetched for summary views

## Monitoring

### Key Metrics to Monitor
1. Product creation rate
2. Inventory update frequency
3. Low stock alert response time
4. Stock transfer completion rate
5. Product approval workflow time
6. Inventory accuracy (physical vs system)

### Alerts to Set Up
1. Critical low stock (quantity = 0)
2. Low stock (quantity <= minStock)
3. Expiring items (within 7 days)
4. Products pending approval (more than 3 days)
5. Inventory discrepancies

## Future Enhancements

1. **Automated Reordering**
   - Set reorder points
   - Automatic purchase order generation
   - Supplier integration

2. **Advanced Analytics**
   - Sales forecasting
   - Demand prediction
   - ABC analysis automation
   - Stock optimization recommendations

3. **Real-time Updates**
   - WebSocket integration
   - Live inventory updates
   - Real-time stock alerts

4. **Bulk Operations**
   - Bulk product import
   - Bulk inventory adjustment
   - Bulk stock transfer

## Support

For issues or questions:
1. Check this documentation first
2. Review API documentation
3. Check system logs
4. Contact development team

---

**Last Updated**: January 26, 2026  
**Version**: 1.0.0  
**Author**: BPA Development Team
