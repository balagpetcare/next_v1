## Expiry Transfer Suggestions (Owner / Branch Manager) – বাংলা ডকুমেন্টেশন

### ১. ফিচার ওভারভিউ

- **উদ্দেশ্য**: একাধিক ব্রাঞ্চ থাকা অর্গানাইজেশনে যেসব প্রোডাক্টের মেয়াদ শিগগিরই শেষ হবে সেগুলোকে এমন ব্রাঞ্চে পাঠানোর জন্য সাজেশন দেখানো, যেখানে ঐ প্রোডাক্ট বেশি বিক্রি হয়।
- **টাইপ**: Semi-automated flow
  - সিস্টেম সাজেশন তৈরি করবে।
  - Owner / Branch Manager টেবিল থেকে লাইন সিলেক্ট করে **এক-ক্লিকে Draft Stock Transfer** বানাতে পারবে।

এই পেইজটি মূলত **Owner Panel → Branch Dashboard ecosystem**-এর একটি এক্সটেনশন, যেখানে ইনভেন্টরি এবং এক্সপায়ারি কনটেক্সটে ব্রাঞ্চ-টু-ব্রাঞ্চ মুভমেন্ট প্ল্যানিং করা হবে।

---

### ২. পেইজ লোকেশন ও রাউটিং (প্রস্তাবিত)

- **Path (প্রস্তাব)**:  
  - `/owner/organizations/[id]/branches/[branchId]/expiry-transfers`
- **ফাইল স্ট্রাকচার (Branch Dashboard ডক অনুসারে)**:

```text
app/owner/
├── _components/
│   └── branch/
│       ├── BranchMetricsCards.jsx
│       ├── BranchCharts.jsx
│       ├── BranchDashboard.jsx
│       └── BranchExpiryTransferSuggestions.jsx   # নতুন কম্পোনেন্ট (প্রস্তাবিত)
├── organizations/
│   └── [id]/
│       └── branches/
│           └── [branchId]/
│               ├── page.jsx                      # মূল ড্যাশবোর্ড
│               └── expiry-transfers/
│                   └── page.jsx                  # Expiry Transfer Suggestions পেইজ (প্রস্তাব)
└── _lib/
    └── ownerApi.ts                               # API হেল্পার
```

> নোট: চূড়ান্ত ফাইল-স্ট্রাকচার Owner মডিউলের মেইনটেইনার টিম কনফার্ম করবে, তবে টেবিল ও UI বিহেভিয়ার এই ডকে নির্দিষ্ট করা আছে।

---

### ৩. মূল UI সেকশনসমূহ

#### ৩.১ ফিল্টার বার

- **ফিল্টার / ইনপুট**:
  - `Organization` (রুট লেভেল থেকে আসবে – URL এর `[id]`)
  - `Source Branch` (ডিফল্ট: বর্তমান `branchId`)
  - `Days Ahead` (ডিফল্ট: ৪৫ দিন, অপশন: ৩০ / ৪৫ / ৬০ / Custom)
  - `Product / Brand / Category` সার্চ (optional, টেবিল ফল্টারিং)
  - `Only my branch as source` toggle (বর্তমানে নির্বাচিত ব্রাঞ্চের জন্য)
- **অ্যাকশন বাটন**:
  - `Refresh Suggestions`

#### ৩.২ Suggestions Table

**টেবিল কলাম (প্রস্তাবিত)**:

- `Select` (Checkbox)
- `Source Branch` (নাম)
- `Target Branch` (Suggested)
- `Product`:
  - নাম (প্রয়োজন হলে বাংলা + ইংরেজি)
  - SKU / Variant টাইটেল
- `Expiry`:
  - `Expiry Date`
  - `Days to Expiry`
- `Available Qty` (Source branch)
- `Suggested Transfer Qty` (editable সেলে input)
- `Status/Flags`:
  - `High Priority` (যদি Days to Expiry খুব কম হয়)
  - `Target Over-stock Risk` (যদি backend flag পাঠায়)

**ইন্টারঅ্যাকশন**:

- প্রতিটি রোতে:
  - Checkbox → multi-select
  - `Suggested Transfer Qty` editable, তবে:
    - `0 < qty <= availableQty` রেঞ্জে থাকতে হবে (client-side validation)
    - Backend validation আলাদা থাকবে।

#### ৩.৩ Summary ও Action Bar

