type UnknownRecord = Record<string, unknown>;

export type DestinationLocationOption = {
  value: string;
  locationId: number;
  label: string;
  location: UnknownRecord;
};

const DESTINATION_LOCATION_TYPE_PRIORITY: Record<string, number> = {
  CLINIC_STORE: 0,
  PHARMACY: 1,
  BRANCH_STORE: 2,
  SHOP: 3,
  CLINIC: 4,
  STAGING: 10,
  ONLINE_HUB: 20,
  CENTRAL_WAREHOUSE: 30,
  DAMAGE_AREA: 99,
  RETURN_AREA: 99,
  QUARANTINE: 99,
};

function parsePositiveInt(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.trunc(n);
}

function stockRequestTargetBranchId(request: UnknownRecord | null | undefined): number | undefined {
  if (request == null) return undefined;
  const req = request as UnknownRecord;
  const branch = (req.branch as UnknownRecord | undefined) ?? undefined;
  return (
    parsePositiveInt(req.branchId) ??
    parsePositiveInt(req.branch_id) ??
    parsePositiveInt(branch?.id)
  );
}

function inventoryLocationBranchId(locationRow: unknown): number | undefined {
  if (locationRow == null || typeof locationRow !== "object") return undefined;
  const row = locationRow as UnknownRecord;
  const branch = (row.branch as UnknownRecord | undefined) ?? undefined;
  return (
    parsePositiveInt(branch?.id) ??
    parsePositiveInt(row.branch_id) ??
    parsePositiveInt(row.branchId)
  );
}

function inventoryLocationId(locationRow: unknown): number | undefined {
  if (locationRow == null || typeof locationRow !== "object") return undefined;
  return parsePositiveInt((locationRow as UnknownRecord).id);
}

function locationSortKey(locationRow: UnknownRecord): string {
  const typeCode = String(locationRow.type ?? "");
  const priority = DESTINATION_LOCATION_TYPE_PRIORITY[typeCode] ?? 40;
  const name = String(locationRow.name ?? "");
  const id = String(locationRow.id ?? "");
  return `${String(priority).padStart(3, "0")}::${name}::${id}`;
}

function ensureLocationBranch(
  locationRow: UnknownRecord,
  targetBranchId: number,
  branchName?: string
): UnknownRecord {
  const rowBranch = (locationRow.branch as UnknownRecord | undefined) ?? undefined;
  const rowBranchId = parsePositiveInt(rowBranch?.id) ?? parsePositiveInt(locationRow.branchId);
  if (rowBranchId != null && rowBranchId === targetBranchId && rowBranch?.name) return locationRow;
  return {
    ...locationRow,
    branch: {
      ...(rowBranch ?? {}),
      id: targetBranchId,
      name: rowBranch?.name ?? branchName ?? `Branch #${targetBranchId}`,
    },
    branchId: rowBranchId ?? targetBranchId,
  };
}

function branchTypeCode(branch: UnknownRecord | undefined): string {
  if (!branch) return "BRANCH";
  const links = Array.isArray(branch.typeLinks) ? branch.typeLinks : [];
  if (!links.length) return "BRANCH";
  const primary = links.find((t) => Boolean((t as UnknownRecord)?.isPrimary)) as UnknownRecord | undefined;
  const picked = (primary?.branchType as UnknownRecord | undefined) ?? ((links[0] as UnknownRecord)?.branchType as UnknownRecord | undefined);
  return String(picked?.code ?? "BRANCH");
}

function destinationLabel(locationRow: UnknownRecord): string {
  const branch = (locationRow.branch as UnknownRecord | undefined) ?? undefined;
  const branchName = String(branch?.name ?? "Branch");
  const locationName = String(locationRow.name ?? `Location #${locationRow.id ?? "?"}`);
  const typeCode = String(locationRow.type ?? branchTypeCode(branch));
  return `${branchName} — ${locationName} (${typeCode})`;
}

