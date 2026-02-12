const fs = require("fs");
const path = require("path");
const enPath = path.join(__dirname, "../app/(public)/_locales/en.json");
const bnPath = path.join(__dirname, "../app/(public)/_locales/bn.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const bn = JSON.parse(fs.readFileSync(bnPath, "utf8"));

en.common.noItemsFoundWithEntity = "No {entity} found";
en.common.noResultsForQuery = 'No results for "{query}"';
bn.common.noItemsFoundWithEntity = "{entity} পাওয়া যায়নি";
bn.common.noResultsForQuery = '"{query}"-এর জন্য কোনো ফলাফল নেই';

en.header.navEcosystem = "Ecosystem";
en.header.navSteps = "Steps";
en.header.navBenefits = "Benefits";
en.header.navFaq = "FAQ";
bn.header.navEcosystem = "ইকোসিস্টেম";
bn.header.navSteps = "ধাপ";
bn.header.navBenefits = "সুবিধা";
bn.header.navFaq = "প্রশ্নোত্তর";

en.common.owner = "Owner";
en.common.items = "Items";
bn.common.owner = "ওনার";
bn.common.items = "আইটেম";

// Menu labels: use nested menu.owner.dashboard etc. for getNested()
en.menu = {
  owner: {
    dashboard: "Dashboard",
    myBusiness: "My Business",
    orgs: "Organizations",
    branches: "Branches",
    staffs: "Staffs",
    accessStaff: "Access & Staff",
    requests: "Requests & Approvals",
    inventory: "Inventory",
    products: "Products",
    finance: "Finance",
    audit: "Audit & System",
    teams: "Teams",
    notifications: "Notifications",
    workspace: "Workspace",
  },
  admin: {
    dashboard: "Dashboard",
    home: "Home",
  },
};
bn.menu = {
  owner: {
    dashboard: "ড্যাশবোর্ড",
    myBusiness: "আমার ব্যবসা",
    orgs: "সংগঠন",
    branches: "শাখা",
    staffs: "স্টাফ",
    accessStaff: "অ্যাক্সেস ও স্টাফ",
    requests: "অনুরোধ ও অনুমোদন",
    inventory: "ইনভেন্টরি",
    products: "পণ্য",
    finance: "আর্থিক",
    audit: "অডিট ও সিস্টেম",
    teams: "টিম",
    notifications: "নোটিফিকেশন",
    workspace: "ওয়ার্কস্পেস",
  },
  admin: {
    dashboard: "ড্যাশবোর্ড",
    home: "হোম",
  },
};

fs.writeFileSync(enPath, JSON.stringify(en));
fs.writeFileSync(bnPath, JSON.stringify(bn));
console.log("Phase 3 locale keys added");
