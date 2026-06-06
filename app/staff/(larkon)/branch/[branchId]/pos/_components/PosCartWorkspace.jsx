 
"use client";

import PosCartTabs from "./PosCartTabs";
import PosScannerInput from "./PosScannerInput";
import PosCartTable from "./PosCartTable";
import PosActionBar from "./PosActionBar";

export default function PosCartWorkspace({
  quickInputRef,
  openCarts,
  heldCarts,
  activeCartId,
  posCartBusy,
  onSelectCart,
  onResumeHeldCart,
  onCreateCart,
  onRequestCloseCart,
  canSell,
  barcodeLoading,
  barcodeInput,
  onBarcodeInputChange,
  scanMode,
  onToggleScanMode,
  onQuickEntrySubmit,
  scanLineStatus,
  scanFlash,
  displayLines,
  canDiscountOverride,
  onIncrementLine,
  onDecrementLine,
  onPersistLineQty,
  onApplyLineDiscount,
  onRemoveLine,
  noteSaving,
  cartNoteDraft,
  onCartNoteDraftChange,
  onPersistCartNote,
  onHoldActivePosCart,
  onAbandonAndNewCart,
  grandTotal,
  onScrollToCheckout,
}) {
  return (
    <div className="pos-cart-workspace d-flex flex-column gap-6 h-100 min-h-0">
      <PosCartTabs
        carts={openCarts}
        heldCarts={heldCarts}
        activeCartId={activeCartId}
        busy={posCartBusy}
        onSelectCart={onSelectCart}
        onResumeHeldCart={onResumeHeldCart}
        onCreateCart={onCreateCart}
        onRequestCloseCart={onRequestCloseCart}
        className="mb-0"
      />

      <PosScannerInput
        ref={quickInputRef}
        canSell={canSell}
        barcodeLoading={barcodeLoading}
        barcodeInput={barcodeInput}
        onBarcodeInputChange={onBarcodeInputChange}
        scanMode={scanMode}
        onToggleScanMode={onToggleScanMode}
        onSubmit={onQuickEntrySubmit}
        scanLineStatus={scanLineStatus}
        scanFlash={scanFlash}
      />

      <div className="pos-cart-table-host">
        <PosCartTable
          lines={displayLines}
          canSell={canSell}
          canDiscountOverride={canDiscountOverride}
          busy={posCartBusy}
          onIncrementLine={onIncrementLine}
          onDecrementLine={onDecrementLine}
          onPersistLineQty={onPersistLineQty}
          onApplyLineDiscount={onApplyLineDiscount}
          onRemoveLine={onRemoveLine}
          cardClassName="mb-0 flex-grow-1 d-flex flex-column min-h-0 pos-cart-table-root"
        />
      </div>

      <PosActionBar
        canSell={canSell}
        posCartBusy={posCartBusy}
        noteSaving={noteSaving}
        cartNoteDraft={cartNoteDraft}
        onCartNoteDraftChange={onCartNoteDraftChange}
        onPersistCartNote={onPersistCartNote}
        onHoldActivePosCart={onHoldActivePosCart}
        onAbandonAndNewCart={onAbandonAndNewCart}
        displayLinesLength={Array.isArray(displayLines) ? displayLines.length : 0}
        activeCartId={activeCartId}
        grandTotal={grandTotal}
        onScrollToCheckout={onScrollToCheckout}
      />
    </div>
  );
}
