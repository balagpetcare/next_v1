# Branch Dashboard Documentation

## Overview
This document describes the Branch Dashboard feature implemented for the Owner panel. The dashboard provides comprehensive analytics, metrics, charts, and insights for each branch, allowing owners to monitor branch performance, sales, inventory, and make data-driven decisions.

## Current Implementation

### Page Location
- **Path**: `/owner/organizations/[id]/branches/[branchId]`
- **File**: `app/owner/organizations/[id]/branches/[branchId]/page.jsx`

### Features Implemented

#### 1. Key Metrics Cards
- **Today's Sales**: Current day sales with comparison to yesterday
- **This Week's Sales**: Weekly sales with comparison to last week
- **Total Profit**: Calculated profit with comparison to last month
- **Total Orders**: Order count with comparison to last month

**Component**: `app/owner/_components/branch/BranchMetricsCards.jsx`

#### 2. Charts and Visualizations

##### Sales Trend Chart
- **Type**: Area Chart
- **Data**: Sales over the last 6 months (grouped by month)
- **Shows**: Sales trend over time
- **Component**: `SalesTrendChart` in `BranchCharts.jsx`

##### Product Sales Pie Chart
- **Type**: Donut Chart
- **Data**: Top 6 products by revenue
- **Shows**: Revenue distribution by product
- **Component**: `ProductSalesPieChart` in `BranchCharts.jsx`

##### Orders Bar Chart
- **Type**: Bar Chart
- **Data**: Orders over the last 6 months
- **Shows**: Order volume trends
- **Component**: `OrdersBarChart` in `BranchCharts.jsx`

##### Revenue Area Chart
- **Type**: Area Chart
- **Data**: Revenue over the last 6 months
- **Shows**: Revenue trends
- **Component**: `RevenueAreaChart` in `BranchCharts.jsx`

#### 3. Stock Status Section
- **Total Items**: Total inventory items count
- **Low Stock**: Items below minimum stock threshold
- **Out of Stock**: Items with zero quantity
- **Total Value**: Total inventory value
- **Stock Table**: Top 10 items with quantity and status

#### 4. Top Selling Products Table
- Lists top 10 products by revenue
- Shows product name, quantity sold, and total revenue
- Sorted by revenue (highest first)

#### 5. Services Section
- Displays all services available at the branch
- Shows service name, description, and price
- Grid layout with cards

#### 6. Branch Information
- Basic Information (Name, Types, Status)
- Contact Information (Phone, Email, Manager details)
- Location (Address, Google Maps link)

### API Endpoints Used

1. **Branch Details**
   - `GET /api/v1/owner/branches/{branchId}`

2. **Sales Reports**
   - `GET /api/v1/reports/sales?branchId={id}&startDate={date}&endDate={date}&groupBy={day|week|month}`

3. **Top Products**
   - `GET /api/v1/reports/top-products?branchId={id}&limit={n}&startDate={date}`

4. **Stock Report**
   - `GET /api/v1/reports/stock?branchId={id}`

5. **Revenue Analytics**
   - `GET /api/v1/reports/revenue?branchId={id}&startDate={date}`

6. **Services**
   - `GET /api/v1/services?branchId={id}`

### Chart Library
- **Library**: ApexCharts (via react-apexcharts)
- **Version**: ^4.0.0
- **React Wrapper**: react-apexcharts ^1.4.1

## Future Enhancements

### Phase 1: Enhanced Analytics

#### 1. Profit Calculation Enhancement
**Current**: Simplified profit calculation (20% margin assumption)
**Enhancement**: 
- Integrate actual cost data from inventory/purchases
- Calculate real profit margins per product
- Show profit breakdown by product category
- Add profit trend chart

**API Requirements**:
- Endpoint to fetch product costs
- Purchase order history integration
- Cost of goods sold (COGS) calculation

#### 2. Advanced Date Range Filters
**Enhancement**:
- Add date range picker component
- Allow custom date range selection
- Quick filters: Today, Yesterday, Last 7 Days, Last 30 Days, Last 3 Months, Last 6 Months, Last Year, Custom Range
- Apply filters to all charts and metrics

**Implementation**:
- Create `DateRangeFilter` component
- Update API calls to use selected date range
- Store filter state in URL query params for bookmarking

#### 3. Comparison Views
**Enhancement**:
- Compare current period vs previous period
- Compare branch performance vs organization average
- Compare multiple branches side-by-side
- Year-over-year comparison

**Components Needed**:
- `ComparisonChart` component
- `BranchComparison` component

