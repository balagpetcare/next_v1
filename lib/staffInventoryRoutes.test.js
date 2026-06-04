import { test } from "node:test";
import assert from "node:assert/strict";
import {
  staffBranchPickerPath,
  staffBranchInventoryPath,
  staffDispatchReceiveWorkspacePath,
  staffInboundTransfersPath,
  staffReceiveCenterPath,
  staffReceiveCenterWithTransferPath,
  staffIncomingShipmentsPath,
  staffDispatchPrintPath,
  staffLegacyTransfersIncomingPath,
  staffStockRequestDetailPath,
  staffWarehouseReceivePoQueryPath,
  staffVendorReceiptDetailPath,
} from "./staffInventoryRoutes.js";

test("staffInboundTransfersPath", () => {
  assert.equal(staffInboundTransfersPath(12), "/staff/branch/12/warehouse/inbound-transfers");
});

test("staffDispatchReceiveWorkspacePath without query", () => {
  assert.equal(staffDispatchReceiveWorkspacePath(3, 99), "/staff/branch/3/inventory/receive-dispatch/99");
});

test("staffDispatchReceiveWorkspacePath with from=inbound", () => {
  assert.equal(
    staffDispatchReceiveWorkspacePath(3, 99, { from: "inbound" }),
    "/staff/branch/3/inventory/receive-dispatch/99?from=inbound"
  );
});

test("staffDispatchReceiveWorkspacePath with from=incoming", () => {
  assert.equal(
    staffDispatchReceiveWorkspacePath(3, 99, { from: "incoming" }),
    "/staff/branch/3/inventory/receive-dispatch/99?from=incoming"
  );
});

test("staffDispatchPrintPath", () => {
  assert.equal(
    staffDispatchPrintPath(1, 55, "delivery-note"),
    "/staff/branch/1/inventory/dispatch-print/55?doc=delivery-note"
  );
});

test("staffStockRequestDetailPath", () => {
  assert.equal(staffStockRequestDetailPath(7, 1001), "/staff/branch/7/inventory/stock-request-detail/1001");
});

test("staffReceiveCenterPath and incoming", () => {
  assert.equal(staffReceiveCenterPath(4), "/staff/branch/4/inventory/receive");
  assert.equal(staffIncomingShipmentsPath(4), "/staff/branch/4/inventory/incoming");
});

test("staffLegacyTransfersIncomingPath", () => {
  assert.equal(staffLegacyTransfersIncomingPath(8), "/staff/branch/8/inventory/transfers?tab=incoming");
});

test("staffBranchPickerPath", () => {
  assert.equal(staffBranchPickerPath(), "/staff/branch");
});

test("staffBranchInventoryPath", () => {
  assert.equal(staffBranchInventoryPath(2), "/staff/branch/2/inventory");
});

test("staffReceiveCenterWithTransferPath", () => {
  assert.equal(staffReceiveCenterWithTransferPath(3, 9), "/staff/branch/3/inventory/receive?transfer=9");
});

test("staffWarehouseReceivePoQueryPath", () => {
  assert.equal(
    staffWarehouseReceivePoQueryPath(1, { purchaseOrderId: 10, vendorId: 5 }),
    "/staff/branch/1/warehouse/receive-po?purchaseOrderId=10&vendorId=5"
  );
});

test("staffVendorReceiptDetailPath", () => {
  assert.equal(staffVendorReceiptDetailPath(3, 17), "/staff/branch/3/warehouse/vendor-receipts/17");
});

test("staffVendorReceiptDetailPath with query", () => {
  assert.equal(
    staffVendorReceiptDetailPath(3, 17, { focus: "discrepancy" }),
    "/staff/branch/3/warehouse/vendor-receipts/17?focus=discrepancy"
  );
});
