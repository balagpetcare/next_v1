/**
 * Demo data for landing page charts and stats.
 * Chart-friendly structures for ApexCharts.
 */

export const demoData = {
  salesSummary: {
    daily: [
      { day: "রবি", date: "2026-02-05", sales: 12500, orders: 8 },
      { day: "সোম", date: "2026-02-06", sales: 15200, orders: 11 },
      { day: "মঙ্গল", date: "2026-02-07", sales: 13800, orders: 9 },
      { day: "বুধ", date: "2026-02-08", sales: 18500, orders: 14 },
      { day: "বৃহ", date: "2026-02-09", sales: 21000, orders: 16 },
      { day: "শুক্র", date: "2026-02-10", sales: 24800, orders: 19 },
      { day: "শনি", date: "2026-02-11", sales: 28300, orders: 22 },
    ],
    monthly: {
      currentMonth: "ফেব্রু ২০২৬",
      totalSales: 134100,
      totalOrders: 99,
      avgOrderValue: 1354,
      growthPercent: 18.5,
    },
  },
  servicePopularity: [
    { service: "কনসালটেশন", count: 45, revenue: 67500 },
    { service: "ভ্যাকসিনেশন", count: 32, revenue: 48000 },
    { service: "গ্রুমিং", count: 28, revenue: 56000 },
    { service: "সার্জারি", count: 8, revenue: 120000 },
    { service: "ডেন্টাল", count: 12, revenue: 36000 },
  ],
  customerGrowth: {
    timeline: [
      { month: "সেপ ২০২৫", newCustomers: 12, returningCustomers: 0 },
      { month: "অক্টো ২০২৫", newCustomers: 18, returningCustomers: 5 },
      { month: "নভে ২০২৫", newCustomers: 24, returningCustomers: 11 },
      { month: "ডিসে ২০২৫", newCustomers: 31, returningCustomers: 18 },
      { month: "জানু ২০২৬", newCustomers: 38, returningCustomers: 25 },
      { month: "ফেব্রু ২০২৬", newCustomers: 45, returningCustomers: 33 },
    ],
    retentionRate: 73.2,
    totalActiveCustomers: 141,
  },
  productCategoryBreakdown: [
    { category: "খাদ্য", percentage: 40, revenue: 53640 },
    { category: "খেলনা", percentage: 25, revenue: 33525 },
    { category: "অ্যাকসেসরিজ", percentage: 20, revenue: 26820 },
    { category: "ওষুধ", percentage: 15, revenue: 20115 },
  ],
  petOwnerActivity: {
    recentActions: [
      { time: "২ ঘণ্টা আগে", action: "ভ্যাকসিনেশন অ্যাপয়েন্টমেন্ট বুক", customer: "ফারহান আ." },
      { time: "৪ ঘণ্টা আগে", action: "৩টি পণ্য ক্রয় (খাদ্য, খেলনা)", customer: "নাজিয়া র." },
      { time: "৬ ঘণ্টা আগে", action: "গ্রুমিং সেবা সম্পন্ন", customer: "ইমরান ক." },
    ],
    conversionInsight: "সেবা নেওয়া গ্রাহকদের ৬৮% ৭ দিনের মধ্যে পণ্য কিনেছেন",
  },
} as const;