#### 4. Real-time Updates
**Enhancement**:
- WebSocket integration for real-time sales updates
- Auto-refresh metrics every 30 seconds (configurable)
- Live order notifications
- Real-time stock alerts

**Technical Requirements**:
- WebSocket server setup
- Client-side WebSocket connection
- State management for real-time data

### Phase 2: Additional Metrics and KPIs

#### 1. Customer Analytics
**Metrics to Add**:
- Total customers
- New customers (this month/week)
- Returning customers percentage
- Average customer lifetime value
- Customer acquisition cost

**Charts**:
- Customer growth chart
- Customer retention rate
- Top customers by purchase value

**API Requirements**:
- `GET /api/v1/reports/customers?branchId={id}`
- Customer analytics endpoints

#### 2. Product Performance Metrics
**Metrics to Add**:
- Product sell-through rate
- Average days to sell
- Product turnover rate
- Slow-moving products
- Fast-moving products

**Charts**:
- Product performance matrix (revenue vs quantity)
- ABC analysis chart
- Product lifecycle chart

#### 3. Staff Performance Metrics
**Metrics to Add**:
- Sales per staff member
- Orders processed per staff
- Average transaction time
- Staff efficiency score

**Charts**:
- Staff performance comparison
- Staff activity timeline

**API Requirements**:
- `GET /api/v1/reports/staff-performance?branchId={id}`
- Order assignment tracking

#### 4. Service Performance
**Metrics to Add**:
- Services booked count
- Service revenue
- Most popular services
- Service utilization rate
- Average service duration

**Charts**:
- Service revenue pie chart
- Service booking trends
- Service capacity utilization

**API Requirements**:
- Service booking analytics endpoints
- Service performance reports

### Phase 3: Advanced Visualizations

#### 1. Heat Maps
**Enhancement**:
- Sales heat map by day of week and hour
- Product sales heat map
- Customer visit patterns heat map

**Use Case**: Identify peak hours, busy days, popular products

#### 2. Funnel Charts
**Enhancement**:
- Sales funnel (visitors → inquiries → orders → completed)
- Conversion funnel by product category
- Customer journey funnel

**Use Case**: Identify conversion bottlenecks

#### 3. Gauge Charts
**Enhancement**:
- Sales target progress gauge
- Stock level gauge
- Performance score gauge

**Use Case**: Quick visual indicators of targets and goals

#### 4. Geographic Visualizations
**Enhancement**:
- Customer location map
- Delivery area visualization
- Sales by region map

**Use Case**: Understand customer distribution and delivery patterns

### Phase 4: Predictive Analytics

#### 1. Sales Forecasting
**Enhancement**:
- Predict future sales based on historical data
- Seasonal trend analysis
- Demand forecasting

**Charts**:
- Forecasted sales line chart with confidence intervals
- Seasonal decomposition chart

**Technical Requirements**:
- Time series analysis library
- Machine learning model (optional)
- Backend forecasting service

#### 2. Inventory Forecasting
**Enhancement**:
- Predict when products will go out of stock
- Optimal reorder point calculation
- Demand prediction per product

**Alerts**:
- Automated low stock predictions
- Reorder recommendations

#### 3. Revenue Projections
**Enhancement**:
- Projected revenue for next month/quarter
- Growth rate predictions
- Target achievement probability

### Phase 5: Export and Reporting

#### 1. Export Functionality
**Enhancement**:
- Export dashboard as PDF
- Export charts as images (PNG/SVG)
- Export data as Excel/CSV
- Scheduled email reports

**Components Needed**:
- PDF generation library (jsPDF, react-pdf)
- Excel export library (xlsx)
- Email service integration

#### 2. Custom Reports Builder
**Enhancement**:
- Drag-and-drop report builder
- Custom metric selection
- Custom date ranges
- Save and share reports

**Technical Requirements**:
- Report template system
- Report storage (database)
- Report sharing mechanism

#### 3. Scheduled Reports
**Enhancement**:
- Daily/weekly/monthly automated reports
- Email delivery
- Custom report templates
- Report history

### Phase 6: Alerts and Notifications

#### 1. Smart Alerts
**Enhancement**:
- Low stock alerts
- Sales threshold alerts
- Unusual activity alerts
- Performance degradation alerts

**Configuration**:
- Alert thresholds
- Alert channels (email, SMS, in-app)
- Alert frequency

#### 2. Dashboard Widgets
**Enhancement**:
- Customizable dashboard layout
- Drag-and-drop widget arrangement
- Widget visibility toggles
- Save dashboard preferences