- নির্বাচিত লাইনের ভিত্তিতে Summary:
  - `Total Variants Selected`
  - `Total Quantity` (sum of suggestedQty)
  - `Source Branch` (যদি single-source মোড) অথবা `Multiple source` indicator
- Action Buttons:
  - `Create Draft Transfer` (primary)
  - `Clear Selection`

Action ফ্লো:

1. ইউজার কিছু লাইন সিলেক্ট করে।
2. `Create Draft Transfer` চাপলে:
   - যদি সব রো একই `sourceBranchId + targetBranchId` শেয়ার করে:
     - একটিই draft transfer তৈরি হবে।
   - যদি ভিন্ন কম্বো থাকে:
     - context অনুযায়ী একাধিক draft transfer (per source/target pair) তৈরি করা যেতে পারে  
       (প্রথম ভার্সনে UI-তে warning দেখিয়ে per-pair বানানোর আগে কনফার্মেশন নেয়া যেতে পারে)।

---

### ৪. API ইন্টিগ্রেশন (ব্যাকএন্ড সমন্বয়)

#### ৪.১ Suggestions ফেচ API

- **প্রস্তাবিত এন্ডপয়েন্ট**:

```http
GET /api/v1/transfers/expiry-suggestions?orgId={orgId}&sourceBranchId={branchId}&daysAhead={45}
```

- **রেস্পন্স (উদাহরণ কাঠামো)**:

```json
{
  "success": true,
  "data": [
    {
      "sourceBranchId": 1,
      "sourceBranchName": "Branch A",
      "targetBranchId": 2,
      "targetBranchName": "Branch B",
      "productId": 10,
      "productName": "Product X",
      "variantId": 101,
      "variantTitle": "500ml Bottle",
      "daysToExpiry": 30,
      "expiryDate": "2026-03-01",
      "availableQty": 120,
      "suggestedQty": 80,
      "flags": {
        "highPriority": true,
        "targetOverstockRisk": false
      }
    }
  ]
}
```

> এই data backend-এর `TransferRuleEngine` (backend-api/docs/INVENTORY_EXPIRY_TRANSFER_BN.md) থেকে আসবে।

#### ৪.২ Draft Transfer Creation API

- **প্রস্তাবিত এন্ডপয়েন্ট**:

```http
POST /api/v1/transfers/from-suggestions
Content-Type: application/json
```

**রিকুয়েস্ট বডি (উদাহরণ)**:

```json
{
  "fromBranchId": 1,
  "toBranchId": 2,
  "items": [
    { "variantId": 101, "quantity": 80 },
    { "variantId": 102, "quantity": 40 }
  ]
}
```

- ফ্রন্টএন্ড থেকে:
  - শুধু সিলেক্টেড রো গুলো থেকে `{ variantId, quantity }` বানিয়ে পাঠাবে।
- ব্যাকএন্ড:
  - `transfers.service.createTransfer(...)` কল করে `StockTransfer` + `StockTransferItem` এ draft তৈরি করবে।

**রেস্পন্স (উদাহরণ)**:

```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "DRAFT",
    "fromLocation": { "id": 1, "name": "Branch A" },
    "toLocation": { "id": 2, "name": "Branch B" },
    "items": [
      {
        "variantId": 101,
        "quantitySent": 80,
        "variant": { "sku": "SKU-101", "title": "500ml Bottle" }
      }
    ]
  }
}
```

---

### ৫. UI স্টেট ও লোডিং/এরর বিহেভিয়ার

- **Loading States**:
  - Suggestions লোডের সময় skeleton/loader দেখানো।
  - Draft তৈরি করার সময় বাটনে loading state (`Creating...`)।
- **Error Handling**:
  - API error হলে বাংলা ফ্রেন্ডলি মেসেজ:
    - যেমন: “সাজেশন লোড করতে সমস্যা হয়েছে। দয়া করে কিছুক্ষণ পরে চেষ্টা করুন।”
  - Validation error (যেমন insufficient stock, backend থেকে error message) স্পষ্টভাবে দেখানো।
- **Empty State**:
  - যদি কোনো সাজেশন না থাকে:
    - “এই ব্রাঞ্চের জন্য নির্দিষ্ট সময়ের মধ্যে এক্সপায়ারি-রিস্ক আইটেম পাওয়া যায়নি।”

---

### ৬. ফ্রন্টএন্ড কম্পোনেন্ট স্ট্রাকচার (প্রস্তাবনা)

