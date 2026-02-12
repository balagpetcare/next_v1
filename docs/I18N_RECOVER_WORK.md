# i18n কাজ ফেরত আনা / সেভ করা

## অবস্থা
- Phase 2, 3, 4 এর কোড ও লোকেল ফাইলগুলো **প্রজেক্টে এখনো আছে** (কমিট না করা অবস্থায়)।
- অনেক ফাইল Git-এ "modified" বা "untracked" দেখাবে।

## স্থায়ীভাবে সেভ করতে (কমিট + পুশ)

```powershell
cd D:\BPA_Data\bpa_web

# সব পরিবর্তন স্টেজ করুন (নতুন + মডিফাইড ফাইল)
git add app/(public)/
git add app/owner/dashboard/page.jsx app/owner/branches/page.jsx app/owner/orders/page.tsx
git add app/owner/_components/shared/EntityFilters.jsx app/owner/_components/shared/EntityListPage.jsx
git add app/owner/_components/shared/EntityDetailPage.jsx app/owner/_components/shared/EntityTable.jsx
git add app/admin/dashboard/page.jsx app/shop/page.jsx app/clinic/page.jsx app/staff/page.jsx
git add app/producer/dashboard/page.jsx app/mother/page.jsx app/country/dashboard/page.jsx
git add app/layout.jsx package.json eslint.config.mjs .eslintrc.json
git add src/masterLayout/MasterLayout.jsx src/lib/permissionMenu.ts
git add src/components/landing/
git add docs/I18N_*.md

# স্ট্যাটাস চেক
git status

# একটি কমিটে সেভ করুন
git commit -m "i18n Phase 2-4: landing, panels, nav/menu/breadcrumb, locale keys, lint config"

# রিমোটে পুশ (যদি রিমোট থাকে)
git push
```

## যদি কোনো ফাইল আগে "restore" বা "discard" করে থাকেন

- **কমিট করা ছিল:** `git reflog` চালিয়ে সেই কমিটের হ্যাশ দেখুন, তারপর `git checkout <hash> -- <file>` দিয়ে ফাইল ফেরত আনুন।
- **কমিট করা হয়নি:** Cursor/VSCode এর **Local History** (ফাইলে রাইট ক্লিক → Local History → Find in History) দিয়ে পুরনো ভার্সন খুঁজে দেখতে পারেন।

## দ্রুত চেক

- `app/(public)/_locales/en.json` এ `"owner":` এবং `"country":` keys থাকলে Phase 4 লোকেল ঠিক আছে।
- `app/owner/dashboard/page.jsx` এ `useLanguage()` এবং `t("owner.dashboardTitle")` থাকলে ওয়্যারিং ঠিক আছে।
