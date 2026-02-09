/**
 * Runtime validation for useRecentLocations assertion helpers.
 * Run: node scripts/validate-recent-locations.cjs
 * Ensures assertCountryCode and assertLastAddressPreview prevent mixed types.
 */

const assertCountryCode = (code) => {
  if (typeof code !== "string" || code.length < 2 || code.length > 3) return false;
  return /^[A-Z]{2,3}$/i.test(code);
};

const assertLastAddressPreview = (v) => {
  if (!v || typeof v !== "object") return false;
  const o = v;
  return (
    typeof o.formattedAddress === "string" &&
    o.formattedAddress.length > 0 &&
    typeof o.lat === "number" &&
    Number.isFinite(o.lat) &&
    typeof o.lng === "number" &&
    Number.isFinite(o.lng)
  );
};

let ok = 0;
let fail = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      ok++;
      console.log("✓", name);
    } else {
      fail++;
      console.log("✗", name);
    }
  } catch (e) {
    fail++;
    console.log("✗", name, e.message);
  }
}

test("assertCountryCode: valid BD", () => assertCountryCode("BD"));
test("assertCountryCode: valid CA", () => assertCountryCode("CA"));
test("assertCountryCode: valid SAU", () => assertCountryCode("SAU"));
test("assertCountryCode: rejects number", () => !assertCountryCode(123));
test("assertCountryCode: rejects long string", () => !assertCountryCode("BANGLADESH"));
test("assertCountryCode: rejects object", () => !assertCountryCode({ code: "BD" }));
test("assertCountryCode: rejects empty", () => !assertCountryCode(""));

test("assertLastAddressPreview: valid", () =>
  assertLastAddressPreview({ formattedAddress: "123 Main St", lat: 23.8, lng: 90.4 }));
test("assertLastAddressPreview: rejects formatted address as country chip", () =>
  !assertLastAddressPreview("Dhaka, Bangladesh"));
test("assertLastAddressPreview: rejects array", () => !assertLastAddressPreview(["BD"]));
test("assertLastAddressPreview: rejects missing lat", () =>
  !assertLastAddressPreview({ formattedAddress: "x", lng: 90 }));
test("assertLastAddressPreview: rejects empty formattedAddress", () =>
  !assertLastAddressPreview({ formattedAddress: "", lat: 1, lng: 2 }));

console.log("\n" + ok + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