```text
app/owner/_components/branch/
├── BranchExpiryFilterBar.jsx
├── BranchExpirySuggestionsTable.jsx
└── BranchExpiryTransferSuggestions.jsx   # পেইজ কম্পোনেন্টে ব্যবহৃত র্যাপার
```

- **`BranchExpiryFilterBar.jsx`**:
  - DaysAhead সিলেক্টর, সার্চ, Refresh বাটন।
  - Props: `filters`, `onChange`, `onRefresh`.
- **`BranchExpirySuggestionsTable.jsx`**:
  - Suggestions টেবিল রেন্ডার।
  - Props:
    - `rows`
    - `selectedRowIds`
    - `onToggleRow`
    - `onQtyChange`
    - `loading`
- **`BranchExpiryTransferSuggestions.jsx`**:
  - ডাটা ফেচিং + স্টেট ম্যানেজমেন্ট + Summary + Action Bar।

> টেকনিক্যাল ইমপ্লিমেন্টেশন করার সময় WOWDASH UI standard অনুসারে টেবিল, কার্ড, বাটন ও ফিল্টার কম্পোনেন্ট ব্যবহার করতে হবে।

---

### ৭. পারমিশন ও সিকিউরিটি কনসিডারেশন

- এই পেইজে অ্যাক্সেস:
  - Owner / Org Admin / Branch Manager (যাদের কাছে ইনভেন্টরি ও ট্রান্সফার পারমিশন আছে)।
- Draft Transfer তৈরি:
  - শুধুমাত্র সেই ব্যবহারকারী রোলদের জন্য যাদের **stock transfer create** পারমিশন already আছে।
- UI-তে:
  - Unauthorized অ্যাক্সেস হলে proper “Access denied” মেসেজ।

---

### ৮. ভবিষ্যৎ এক্সটেনশন আইডিয়া (UI-লেভেল)

- Suggestions টেবিলে:
  - `Priority` কলামে রঙ-ভিত্তিক badge (High / Medium / Low)।
  - Inline “View Transfer” লিঙ্ক যদি কোনো suggestion already transfer-এ কনভার্ট হয়ে যায় (history)।
- Filters:
  - `Show only High Priority` টগল।
  - `Group by Product` / `Group by Target Branch` ভিউ।
- Branch Dashboard ইন্টিগ্রেশন:
  - Branch Dashboard-এর স্টক সেকশনের ভেতর থেকে “View Expiry Suggestions” শর্টকাট বাটন।

---

### ৯. টেস্টিং চেকলিস্ট (UI)

- **ফাংশনাল টেস্ট**:
  - [ ] Suggestions লোড হচ্ছে কি না (বিভিন্ন daysAhead সহ)।
  - [ ] টেবিল সিলেকশন (single/multiple) সঠিকভাবে কাজ করছে কি না।
  - [ ] Suggested Qty এডিট করলে Summary আপডেট হচ্ছে কি না।
  - [ ] Draft Transfer সফলভাবে তৈরি হচ্ছে কি না (success toast/alert)।
  - [ ] Error response এ সঠিক error মেসেজ দেখাচ্ছে কি না।
- **পারমিশন টেস্ট**:
  - [ ] Unauthorized role দিয়ে চেষ্টা করলে API 403 / error দেখাচ্ছে কি না।
  - [ ] শুধুমাত্র অনুমোদিত Owner/Manager রোলদের জন্য পেইজ দৃশ্যমান কি না।
- **UX টেস্ট**:
  - [ ] মোবাইল / ছোট স্ক্রিনে টেবিল হরাইজন্টাল স্ক্রল ঠিকমতো কাজ করছে কি না।
  - [ ] Loading এবং Empty state ভিজুয়াল ক্লিয়ার কি না।

---

### ১০. সারাংশ

- এই ডকুমেন্টে Owner / Branch Manager-এর জন্য **Expiry Transfer Suggestions** পেইজের:
  - Route/location
  - Table structure
  - Filter ও Actions
  - Backend API কনট্রাক্ট
  - Component structure
  - Testing checklist
স্পষ্টভাবে নির্দিষ্ট করা হয়েছে।

- ব্যাকএন্ড-সাইডের TransferRuleEngine ও মডেল ম্যাপিং-এর বিস্তারিত ডিজাইন `backend-api/docs/INVENTORY_EXPIRY_TRANSFER_BN.md` ফাইলে নথিভুক্ত আছে – এই UI সেই API-গুলোর উপর বসে কাজ করবে।

