import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getEligibleStockRequestLinesForPoPrefill,
  mapEligibleStockRequestItemsToPoPrefillPatches,
  parseOwnerStockRequestPrefillId,
  stockRequestDetailFromOwnerGetBody,
} from "./stockRequestPoPrefill.js";

test("parseOwnerStockRequestPrefillId — missing", () => {
  assert.deepEqual(parseOwnerStockRequestPrefillId(null), { ok: false, reason: "missing" });
  assert.deepEqual(parseOwnerStockRequestPrefillId(""), { ok: false, reason: "missing" });
  assert.deepEqual(parseOwnerStockRequestPrefillId("   "), { ok: false, reason: "missing" });
});

test("parseOwnerStockRequestPrefillId — invalid", () => {
  assert.deepEqual(parseOwnerStockRequestPrefillId("abc"), { ok: false, reason: "invalid" });
  assert.deepEqual(parseOwnerStockRequestPrefillId("17.5"), { ok: false, reason: "invalid" });
  assert.deepEqual(parseOwnerStockRequestPrefillId("-1"), { ok: false, reason: "invalid" });
});

test("parseOwnerStockRequestPrefillId — ok", () => {
  assert.deepEqual(parseOwnerStockRequestPrefillId("17"), { ok: true, id: 17 });
  assert.deepEqual(parseOwnerStockRequestPrefillId("  42  "), { ok: true, id: 42 });
});

test("stockRequestDetailFromOwnerGetBody", () => {
  assert.equal(stockRequestDetailFromOwnerGetBody(null), null);
  assert.equal(stockRequestDetailFromOwnerGetBody({}), null);
  assert.deepEqual(stockRequestDetailFromOwnerGetBody({ success: true, data: { id: 1, items: [] } }), {
    id: 1,
    items: [],
  });
  assert.deepEqual(stockRequestDetailFromOwnerGetBody({ id: 9, status: "X" }), { id: 9, status: "X" });
});

test("getEligibleStockRequestLinesForPoPrefill — eligibility", () => {
  const items = [
    { id: 1, variantId: 10, requestedQty: 5, fulfilledQty: 2, cancelledQty: 0, lineKind: "MAIN" },
    { id: 2, variantId: 11, requestedQty: 3, fulfilledQty: 3, cancelledQty: 0 },
    { id: 3, variantId: 12, requestedQty: 1, fulfilledQty: 0, cancelledQty: 1 },
    { id: 4, lineKind: "EXTRA", variantId: 99, requestedQty: 1, fulfilledQty: 0, cancelledQty: 0 },
    { id: 5, variantId: null, requestedQty: 1, fulfilledQty: 0, cancelledQty: 0 },
  ];
  const { allItems, eligible } = getEligibleStockRequestLinesForPoPrefill(items);
  assert.equal(allItems.length, 5);
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].remainingQty, 3);
  assert.equal(eligible[0].item.id, 1);
});

test("mapEligibleStockRequestItemsToPoPrefillPatches", () => {
  const eligible = [
    {
      item: {
        id: 7,
        variantId: 100,
        variant: { sku: "A", title: "T" },
        product: { name: "P" },
      },
      remainingQty: 4,
    },
  ];
  const patches = mapEligibleStockRequestItemsToPoPrefillPatches(eligible, 17);
  assert.equal(patches.length, 1);
  assert.deepEqual(patches[0], {
    variantId: 100,
    sku: "A",
    title: "T",
    productLabel: "P",
    orderedQty: "4",
    unitCost: "",
    note: "Stock request #17 line #7",
  });
});
