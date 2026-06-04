export function canViewInboundTransfersQueue(
  permissions: string[] | undefined | null,
  isWarehouseHub: boolean,
): boolean;

export function canReceiveStockAtBranch(permissions: string[] | undefined | null): boolean;

export function canSeeDispatchPrintMenu(permissions: string[] | undefined | null): boolean;

export function canViewReceiveDispatchWorkspace(permissions: string[] | undefined | null): boolean;

export function canViewReceiveCenterPage(
  permissions: string[] | undefined | null,
  isWarehouseHub: boolean,
): boolean;

export function canLoadPendingPoReceipts(permissions: string[] | undefined | null): boolean;

export function nextReceiveActionHint(code: string | undefined): string;

export function inboundDispatchPrimaryLabel(
  row: {
    nextReceiveAction: string;
    kind: string;
    dispatchReceiveSession?: { status?: string } | null;
  },
  canReceive: boolean,
): string;

export function dispatchStatusBadgeClass(status: string | undefined): string;

export function receiveSessionStatusBadgeClass(status: string | undefined): string;

export function receiveSessionStatusLabel(status: string | null | undefined): string;

export function formatInboundTimestamp(iso: string | undefined | null): string;
