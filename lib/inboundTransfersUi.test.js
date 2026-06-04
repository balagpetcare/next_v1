import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canViewInboundTransfersQueue,
  canReceiveStockAtBranch,
  canSeeDispatchPrintMenu,
  canViewReceiveDispatchWorkspace,
  canViewReceiveCenterPage,
  canLoadPendingPoReceipts,
  nextReceiveActionHint,
  inboundDispatchPrimaryLabel,
  dispatchStatusBadgeClass,
  receiveSessionStatusBadgeClass,
  receiveSessionStatusLabel,
  formatInboundTimestamp,
} from "./inboundTransfersUi.js";

test("canViewInboundTransfersQueue: inventory.read alone", () => {
  assert.equal(canViewInboundTransfersQueue(["branch.view", "dashboard.view", "inventory.read"], false), true);
});

test("canViewInboundTransfersQueue: dispatch.view", () => {
  assert.equal(canViewInboundTransfersQueue(["dispatch.view"], false), true);
});

test("canViewInboundTransfersQueue: hub + warehouse.view", () => {
  assert.equal(canViewInboundTransfersQueue(["warehouse.view"], true), true);
});

test("canViewInboundTransfersQueue: hub false with only warehouse.view", () => {
  assert.equal(canViewInboundTransfersQueue(["warehouse.view"], false), false);
});

test("canReceiveStockAtBranch", () => {
  assert.equal(canReceiveStockAtBranch(["inventory.receive"]), true);
  assert.equal(canReceiveStockAtBranch(["inbound.receive"]), true);
  assert.equal(canReceiveStockAtBranch(["inventory.read"]), false);
});

test("canSeeDispatchPrintMenu", () => {
  assert.equal(canSeeDispatchPrintMenu(["dispatch.view"]), true);
  assert.equal(canSeeDispatchPrintMenu([]), false);
});

test("nextReceiveActionHint known code", () => {
  assert.match(nextReceiveActionHint("COMPLETED"), /complete/i);
});

test("inboundDispatchPrimaryLabel read-only completed", () => {
  assert.equal(
    inboundDispatchPrimaryLabel(
      { kind: "DISPATCH", nextReceiveAction: "COMPLETED", dispatchReceiveSession: { status: "POSTED" } },
      false
    ),
    "View"
  );
});

test("inboundDispatchPrimaryLabel receive enabled", () => {
  assert.equal(
    inboundDispatchPrimaryLabel({ kind: "DISPATCH", nextReceiveAction: "START_RECEIVE_DRAFT", dispatchReceiveSession: null }, true),
    "Receive"
  );
});

test("dispatchStatusBadgeClass", () => {
  assert.equal(dispatchStatusBadgeClass("IN_TRANSIT"), "bg-info");
  assert.equal(dispatchStatusBadgeClass("SENT"), "bg-info");
});

test("receiveSessionStatusBadgeClass and label", () => {
  assert.equal(receiveSessionStatusBadgeClass("DRAFT"), "bg-info text-dark");
  assert.equal(receiveSessionStatusLabel("AWAITING_CONFIRMATION"), "AWAITING CONFIRMATION");
});

test("formatInboundTimestamp invalid", () => {
  assert.equal(formatInboundTimestamp(null), "—");
});

test("canViewReceiveDispatchWorkspace dispatch.view read-only", () => {
  assert.equal(canViewReceiveDispatchWorkspace(["dispatch.view"]), true);
  assert.equal(canViewReceiveDispatchWorkspace(["tasks.view"]), false);
});

test("canViewReceiveCenterPage mirrors inbound queue", () => {
  assert.equal(canViewReceiveCenterPage(["inventory.read"], false), canViewInboundTransfersQueue(["inventory.read"], false));
});

test("canLoadPendingPoReceipts", () => {
  assert.equal(canLoadPendingPoReceipts(["grn.post"]), true);
  assert.equal(canLoadPendingPoReceipts(["inventory.read"]), false);
});