**Technical Requirements**:
- Grid layout library (react-grid-layout)
- Widget system architecture
- User preferences storage

### Phase 7: Mobile Optimization

#### 1. Responsive Charts
**Enhancement**:
- Optimize charts for mobile screens
- Touch-friendly interactions
- Simplified mobile views
- Mobile-specific metrics cards

#### 2. Progressive Web App (PWA)
**Enhancement**:
- Offline dashboard access
- Push notifications
- App-like experience
- Install prompt

### Phase 8: Integration Enhancements

#### 1. External Integrations
**Enhancement**:
- Accounting software integration (QuickBooks, Xero)
- Payment gateway analytics
- Social media analytics
- Google Analytics integration

#### 2. API Enhancements
**Enhancement**:
- GraphQL API for flexible queries
- Webhook support for real-time updates
- API rate limiting and caching
- Bulk data endpoints

## Technical Considerations

### Performance Optimization
1. **Data Caching**: Implement caching for frequently accessed data
2. **Lazy Loading**: Load charts on-demand
3. **Pagination**: Paginate large data sets
4. **Debouncing**: Debounce API calls for filters
5. **Memoization**: Memoize expensive calculations

### Error Handling
1. **API Error Handling**: Graceful error messages
2. **Fallback Data**: Show placeholder data when API fails
3. **Retry Logic**: Automatic retry for failed requests
4. **Error Boundaries**: React error boundaries for component errors

### Accessibility
1. **ARIA Labels**: Proper ARIA labels for charts
2. **Keyboard Navigation**: Full keyboard support
3. **Screen Reader Support**: Chart descriptions for screen readers
4. **Color Contrast**: Ensure WCAG AA compliance

### Security
1. **Data Privacy**: Ensure branch data is only accessible to authorized users
2. **API Security**: Validate all API requests
3. **XSS Prevention**: Sanitize all user inputs
4. **Rate Limiting**: Prevent API abuse

## Component Structure

```
app/owner/
├── _components/
│   └── branch/
│       ├── BranchMetricsCards.jsx      # Key metrics cards
│       ├── BranchCharts.jsx            # All chart components
│       └── BranchDashboard.jsx         # Main dashboard wrapper (future)
├── organizations/
│   └── [id]/
│       └── branches/
│           └── [branchId]/
│               └── page.jsx             # Main dashboard page
└── _lib/
    └── ownerApi.ts                     # API helper functions
```

## API Response Formats

### Sales Report Response
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSales": 50000,
      "totalOrders": 150,
      "totalItems": 300,
      "averageOrderValue": 333.33
    },
    "grouped": [
      {
        "date": "2024-01",
        "sales": 50000,
        "orders": 150,
        "items": 300
      }
    ]
  }
}
```

### Top Products Response
```json
{
  "success": true,
  "data": [
    {
      "productId": 1,
      "productName": "Product Name",
      "totalQuantity": 50,
      "totalRevenue": 10000,
      "orderCount": 25
    }
  ]
}
```

### Stock Report Response
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalItems": 100,
      "totalValue": 500000,
      "lowStockCount": 10,
      "outOfStockCount": 2
    },
    "items": [
      {
        "id": 1,
        "product": { "id": 1, "name": "Product" },
        "variant": { "id": 1, "title": "Variant" },
        "quantity": 50,
        "minStock": 20
      }
    ]
  }
}
```

## Testing Checklist

### Unit Tests
- [ ] BranchMetricsCards component rendering
- [ ] Chart components with mock data
- [ ] API helper functions
- [ ] Date calculations
- [ ] Currency formatting

### Integration Tests
- [ ] API endpoint integration
- [ ] Data flow from API to components
- [ ] Error handling
- [ ] Loading states

### E2E Tests
- [ ] Page load and data display
- [ ] Chart interactions
- [ ] Filter functionality
- [ ] Navigation

## Maintenance Notes

### Regular Updates
1. **Data Refresh**: Ensure data is refreshed regularly
2. **Chart Updates**: Keep ApexCharts library updated
3. **API Compatibility**: Monitor API changes
4. **Performance Monitoring**: Track page load times

### Known Limitations
1. Profit calculation is simplified (needs cost data integration)
2. No real-time updates (requires WebSocket implementation)
3. Limited date range options (needs date picker component)
4. No export functionality (requires PDF/Excel libraries)

## Support and Contact

For questions or issues related to the Branch Dashboard:
1. Check this documentation first
2. Review API documentation
3. Contact the development team
4. Create an issue in the project repository

---

**Last Updated**: January 26, 2026
**Version**: 1.0.0
**Author**: BPA Development Team
