 
 
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  staffPosProducts,
  staffPosBarcodeLookup,
  staffPosReceipt,
  staffPosInvoice,
  staffPosMembershipResolve,
  staffPosCustomerLookup,
  staffPosCustomerEnsure,
  staffPosCartsList,
  staffPosCartCreate,
  staffPosCartGet,
  staffPosCartAddLine,
  staffPosCartPatchLine,
  staffPosCartDeleteLine,
  staffPosCartHold,
  staffPosCartResume,
  staffPosCartFinalize,
  staffPosCartAbandon,
  staffPosCartPatch,
} from "@/lib/api";
import PosShell from "./PosShell";
import PosCartWorkspace from "./PosCartWorkspace";
import PosProductPanel from "./PosProductPanel";
import PosCustomerPanel from "./PosCustomerPanel";
import PosMembershipPanel from "./PosMembershipPanel";
import PosCheckoutPanel from "./PosCheckoutPanel";
import PosPaymentSummary from "./PosPaymentSummary";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "MOBILE", label: "bKash" },
  { value: "ONLINE", label: "Nagad" },
];

function getDefaultCheckoutUi() {
  return {
    discountPreset: 0,
    discountCustom: "",
    paymentMethod: "CASH",
    receivedAmount: "",
    splitPayEnabled: false,
    splitPay2Method: "CARD",
    splitPay2Amount: "",
  };
}

function readCartNote(cart) {
  return typeof cart?.metadataJson?.note === "string" ? cart.metadataJson.note : "";
}

function readCustomerDraft(cart) {
  const raw = cart?.metadataJson?.customerDraft;
  if (!raw || typeof raw !== "object") {
    return { displayName: "", phone: "", email: "", address: "" };
  }
  return {
    displayName: typeof raw.displayName === "string" ? raw.displayName : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    email: typeof raw.email === "string" ? raw.email : "",
    address: typeof raw.address === "string" ? raw.address : "",
  };
}

function buildCustomerDraft(customer, fallback = {}) {
  return {
    displayName: customer?.displayName ?? fallback.displayName ?? "",
    phone: customer?.phone ?? fallback.phone ?? "",
    email: customer?.email ?? fallback.email ?? "",
    address: customer?.address ?? fallback.address ?? "",
  };
}

function normalizeCustomerMembershipPayload(raw) {
  return {
    customer: raw?.customer ?? null,
    pets: Array.isArray(raw?.pets) ? raw.pets : [],
    matches: Array.isArray(raw?.matches)
      ? raw.matches
      : Array.isArray(raw?.membershipCards)
        ? raw.membershipCards
        : [],
    selectedCard: raw?.selectedCard ?? raw?.selectedMembershipCard ?? null,
  };
}

function toStockValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isAvailablePosRow(row) {
  const stock = Number(row?.stock ?? 0);
  return row?.variantId != null && stock > 0;
}

/** Map API / validation messages to scanner status tone (UI only). */
function classifyPosScanMessage(msg) {
  const m = String(msg || "").toLowerCase();
  if (m.includes("not configured") || m.includes("price is not")) return "no_price";
  return "not_found";
}