function toUniqueOptions(rows: UnknownRecord[], targetBranchId: number, branchName?: string): DestinationLocationOption[] {
  const seen = new Set<number>();
  const normalized = rows
    .map((r) => ensureLocationBranch(r, targetBranchId, branchName))
    .filter((r) => {
      const id = inventoryLocationId(r);
      if (id == null) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => locationSortKey(a).localeCompare(locationSortKey(b)));

  return normalized.map((loc) => {
    const locationId = inventoryLocationId(loc) as number;
    return {
      value: String(locationId),
      locationId,
      label: destinationLabel(loc),
      location: loc,
    };
  });
}

function fallbackBranchDefaultLocation(
  request: UnknownRecord,
  targetBranchId: number,
  branchName: string | undefined,
  orgLocationsForBranch: UnknownRecord[],
  orgLocationsAll: UnknownRecord[]
): UnknownRecord[] {
  const branch = (request.branch as UnknownRecord | undefined) ?? undefined;
  if (!branch) return [];

  const objectCandidates = [
    branch.defaultInventoryLocation,
    branch.primaryInventoryLocation,
    branch.inventoryLocation,
    branch.defaultLocation,
  ].filter((x): x is UnknownRecord => Boolean(x && typeof x === "object"));

  const idCandidates = [
    branch.defaultInventoryLocationId,
    branch.primaryInventoryLocationId,
    branch.inventoryLocationId,
    branch.defaultLocationId,
  ]
    .map(parsePositiveInt)
    .filter((x): x is number => x != null);

  const fromObjects = objectCandidates
    .map((obj) => ensureLocationBranch(obj, targetBranchId, branchName))
    .filter((loc) => {
      const id = inventoryLocationId(loc);
      return id != null;
    });

  const fromIds = idCandidates
    .map((id) => {
      return (
        orgLocationsForBranch.find((row) => inventoryLocationId(row) === id) ??
        orgLocationsAll.find((row) => inventoryLocationId(row) === id) ??
        ({ id, name: `Location #${id}`, type: undefined } as UnknownRecord)
      );
    })
    .map((row) => ensureLocationBranch(row, targetBranchId, branchName));

  return [...fromObjects, ...fromIds];
}

function linkedTransferFallback(request: UnknownRecord, targetBranchId: number, branchName: string | undefined): UnknownRecord[] {
  const transfers = Array.isArray(request.transfers) ? request.transfers : [];
  const first = (transfers[0] as UnknownRecord | undefined) ?? undefined;
  if (!first) return [];
  const toLocation = (first.toLocation as UnknownRecord | undefined) ?? undefined;
  const transferToLocationId = parsePositiveInt(toLocation?.id) ?? parsePositiveInt(first.toLocationId) ?? parsePositiveInt(first.to_location_id);
  if (transferToLocationId == null) return [];
  const inferredName = String(toLocation?.name ?? `Location #${transferToLocationId}`);
  return [
    ensureLocationBranch(
      {
        id: transferToLocationId,
        name: inferredName,
        type: toLocation?.type,
      },
      targetBranchId,
      branchName
    ),
  ];
}

export function resolveStockRequestDestinationOptions(args: {
  request: UnknownRecord | null | undefined;
  orgLocations: unknown[];
}): {
  targetBranchId?: number;
  options: DestinationLocationOption[];
  canonicalToLocationIdStr: string;
} {
  const request = args.request ?? null;
  if (!request) return { options: [], canonicalToLocationIdStr: "" };
  const req = request as UnknownRecord;
  const targetBranchId = stockRequestTargetBranchId(req);
  if (targetBranchId == null) return { targetBranchId: undefined, options: [], canonicalToLocationIdStr: "" };

  const branch = (req.branch as UnknownRecord | undefined) ?? undefined;
  const branchName = typeof branch?.name === "string" ? branch.name : undefined;

  const branchInventoryLocations = Array.isArray(branch?.inventoryLocations)
    ? (branch.inventoryLocations as unknown[])
    : [];
  const fromRequestBranch = branchInventoryLocations
    .filter((row): row is UnknownRecord => Boolean(row && typeof row === "object"))
    .map((row) => ensureLocationBranch(row, targetBranchId, branchName));
  const fromRequestValid = fromRequestBranch.filter((loc) => inventoryLocationId(loc) != null);
  if (fromRequestValid.length > 0) {
    const options = toUniqueOptions(fromRequestValid, targetBranchId, branchName);
    return {
      targetBranchId,
      options,
      canonicalToLocationIdStr: options[0]?.value ?? "",
    };
  }

  const orgRows = Array.isArray(args.orgLocations)
    ? args.orgLocations.filter((row): row is UnknownRecord => Boolean(row && typeof row === "object"))
    : [];
  const orgForBranch = orgRows.filter((row) => inventoryLocationBranchId(row) === targetBranchId);
  if (orgForBranch.length > 0) {
    const options = toUniqueOptions(orgForBranch, targetBranchId, branchName);
    return {
      targetBranchId,
      options,
      canonicalToLocationIdStr: options[0]?.value ?? "",
    };
  }

  const fromBranchDefault = fallbackBranchDefaultLocation(req, targetBranchId, branchName, orgForBranch, orgRows);
  if (fromBranchDefault.length > 0) {
    const options = toUniqueOptions(fromBranchDefault, targetBranchId, branchName);
    return {
      targetBranchId,
      options,
      canonicalToLocationIdStr: options[0]?.value ?? "",
    };
  }

  const fromTransfer = linkedTransferFallback(req, targetBranchId, branchName);
  if (fromTransfer.length > 0) {
    const options = toUniqueOptions(fromTransfer, targetBranchId, branchName);
    return {
      targetBranchId,
      options,
      canonicalToLocationIdStr: options[0]?.value ?? "",
    };
  }

  return { targetBranchId, options: [], canonicalToLocationIdStr: "" };
}