export default function PosSaleWorkspace({
  branchId,
  bidNum,
  canView,
  canSell,
  canDiscountOverride,
  onOrdersMutated,
}) {
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productSearchDebounced, setProductSearchDebounced] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [scanMode, setScanMode] = useState(true);
  const [scannerTone, setScannerTone] = useState("ready");
  const [scanFlash, setScanFlash] = useState(false);
  const scanAddedResetRef = useRef(null);
  const quickInputRef = useRef(null);
  const scanKbRef = useRef({});

  const [activeCart, setActiveCart] = useState(null);
  const [posCarts, setPosCarts] = useState([]);
  const [posCartBusy, setPosCartBusy] = useState(false);
  const [closeCartRequest, setCloseCartRequest] = useState(null);

  const [cartUiById, setCartUiById] = useState({});
  const [cartNoteDraft, setCartNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const [customerLookup, setCustomerLookup] = useState("");
  const [customerDraft, setCustomerDraft] = useState({ displayName: "", phone: "", email: "", address: "" });
  const [customerContext, setCustomerContext] = useState(null);
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);

  const [membershipCodeInput, setMembershipCodeInput] = useState("");
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [membershipError, setMembershipError] = useState("");
  const [membershipMatches, setMembershipMatches] = useState([]);
  const [membershipSelectedId, setMembershipSelectedId] = useState(null);

  const [saleLoading, setSaleLoading] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [saleSuccess, setSaleSuccess] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [productCatalogLoading, setProductCatalogLoading] = useState(false);

  const scannerLineStatus = barcodeLoading ? "searching" : scannerTone;

  const refocusScanField = useCallback(() => {
    const run = () => {
      const el = quickInputRef.current;
      if (!el || !canSell) return;
      el.focus();
      if (scanMode) el.select();
    };
    if (typeof window === "undefined") return;
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => window.setTimeout(run, 0));
    } else {
      window.setTimeout(run, 30);
    }
  }, [canSell, scanMode]);

  const flashScanRing = useCallback(() => {
    setScanFlash(true);
    window.setTimeout(() => setScanFlash(false), 420);
  }, []);

  const scheduleScannerToneReady = useCallback(() => {
    if (scanAddedResetRef.current) window.clearTimeout(scanAddedResetRef.current);
    scanAddedResetRef.current = window.setTimeout(() => {
      setScannerTone("ready");
      scanAddedResetRef.current = null;
    }, 820);
  }, []);

  const markAddedPulse = useCallback(() => {
    setScannerTone("added");
    flashScanRing();
    scheduleScannerToneReady();
  }, [flashScanRing, scheduleScannerToneReady]);

  useEffect(() => {
    const onKey = (e) => {
      const x = scanKbRef.current;
      if (!x.canSell) return;
      const tag = (e.target && e.target.tagName || "").toLowerCase();
      const isMod = e.ctrlKey || e.metaKey;
      const el = e.target;
      const isOtherTextInput =
        tag === "textarea" ||
        (tag === "input" &&
          el !== quickInputRef.current &&
          ["text", "email", "tel", "password", "search", "url", "number"].includes(String(el.type || "text").toLowerCase()));

      if (e.code === "F2") {
        e.preventDefault();
        x.refocusScanField();
        return;
      }
      if (isMod && e.key.toLowerCase() === "n") {
        if (isOtherTextInput) return;
        e.preventDefault();
        void x.createNewPosCart();
        return;
      }
      if (isMod && e.key.toLowerCase() === "h") {
        if (isOtherTextInput) return;
        e.preventDefault();
        void x.holdActivePosCart();
        return;
      }
      if (e.key === "Escape") {
        if (x.closeCartRequest) {
          x.setCloseCartRequest(null);
          e.preventDefault();
          x.refocusScanField();
          return;
        }
        if (x.invoiceData !== null && x.invoiceData !== undefined) {
          x.setInvoiceData(null);
          e.preventDefault();
          x.refocusScanField();
          return;
        }
        if (x.receiptData !== null && x.receiptData !== undefined) {
          x.setReceiptData(null);
          e.preventDefault();
          x.refocusScanField();
          return;
        }
        e.preventDefault();
        x.setBarcodeInput("");
        x.setSaleError("");
        x.setScannerTone("ready");
        x.refocusScanField();
      }
    };
    if (typeof window === "undefined") return undefined;
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setProductSearchDebounced((productSearch || "").trim()), 320);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const refreshPosProducts = useCallback(async () => {
    if (!branchId || !canView) return;
    setProductCatalogLoading(true);
    try {
      const data = await staffPosProducts(branchId, productSearchDebounced || undefined);
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setProductCatalogLoading(false);
    }
  }, [branchId, canView, productSearchDebounced]);

  useEffect(() => {
    if (!branchId || !canView) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await staffPosProducts(branchId, productSearchDebounced || undefined);
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, canView, productSearchDebounced]);

  const refreshPosCartList = async () => {
    const list = await staffPosCartsList(branchId);
    const rows = Array.isArray(list) ? list : [];
    setPosCarts(rows);
    return rows;
  };

  const reloadActiveCart = async (cartId) => {
    const full = await staffPosCartGet(branchId, cartId);
    setActiveCart(full);
    return full;
  };

  const removeCartUiState = (cartId) => {
    setCartUiById((prev) => {
      if (cartId == null || !prev[cartId]) return prev;
      const next = { ...prev };
      delete next[cartId];
      return next;
    });
  };

  useEffect(() => {
    if (!branchId || !bidNum || !canSell) {
      setActiveCart(null);
      setPosCarts([]);
      return;
    }
    let cancelled = false;
    setPosCartBusy(true);
    setSaleError("");

    (async () => {
      try {
        const list = await refreshPosCartList();
        if (cancelled) return;
        const firstOpen = list.find((cart) => cart.status === "ACTIVE" || cart.status === "CHECKOUT");
        let nextCartId = firstOpen?.id ?? null;

        if (!nextCartId) {
          const created = await staffPosCartCreate(bidNum, undefined);
          const row = created?.data ?? created;
          nextCartId = row?.id ?? null;
          await refreshPosCartList();
        }

        if (!cancelled && nextCartId) {
          await reloadActiveCart(nextCartId);
        }
      } catch (error) {
        if (!cancelled) {
          setSaleError(error?.message ?? "POS cart unavailable");
        }
      } finally {
        if (!cancelled) setPosCartBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bidNum, branchId, canSell]);

  useEffect(() => {
    const draft = readCustomerDraft(activeCart);
    setCartNoteDraft(readCartNote(activeCart));
    setCustomerDraft(draft);
    setCustomerLookup(draft.phone || "");
    setCustomerError("");
    setShowCreateCustomer(false);
    setMembershipError("");
    setMembershipCodeInput("");

    if (!activeCart?.customerUserId) {
      setCustomerContext(null);
      setMembershipMatches([]);
      setMembershipSelectedId(activeCart?.ownerDiscountCardId ?? null);
      return;
    }

    let cancelled = false;
    setCustomerBusy(true);

    staffPosMembershipResolve(branchId, { customerUserId: activeCart.customerUserId })
      .then((raw) => {
        if (cancelled) return;
        const normalized = normalizeCustomerMembershipPayload(raw);
        const nextDraft = buildCustomerDraft(normalized.customer, draft);
        setCustomerContext({ customer: normalized.customer, pets: normalized.pets });
        setCustomerDraft(nextDraft);
        setCustomerLookup(nextDraft.phone || "");
        setMembershipMatches(normalized.matches);

        const selectedCard =
          normalized.matches.find((card) => card.ownerDiscountCardId === activeCart.ownerDiscountCardId) ??
          normalized.selectedCard ??
          null;
        setMembershipSelectedId(selectedCard?.ownerDiscountCardId ?? activeCart.ownerDiscountCardId ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setCustomerContext(null);
        setMembershipMatches([]);
        setMembershipSelectedId(activeCart?.ownerDiscountCardId ?? null);
      })
      .finally(() => {
        if (!cancelled) setCustomerBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCart?.customerUserId, activeCart?.id, activeCart?.ownerDiscountCardId, branchId]);

  useEffect(() => {
    if (!canSell) return;
    const timer = setTimeout(() => {
      quickInputRef.current?.focus();
      if (scanMode) quickInputRef.current?.select();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeCart?.id, scanMode, canSell, branchId]);

  const activeCheckoutUi = activeCart?.id != null ? cartUiById[activeCart.id] ?? getDefaultCheckoutUi() : getDefaultCheckoutUi();

  const updateActiveCheckoutUi = (patch) => {
    if (!activeCart?.id) return;
    setCartUiById((prev) => ({
      ...prev,
      [activeCart.id]: {
        ...getDefaultCheckoutUi(),
        ...(prev[activeCart.id] ?? {}),
        ...patch,
      },
    }));
  };

  const flattenProducts = useMemo(() => {
    const out = [];
    (products || []).forEach((product) => {
      const productName = String(product?.name || "");
      const categoryId = product?.category?.id != null ? String(product.category.id) : "uncategorized";
      const categoryName = product?.category?.name || "Uncategorized";
      const imageUrl = product?.media?.[0]?.media?.url || null;
      if (!Array.isArray(product?.variants) || product.variants.length === 0) return;

      (product.variants || []).forEach((variant) => {
        const stock = toStockValue(variant?.stock);
        const variantPrice =
          variant?.price != null && Number.isFinite(Number(variant.price))
            ? Number(variant.price)
            : null;
        out.push({
          productId: product.id,
          variantId: variant.id,
          name: productName,
          sku: variant?.sku ?? variant?.id ?? "",
          barcode: variant?.barcode ?? "",
          title: variant?.title ?? "",
          stock,
          price: variantPrice,
          sellPrice: variant?.sellPrice ?? variantPrice,
          effectiveSellPrice: variant?.effectiveSellPrice ?? variantPrice,
          priceSource: variant?.priceSource ?? null,
          priceMissing: variant?.priceMissing === true || variantPrice == null || !(Number(variantPrice) > 0),
          priceMissingReason: variant?.priceMissingReason ?? null,
          categoryId,
          categoryName,
          imageUrl,
          product,
          variant,
        });
      });
    });
    return out.filter(isAvailablePosRow);
  }, [products]);

  /** Qty of each variant already in the active cart — subtract from on-hand for consistent card/add limits. */
  const qtyInActiveCartByVariant = useMemo(() => {
    const m = new Map();
    for (const line of activeCart?.lines || []) {
      const vid = line?.variantId;
      if (vid == null) continue;
      m.set(vid, (m.get(vid) || 0) + Number(line.quantity || 0));
    }
    return m;
  }, [activeCart?.lines]);

  const flattenProductsForDisplay = useMemo(() => {
    return (flattenProducts || []).map((row) => {
      if (row?.variantId == null) {
        return row;
      }
      const inCart = Number(qtyInActiveCartByVariant.get(row.variantId) || 0);
      return {
        ...row,
        stock: Math.max(0, toStockValue(row.stock) - inCart),
      };
    }).filter(isAvailablePosRow);
  }, [flattenProducts, qtyInActiveCartByVariant]);

  const productCategories = useMemo(() => {
    const map = new Map();
    flattenProductsForDisplay.forEach((item) => {
      const key = item.categoryId || "uncategorized";
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        return;
      }
      map.set(key, { id: key, name: item.categoryName || "Uncategorized", count: 1 });
    });
    return [{ id: "all", name: "All", count: flattenProductsForDisplay.length }, ...Array.from(map.values())];
  }, [flattenProductsForDisplay]);

  useEffect(() => {
    if (productCategory === "all") return;
    const hasCategory = productCategories.some((row) => row.id === productCategory);
    if (!hasCategory) setProductCategory("all");
  }, [productCategories, productCategory]);

  const searchResults = useMemo(() => {
    const localQuery = String(productSearch || "").trim().toLowerCase();
    const filtered = flattenProductsForDisplay.filter((item) => {
      const categoryOk = productCategory === "all" || item.categoryId === productCategory;
      if (!categoryOk) return false;
      if (!localQuery) return true;
      const haystack = [
        item.name,
        item.sku,
        item.barcode,
        item.title,
        item.categoryName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(localQuery);
    });
    return filtered
      .sort((a, b) => {
        const stockDelta = Number(b.stock > 0) - Number(a.stock > 0);
        if (stockDelta !== 0) return stockDelta;
        return String(a.name || "").localeCompare(String(b.name || ""));
      })
      .slice(0, 60);
  }, [flattenProductsForDisplay, productCategory, productSearch]);

  const displayLines = useMemo(() => {
    return (activeCart?.lines || []).map((line) => ({
      key: `line-${line.id}`,
      lineId: line.id,
      productId: line.productId,
      variantId: line.variantId ?? null,
      productName: line.product?.name ?? `Product #${line.productId}`,
      variantName: line.variant?.title ?? "",
      sku: line.variant?.sku ?? "",
      quantity: Number(line.quantity || 0),
      price: Number(line.unitSellPrice || 0),
      listPrice: Number(line.unitListPrice || 0),
      lineTotal: Number(line.unitSellPrice || 0) * Number(line.quantity || 0),
      lotPreview: line.lotPreview ?? null,
      imageUrl: line.product?.media?.[0]?.media?.url || null,
    }));
  }, [activeCart]);

  const subtotal = useMemo(
    () => displayLines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0),
    [displayLines]
  );

  const membershipPct = Number(activeCart?.discountPercentSnapshot || 0) || 0;
  const manualDiscountPct =
    canDiscountOverride && activeCheckoutUi.discountCustom !== ""
      ? parseFloat(activeCheckoutUi.discountCustom) || 0
      : Number(activeCheckoutUi.discountPreset || 0);
  const combinedDiscountPct = Math.min(100, membershipPct + manualDiscountPct);
  const discountAmount = subtotal * (combinedDiscountPct / 100) || 0;
  const taxPercent = 0;
  const taxAmount = (subtotal - discountAmount) * (taxPercent / 100) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);
  const receivedAmountRaw = parseFloat(String(activeCheckoutUi.receivedAmount || "").replace(",", "."));
  const receivedAmount = Number.isFinite(receivedAmountRaw) ? receivedAmountRaw : 0;
  const changeAmount = Math.max(0, receivedAmount - grandTotal);

  const heldCarts = useMemo(
    () => (Array.isArray(posCarts) ? posCarts.filter((cart) => cart.status === "HELD") : []),
    [posCarts]
  );

  const openCarts = useMemo(
    () => (Array.isArray(posCarts) ? posCarts.filter((cart) => cart.status !== "HELD") : []),
    [posCarts]
  );

  const selectedMembershipCard = useMemo(
    () => membershipMatches.find((card) => card.ownerDiscountCardId === membershipSelectedId) ?? null,
    [membershipMatches, membershipSelectedId]
  );

  const patchActiveCart = async (body) => {
    if (!activeCart?.id || !bidNum) return null;
    const response = await staffPosCartPatch(bidNum, activeCart.id, {
      version: activeCart.version,
      ...body,
    });
    const row = response?.data ?? response;
    if (row?.id) setActiveCart(row);
    await refreshPosCartList();
    return row;
  };

  const syncCustomerAndMembership = (raw, fallbackDraft = customerDraft) => {
    const normalized = normalizeCustomerMembershipPayload(raw);
    const nextDraft = buildCustomerDraft(normalized.customer, fallbackDraft);
    const preferredCard = normalized.matches.find(
      (card) => card.ownerDiscountCardId === activeCart?.ownerDiscountCardId
    );
    setCustomerContext({ customer: normalized.customer, pets: normalized.pets });
    setCustomerDraft(nextDraft);
    setCustomerLookup(nextDraft.phone || "");
    setMembershipMatches(normalized.matches);
    setMembershipSelectedId(
      preferredCard?.ownerDiscountCardId ??
        normalized.selectedCard?.ownerDiscountCardId ??
        normalized.matches[0]?.ownerDiscountCardId ??
        null
    );
    return { normalized, nextDraft };
  };

  const membershipResetPatch = (nextCustomerId) => {
    if (!activeCart?.ownerDiscountCardId) return {};
    if (
      nextCustomerId != null &&
      activeCart?.customerUserId != null &&
      Number(nextCustomerId) === Number(activeCart.customerUserId)
    ) {
      return {};
    }
    return {
      ownerDiscountCardId: null,
      memberNameSnapshot: null,
      cardNumberSnapshot: null,
      discountPercentSnapshot: null,
    };
  };

  const addToCart = async (item, overridePrice) => {
    if (!canSell || !activeCart?.id || !bidNum) return false;
    if (Number(item?.stock ?? 0) <= 0) {
      setSaleError("This product is out of stock.");
      setScannerTone("not_found");
      refocusScanField();
      return false;
    }
    const rawPrice = overridePrice ?? item.variant?.price ?? item.price;
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setSaleError("Price is not configured for this product.");
      setScannerTone("no_price");
      refocusScanField();
      return false;
    }
    setPosCartBusy(true);
    setSaleError("");
    try {
      await staffPosCartAddLine(bidNum, activeCart.id, {
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: 1,
        unitListPrice: price,
        unitSellPrice: price,
      });
      await reloadActiveCart(activeCart.id);
      await refreshPosCartList();
      markAddedPulse();
      return true;
    } catch (error) {
      setSaleError(error?.message ?? "Add to cart failed");
      setScannerTone(classifyPosScanMessage(error?.message));
      return false;
    } finally {
      setPosCartBusy(false);
      refocusScanField();
    }
  };

  const findLocalProductMatch = (query) => {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return null;
    const exact = flattenProductsForDisplay.find(
      (item) =>
        String(item.barcode || "").toLowerCase() === normalized ||
        String(item.sku || "").toLowerCase() === normalized
    );
    if (exact) return exact;
    return flattenProductsForDisplay.find((item) => {
      const haystack = [item.name, item.sku, item.barcode, item.title].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  };

  const tryAddFromBarcode = async (code) => {
    const result = await staffPosBarcodeLookup(branchId, code);
    if (!result?.productId) return false;
    const inCartForVariant =
      result.variantId != null
        ? Number(qtyInActiveCartByVariant.get(result.variantId) || 0)
        : 0;
    const item = {
      productId: result.productId,
      variantId: result.variantId,
      name: result.product?.name ?? "",
      title: result.variant?.title ?? "Standard",
      sku: result.variant?.sku ?? result.variantId,
      stock: Math.max(0, toStockValue(result?.stock) - inCartForVariant),
      price: result.price,
      sellPrice: result.sellPrice ?? result.price,
      effectiveSellPrice: result.effectiveSellPrice ?? result.price,
      priceSource: result.priceSource ?? null,
      priceMissing: result.priceMissing === true || result.price == null || !(Number(result.price) > 0),
      priceMissingReason: result.priceMissingReason ?? null,
    };
    if (Number(item.stock || 0) <= 0) {
      setSaleError("Scanned product is out of stock.");
      setScannerTone("not_found");
      return false;
    }
    return (await addToCart(item, result.price)) === true;
  };

  const handleQuickEntrySubmit = async () => {
    const code = String(barcodeInput || "").trim();
    if (!code || !canSell) return;

    setSaleError("");
    setBarcodeLoading(true);
    try {
      let added = false;
      if (scanMode) {
        try {
          added = await tryAddFromBarcode(code);
        } catch {
          added = false;
        }
        if (!added) {
          const localMatch = findLocalProductMatch(code);
          if (localMatch) {
            await addToCart(localMatch);
            added = true;
          }
        }
      } else {
        const localMatch = findLocalProductMatch(code);
        if (localMatch) {
          await addToCart(localMatch);
          added = true;
        } else {
          added = await tryAddFromBarcode(code);
        }
      }

      if (!added) {
        setSaleError("No product found for this search or barcode.");
        setScannerTone("not_found");
      }
    } catch (error) {
      setSaleError(error?.message ?? "Quick add failed");
      setScannerTone(classifyPosScanMessage(error?.message));
    } finally {
      setBarcodeLoading(false);
      setBarcodeInput("");
      refocusScanField();
    }
  };

  const persistLineQty = async (lineId, rawQty) => {
    if (!canSell || !activeCart?.id || !bidNum) return;
    const quantity = parseInt(String(rawQty), 10);
    if (!Number.isFinite(lineId)) return;
    if (!Number.isFinite(quantity) || quantity < 1) {
      setSaleError("Quantity must be 1 or more.");
      return;
    }
    setPosCartBusy(true);
    setSaleError("");
    try {
      await staffPosCartPatchLine(bidNum, activeCart.id, lineId, { quantity });
      await reloadActiveCart(activeCart.id);
      await refreshPosCartList();
    } catch (error) {
      setSaleError(error?.message ?? "Could not update line");
    } finally {
      setPosCartBusy(false);
    }
  };

  const persistLinePrice = async (lineId, rawPrice) => {
    if (!canSell || !canDiscountOverride || !activeCart?.id || !bidNum) return;
    const unitSellPrice = parseFloat(String(rawPrice).replace(",", "."));
    if (!Number.isFinite(lineId) || !Number.isFinite(unitSellPrice)) return;
    if (unitSellPrice < 0) {
      setSaleError("Unit price cannot be negative.");
      return;
    }
    setPosCartBusy(true);
    setSaleError("");
    try {
      await staffPosCartPatchLine(bidNum, activeCart.id, lineId, { unitSellPrice });
      await reloadActiveCart(activeCart.id);
      await refreshPosCartList();
    } catch (error) {
      setSaleError(error?.message ?? "Could not update line price");
    } finally {
      setPosCartBusy(false);
    }
  };

  const applyLineDiscount = async (line, rawPct) => {
    if (!line?.lineId || !canSell || !canDiscountOverride) return;
    const pct = parseFloat(String(rawPct));
    if (!Number.isFinite(pct)) return;
    const basePrice = Number(line.listPrice || line.price || 0);
    const nextSell = Math.max(0, Math.round(basePrice * (1 - pct / 100) * 100) / 100);
    await persistLinePrice(line.lineId, nextSell);
  };

  const removeCartLine = async (lineId) => {
    if (!canSell || !activeCart?.id || !bidNum) return;
    setPosCartBusy(true);
    setSaleError("");
    try {
      await staffPosCartDeleteLine(bidNum, activeCart.id, lineId);
      await reloadActiveCart(activeCart.id);
      await refreshPosCartList();
    } catch (error) {
      setSaleError(error?.message ?? "Could not remove line");
    } finally {
      setPosCartBusy(false);
    }
  };

  const createNewPosCart = async () => {
    if (!canSell || !bidNum) return;
    setPosCartBusy(true);
    setSaleError("");
    try {
      const created = await staffPosCartCreate(bidNum, undefined);
      const row = created?.data ?? created;
      if (row?.id) {
        await reloadActiveCart(row.id);
      }
      await refreshPosCartList();
    } catch (error) {
      setSaleError(error?.message ?? "Could not create cart");
    } finally {
      setPosCartBusy(false);
      refocusScanField();
    }
  };

  const switchToPosCart = async (cart) => {
    if (!cart?.id) return;
    setPosCartBusy(true);
    setSaleError("");
    try {
      await reloadActiveCart(cart.id);
    } catch (error) {
      setSaleError(error?.message ?? "Could not load cart");
    } finally {
      setPosCartBusy(false);
      refocusScanField();
    }
  };

  const resumeHeldCart = async (cart) => {
    if (!cart?.id || !bidNum || !canSell) return;
    setPosCartBusy(true);
    setSaleError("");
    try {
      await staffPosCartResume(bidNum, cart.id, cart.version);
      await reloadActiveCart(cart.id);
      await refreshPosCartList();
    } catch (error) {
      setSaleError(error?.message ?? "Resume cart failed");
    } finally {
      setPosCartBusy(false);
      refocusScanField();
    }
  };

  const ensureNextActiveCart = async (closedCartId) => {
    const list = await refreshPosCartList();
    const nextOpen = list.find((cart) => cart.status !== "HELD" && cart.id !== closedCartId);
    if (nextOpen?.id) {
      await reloadActiveCart(nextOpen.id);
      return;
    }
    const created = await staffPosCartCreate(bidNum, undefined);
    const row = created?.data ?? created;
    if (row?.id) {
      await reloadActiveCart(row.id);
      await refreshPosCartList();
    } else {
      setActiveCart(null);
    }
  };

  const closeCartNow = async (cart, mode) => {
    if (!cart?.id || !canSell || !bidNum) return;
    setPosCartBusy(true);
    setSaleError("");
    try {
      if (mode === "hold") {
        await staffPosCartHold(bidNum, cart.id, cart.version);
      } else {
        await staffPosCartAbandon(branchId, cart.id);
        removeCartUiState(cart.id);
      }

      if (activeCart?.id === cart.id) {
        await ensureNextActiveCart(cart.id);
      } else {
        await refreshPosCartList();
      }
      setCloseCartRequest(null);
    } catch (error) {
      setSaleError(error?.message ?? "Could not close cart");
    } finally {
      setPosCartBusy(false);
      refocusScanField();
    }
  };

  const requestCloseCart = async (cart) => {
    if (!cart?.id) return;
    if ((cart.lines || []).length === 0) {
      await closeCartNow(cart, "discard");
      return;
    }
    setCloseCartRequest(cart);
  };

  const holdActivePosCart = async () => {
    if (!canSell || !activeCart?.id || !bidNum || displayLines.length === 0) return;
    setPosCartBusy(true);
    setSaleError("");
    try {
      await staffPosCartHold(bidNum, activeCart.id, activeCart.version);
      await refreshPosCartList();
      const created = await staffPosCartCreate(bidNum, undefined);
      const row = created?.data ?? created;
      if (row?.id) await reloadActiveCart(row.id);
      await refreshPosCartList();
    } catch (error) {
      setSaleError(error?.message ?? "Hold cart failed");
    } finally {
      setPosCartBusy(false);
      refocusScanField();
    }
  };

  const abandonAndNewCart = async () => {
    if (!canSell || !activeCart?.id || !bidNum) return;
    setPosCartBusy(true);
    setSaleError("");
    try {
      await staffPosCartAbandon(branchId, activeCart.id);
      removeCartUiState(activeCart.id);
      const created = await staffPosCartCreate(bidNum, undefined);
      const row = created?.data ?? created;
      if (row?.id) await reloadActiveCart(row.id);
      await refreshPosCartList();
    } catch (error) {
      setSaleError(error?.message ?? "Clear cart failed");
    } finally {
      setPosCartBusy(false);
      refocusScanField();
    }
  };

  const persistCartNote = async () => {
    if (!activeCart?.id || !bidNum) return;
    setNoteSaving(true);
    setSaleError("");
    try {
      await patchActiveCart({
        metadataJson: {
          note: String(cartNoteDraft || "").trim(),
        },
      });
    } catch (error) {
      setSaleError(error?.message ?? "Could not save note");
    } finally {
      setNoteSaving(false);
    }
  };

  const lookupCustomer = async () => {
    const phone = String(customerLookup || customerDraft.phone || "").trim();
    if (!phone || !activeCart?.id) return;
    setCustomerBusy(true);
    setCustomerError("");
    setMembershipError("");
    try {
      const data = await staffPosCustomerLookup(branchId, phone);
      const { normalized, nextDraft } = syncCustomerAndMembership(data, {
        ...customerDraft,
        phone,
      });
      await patchActiveCart({
        customerUserId: normalized.customer?.id ?? null,
        metadataJson: { customerDraft: nextDraft },
        ...membershipResetPatch(normalized.customer?.id ?? null),
      });
      setShowCreateCustomer(false);
    } catch (error) {
      const nextDraft = { ...customerDraft, phone };
      setCustomerContext(null);
      setCustomerDraft(nextDraft);
      setMembershipMatches([]);
      setMembershipSelectedId(null);
      setCustomerError(error?.message ?? "Customer not found");
      setShowCreateCustomer(true);
    } finally {
      setCustomerBusy(false);
    }
  };

  const createCustomer = async () => {
    if (!activeCart?.id || !bidNum || !String(customerDraft.phone || "").trim()) return;
    setCustomerBusy(true);
    setCustomerError("");
    try {
      const response = await staffPosCustomerEnsure(bidNum, {
        phone: String(customerDraft.phone || "").trim(),
        email: String(customerDraft.email || "").trim() || undefined,
        displayName: String(customerDraft.displayName || "").trim() || undefined,
      });
      const raw = response?.data ?? response;
      const { normalized, nextDraft } = syncCustomerAndMembership(raw, customerDraft);
      const mergedDraft = { ...nextDraft, address: customerDraft.address || nextDraft.address || "" };
      setCustomerDraft(mergedDraft);
      await patchActiveCart({
        customerUserId: normalized.customer?.id ?? null,
        metadataJson: { customerDraft: mergedDraft },
        ...membershipResetPatch(normalized.customer?.id ?? null),
      });
      setShowCreateCustomer(false);
    } catch (error) {
      setCustomerError(error?.message ?? "Could not create customer");
    } finally {
      setCustomerBusy(false);
    }
  };

  const persistCustomerDraft = async () => {
    if (!activeCart?.id || !bidNum) return;
    setCustomerBusy(true);
    setCustomerError("");
    try {
      await patchActiveCart({
        metadataJson: {
          customerDraft,
        },
      });
    } catch (error) {
      setCustomerError(error?.message ?? "Could not save customer details");
    } finally {
      setCustomerBusy(false);
    }
  };

  const clearCustomer = async () => {
    if (!activeCart?.id || !bidNum) return;
    setCustomerBusy(true);
    setCustomerError("");
    setMembershipError("");
    try {
      await patchActiveCart({
        customerUserId: null,
        ownerDiscountCardId: null,
        memberNameSnapshot: null,
        cardNumberSnapshot: null,
        discountPercentSnapshot: null,
        metadataJson: {
          customerDraft: { displayName: "", phone: "", email: "", address: "" },
        },
      });
      setCustomerLookup("");
      setCustomerDraft({ displayName: "", phone: "", email: "", address: "" });
      setCustomerContext(null);
      setMembershipMatches([]);
      setMembershipSelectedId(null);
      setShowCreateCustomer(false);
    } catch (error) {
      setCustomerError(error?.message ?? "Could not clear customer");
    } finally {
      setCustomerBusy(false);
    }
  };

  const applyMembershipCardToCart = async (card, customerOverride = null) => {
    if (!card || !activeCart?.id || !bidNum) return;
    setMembershipBusy(true);
    setMembershipError("");
    try {
      const customer = customerOverride ?? customerContext?.customer ?? null;
      const nextDraft = buildCustomerDraft(customer, customerDraft);
      if (customerDraft.address && !nextDraft.address) {
        nextDraft.address = customerDraft.address;
      }
      await patchActiveCart({
        ownerDiscountCardId: card.ownerDiscountCardId,
        customerUserId: card.customerUserId ?? customer?.id ?? activeCart.customerUserId ?? null,
        memberNameSnapshot: card.memberDisplayName ?? customer?.displayName ?? null,
        cardNumberSnapshot:
          card.cardNumberMasked ??
          (card.cardNumberLast4 ? `****${card.cardNumberLast4}` : null),
        discountPercentSnapshot: card.discountPercent ?? null,
        metadataJson: { customerDraft: nextDraft },
      });
      setMembershipSelectedId(card.ownerDiscountCardId);
      if (customer) {
        setCustomerContext((prev) => ({ customer, pets: prev?.pets ?? [] }));
        setCustomerDraft(nextDraft);
      }
    } catch (error) {
      setMembershipError(error?.message ?? "Membership not applied");
    } finally {
      setMembershipBusy(false);
    }
  };

  const lookupMembershipByCode = async () => {
    const code = String(membershipCodeInput || "").trim();
    if (!code) return;
    setMembershipBusy(true);
    setMembershipError("");
    try {
      const raw = await staffPosMembershipResolve(branchId, { code });
      const { normalized, nextDraft } = syncCustomerAndMembership(raw, customerDraft);
      const selectedCard = normalized.selectedCard ?? normalized.matches[0] ?? null;
      if (!selectedCard) {
        throw new Error("No active card found");
      }
      await applyMembershipCardToCart(selectedCard, normalized.customer);
      setCustomerDraft(nextDraft);
      setMembershipCodeInput("");
      setShowCreateCustomer(false);
    } catch (error) {
      setMembershipError(error?.message ?? "Membership lookup failed");
    } finally {
      setMembershipBusy(false);
    }
  };

  const lookupMembershipByCustomer = async () => {
    const customerUserId = customerContext?.customer?.id ?? activeCart?.customerUserId ?? null;
    const phone = customerDraft.phone || customerLookup;
    if (!customerUserId && !String(phone || "").trim()) return;
    setMembershipBusy(true);
    setMembershipError("");
    try {
      const raw = await staffPosMembershipResolve(
        branchId,
        customerUserId ? { customerUserId } : { phone: String(phone || "").trim() }
      );
      const { normalized, nextDraft } = syncCustomerAndMembership(raw, customerDraft);
      await patchActiveCart({
        customerUserId: normalized.customer?.id ?? customerUserId ?? null,
        metadataJson: { customerDraft: nextDraft },
        ...membershipResetPatch(normalized.customer?.id ?? customerUserId ?? null),
      });
    } catch (error) {
      setMembershipMatches([]);
      setMembershipSelectedId(null);
      setMembershipError(error?.message ?? "No membership card found");
    } finally {
      setMembershipBusy(false);
    }
  };

  const clearMembershipFromCart = async () => {
    if (!activeCart?.id || !bidNum) return;
    setMembershipBusy(true);
    setMembershipError("");
    try {
      await patchActiveCart({
        ownerDiscountCardId: null,
        memberNameSnapshot: null,
        cardNumberSnapshot: null,
        discountPercentSnapshot: null,
      });
      setMembershipSelectedId(null);
    } catch (error) {
      setMembershipError(error?.message ?? "Could not clear membership");
    } finally {
      setMembershipBusy(false);
    }
  };

  const handleSaleSubmit = async (event) => {
    event.preventDefault();
    if (!canSell) return;
    if (!activeCart?.id) {
      setSaleError("No active cart.");
      return;
    }
    if (displayLines.length === 0) {
      setSaleError("Add at least one item.");
      return;
    }
    setSaleLoading(true);
    setSaleError("");

    try {
      if (
        !activeCheckoutUi.splitPayEnabled &&
        activeCheckoutUi.paymentMethod === "CASH" &&
        String(activeCheckoutUi.receivedAmount || "").trim() !== "" &&
        receivedAmount < grandTotal
      ) {
        throw new Error("Received amount cannot be less than payable total.");
      }

      let payments;
      if (activeCheckoutUi.splitPayEnabled) {
        const secondAmount = parseFloat(String(activeCheckoutUi.splitPay2Amount).replace(",", "."));
        if (!Number.isFinite(secondAmount) || secondAmount <= 0 || secondAmount >= grandTotal) {
          throw new Error("Split payment requires a valid second amount smaller than the total.");
        }
        const firstAmount = Math.round((grandTotal - secondAmount) * 100) / 100;
        payments = [
          { method: activeCheckoutUi.paymentMethod, amount: firstAmount },
          { method: activeCheckoutUi.splitPay2Method, amount: Math.round(secondAmount * 100) / 100 },
        ];
      } else {
        payments = [
          {
            method: activeCheckoutUi.paymentMethod,
            amount: Math.round(grandTotal * 100) / 100,
          },
        ];
      }

      const response = await staffPosCartFinalize(bidNum, activeCart.id, {
        payments,
        discountPercent: manualDiscountPct,
        taxPercent,
        customerId: customerContext?.customer?.id ?? activeCart.customerUserId ?? undefined,
        notes: String(cartNoteDraft || "").trim() || "POS Sale",
      });
      const order = response?.data ?? response;
      setSaleSuccess({ orderNumber: order?.orderNumber ?? order?.id, orderId: order?.id });

      const finishedCartId = activeCart.id;
      removeCartUiState(finishedCartId);
      setMembershipMatches([]);
      setMembershipSelectedId(null);
      setCustomerContext(null);
      setCustomerLookup("");
      setCustomerDraft({ displayName: "", phone: "", email: "", address: "" });
      setCartNoteDraft("");

      await onOrdersMutated?.();
      await refreshPosProducts();

      const created = await staffPosCartCreate(bidNum, undefined);
      const row = created?.data ?? created;
      if (row?.id) {
        await reloadActiveCart(row.id);
      }
      await refreshPosCartList();
      setTimeout(() => setSaleSuccess(null), 8000);
    } catch (error) {
      setSaleError(error?.message ?? "Failed to complete sale");
    } finally {
      setSaleLoading(false);
      refocusScanField();
    }
  };

  const loadInvoice = async () => {
    if (!saleSuccess?.orderId) return;
    setInvoiceLoading(true);
    setInvoiceData(null);
    try {
      const invoice = await staffPosInvoice(saleSuccess.orderId);
      setInvoiceData(invoice || false);
    } catch {
      setInvoiceData(false);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const loadReceipt = async () => {
    if (!saleSuccess?.orderId) return;
    setReceiptLoading(true);
    setReceiptData(null);
    try {
      const receipt = await staffPosReceipt(saleSuccess.orderId);
      setReceiptData(receipt || false);
    } catch {
      setReceiptData(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  scanKbRef.current = {
    canSell,
    refocusScanField,
    createNewPosCart,
    holdActivePosCart,
    setCloseCartRequest,
    setInvoiceData,
    setReceiptData,
    setBarcodeInput,
    setSaleError,
    setScannerTone,
    closeCartRequest,
    invoiceData,
    receiptData,
  };

  return (
    <PosShell
      successAlert={
        saleSuccess ? (
          <div className="alert alert-success d-flex align-items-center justify-content-between flex-wrap gap-8 mb-10">
            <span>Sale completed. Order #{saleSuccess.orderNumber}</span>
            <div className="d-flex gap-8 flex-wrap">
              <button type="button" className="btn btn-sm btn-outline-success" onClick={loadInvoice}>
                {invoiceLoading ? "Loading..." : "Print invoice"}
              </button>
              <button type="button" className="btn btn-sm btn-outline-success" onClick={loadReceipt}>
                {receiptLoading ? "Loading..." : "View receipt"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => {
                  setSaleSuccess(null);
                  refocusScanField();
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null
      }
      errorAlert={
        saleError ? (
          <div className="alert alert-danger d-flex align-items-center justify-content-between flex-wrap gap-8 mb-10">
            <span>{saleError}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                setSaleError("");
                setScannerTone("ready");
                refocusScanField();
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null
      }
      leftColumn={
        <PosProductPanel
          canSell={canSell}
          busy={posCartBusy}
          productSearch={productSearch}
          onProductSearchChange={setProductSearch}
          searchResults={searchResults}
          onAddProduct={addToCart}
          onRefreshCatalog={refreshPosProducts}
          catalogBusy={productCatalogLoading}
          categories={productCategories}
          activeCategory={productCategory}
          onSelectCategory={setProductCategory}
          cardClassName="pos-shell-card mb-0"
        />
      }
      centerColumn={
        <PosCartWorkspace
          quickInputRef={quickInputRef}
          openCarts={openCarts}
          heldCarts={heldCarts}
          activeCartId={activeCart?.id ?? null}
          posCartBusy={posCartBusy}
          onSelectCart={switchToPosCart}
          onResumeHeldCart={resumeHeldCart}
          onCreateCart={createNewPosCart}
          onRequestCloseCart={requestCloseCart}
          canSell={canSell}
          barcodeLoading={barcodeLoading}
          barcodeInput={barcodeInput}
          onBarcodeInputChange={setBarcodeInput}
          scanMode={scanMode}
          onToggleScanMode={() => setScanMode((prev) => !prev)}
          onQuickEntrySubmit={handleQuickEntrySubmit}
          scanLineStatus={scannerLineStatus}
          scanFlash={scanFlash}
          displayLines={displayLines}
          canDiscountOverride={canDiscountOverride}
          onIncrementLine={(line) => persistLineQty(line.lineId, Number(line.quantity || 0) + 1)}
          onDecrementLine={(line) => persistLineQty(line.lineId, Number(line.quantity || 0) - 1)}
          onPersistLineQty={persistLineQty}
          onApplyLineDiscount={applyLineDiscount}
          onRemoveLine={removeCartLine}
          noteSaving={noteSaving}
          cartNoteDraft={cartNoteDraft}
          onCartNoteDraftChange={setCartNoteDraft}
          onPersistCartNote={persistCartNote}
          onHoldActivePosCart={holdActivePosCart}
          onAbandonAndNewCart={abandonAndNewCart}
          grandTotal={grandTotal}
          onScrollToCheckout={() => {
            const checkout = document.getElementById("pos-checkout-panel");
            if (checkout) checkout.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      }
      rightColumn={
        <div className="d-flex flex-column gap-8 pos-right-rail">
          <PosCustomerPanel
            canSell={canSell}
            busy={customerBusy || posCartBusy}
            lookupValue={customerLookup}
            onLookupValueChange={setCustomerLookup}
            onLookupSubmit={lookupCustomer}
            customerDraft={customerDraft}
            onDraftChange={(field, value) => setCustomerDraft((prev) => ({ ...prev, [field]: value }))}
            onPersistDraft={persistCustomerDraft}
            onCreateCustomer={createCustomer}
            onClearCustomer={clearCustomer}
            customerContext={customerContext}
            customerError={customerError}
            showCreateCustomer={showCreateCustomer}
            cardClassName="mb-0 pos-right-card"
          />

          <PosMembershipPanel
            canSell={canSell}
            busy={membershipBusy || posCartBusy}
            lookupCode={membershipCodeInput}
            onLookupCodeChange={setMembershipCodeInput}
            onLookupByCode={lookupMembershipByCode}
            onLookupByCustomer={lookupMembershipByCustomer}
            matches={membershipMatches}
            selectedCardId={membershipSelectedId}
            onSelectCard={setMembershipSelectedId}
            onApplySelectedCard={() => applyMembershipCardToCart(selectedMembershipCard)}
            onClearMembership={clearMembershipFromCart}
            appliedSummary={{
              memberName: activeCart?.memberNameSnapshot ?? null,
              cardNumber: activeCart?.cardNumberSnapshot ?? null,
              discountPercent: Number(activeCart?.discountPercentSnapshot || 0),
            }}
            membershipError={membershipError}
            hasCustomerContext={Boolean(customerContext?.customer || String(customerDraft.phone || "").trim())}
            cardClassName="mb-0 pos-right-card"
          />

          <PosPaymentSummary
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            grandTotal={grandTotal}
            className="mb-0"
          />

          <PosCheckoutPanel
            canSell={canSell}
            busy={posCartBusy || !activeCart?.id || displayLines.length === 0}
            saleLoading={saleLoading}
            paymentMethods={PAYMENT_METHODS}
            paymentMethod={activeCheckoutUi.paymentMethod}
            onPaymentMethodChange={(value) => updateActiveCheckoutUi({ paymentMethod: value })}
            receivedAmount={activeCheckoutUi.receivedAmount}
            onReceivedAmountChange={(value) => updateActiveCheckoutUi({ receivedAmount: value })}
            changeAmount={changeAmount}
            grandTotal={grandTotal}
            onSubmit={handleSaleSubmit}
            onHoldCart={holdActivePosCart}
            holdDisabled={!canSell || !activeCart?.id || posCartBusy || displayLines.length === 0}
            showHoldButton={false}
            cardClassName="mb-0 pos-right-card pos-checkout-card"
          />
        </div>
      }
    >
      {closeCartRequest ? (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Close cart</h6>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setCloseCartRequest(null)}
                />
              </div>
              <div className="modal-body">
                <p className="mb-12">
                  <strong>{closeCartRequest.cartNumber ?? `Cart #${closeCartRequest.id}`}</strong> still has items.
                </p>
                <p className="text-secondary-light mb-0">
                  Hold and close keeps it in the held-carts menu. Discard permanently abandons the cart.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={posCartBusy}
                  onClick={() => setCloseCartRequest(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  disabled={posCartBusy}
                  onClick={() => closeCartNow(closeCartRequest, "discard")}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={posCartBusy}
                  onClick={() => closeCartNow(closeCartRequest, "hold")}
                >
                  Hold and close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {invoiceData !== null && invoiceData !== undefined ? (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header d-print-none">
                <h6 className="modal-title">Invoice</h6>
                <div className="d-flex gap-8">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>
                    Print
                  </button>
                  <button type="button" className="btn-close" onClick={() => setInvoiceData(null)} aria-label="Close" />
                </div>
              </div>
              <div className="modal-body">
                {invoiceData === false ? (
                  <p className="text-secondary-light mb-0">Invoice not available.</p>
                ) : (
                  <div className="small pos-invoice-print">
                    <p className="fw-semibold">Invoice #{invoiceData?.invoiceNumber ?? "-"}</p>
                    <p>Order #{invoiceData?.orderNumber ?? "-"}</p>
                    <p className="text-secondary-light">
                      {invoiceData?.date ? new Date(invoiceData.date).toLocaleString() : ""}
                    </p>
                    <p>{invoiceData?.branch?.name ?? "Branch"}</p>
                    <table className="table table-sm mt-12">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(invoiceData?.items || []).map((item, index) => (
                          <tr key={index}>
                            <td>
                              {item.product}
                              {item.variant ? ` | ${item.variant}` : ""}
                            </td>
                            <td>{item.quantity}</td>
                            <td>{Number(item.price || 0).toFixed(2)}</td>
                            <td>{Number(item.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p>Subtotal: {Number(invoiceData?.subtotal ?? 0).toFixed(2)}</p>
                    {Number(invoiceData?.discountAmt ?? 0) > 0 ? (
                      <p>Discount: -{Number(invoiceData?.discountAmt ?? 0).toFixed(2)}</p>
                    ) : null}
                    {Number(invoiceData?.taxAmt ?? 0) > 0 ? (
                      <p>Tax: {Number(invoiceData?.taxAmt ?? 0).toFixed(2)}</p>
                    ) : null}
                    <p className="fw-semibold">
                      Total: {Number(invoiceData?.grandTotal ?? 0).toFixed(2)} | {invoiceData?.paymentMethod ?? ""}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {receiptData !== null && receiptData !== undefined ? (
        <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Receipt</h6>
                <button type="button" className="btn-close" onClick={() => setReceiptData(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                {receiptData === false ? (
                  <p className="text-secondary-light mb-0">Receipt not available.</p>
                ) : (
                  <div className="small">
                    <p className="fw-semibold">#{receiptData?.orderNumber ?? "-"}</p>
                    <p className="text-secondary-light">
                      {receiptData?.date ? new Date(receiptData.date).toLocaleString() : ""}
                    </p>
                    <p>
                      Total: {Number(receiptData?.total ?? 0).toFixed(2)} | {receiptData?.paymentMethod ?? ""}
                    </p>
                    <ul className="list-unstyled mb-0">
                      {(receiptData?.items || []).map((item, index) => (
                        <li key={index}>
                          {item.product} x {item.quantity} @ {Number(item.price || 0).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PosShell>
  );
}
