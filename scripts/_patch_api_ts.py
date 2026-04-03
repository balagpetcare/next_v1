from pathlib import Path
p = Path('lib/api.ts')
s = p.read_text(encoding='utf-8')
old = '''  const res = await apiGet<{ success?: boolean; data?: StockRequestProduct[]; pagination?: StockRequestProductsPagination }>(
    /api/v1/inventory/stock-request-products?
  );
  return {
    items: (res as any)?.data ?? [],
    pagination: (res as any)?.pagination ?? { page: 1, limit: 30, total: 0, totalPages: 1 },
  };
}'''
new = '''  const res = await apiGet<{
    success?: boolean;
    data?: StockRequestProduct[];
    pagination?: StockRequestProductsPagination;
    meta?: StockRequestProductsMeta;
  }>(/api/v1/inventory/stock-request-products?);
  return {
    items: (res as any)?.data ?? [],
    pagination: (res as any)?.pagination ?? { page: 1, limit: 30, total: 0, totalPages: 1 },
    meta: (res as any)?.meta ?? undefined,
  };
}'''
if old not in s:
    raise SystemExit('api block not found')
s = s.replace(old, new)
ins_after = '''export type StockRequestProductsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

'''
if 'StockRequestProductsMeta' not in s:
    s = s.replace(
        ins_after,
        ins_after + '''export type StockRequestProductsMeta = {
  pickerRule?: string;
  branchLocalLocationCount?: number;
  centralLocationCount?: number;
  defaultLocationCreated?: boolean;
  catalogTruncated?: boolean;
  rawProductCount?: number;
};

''',
        1,
    )
oldv = '''  stockOnHand: number;
  availableQty?: number;'''
newv = '''  stockOnHand: number;
  /** Sum of on-hand at org central warehouse locations (ledger), when configured */
  centralOnHand?: number;
  availableQty?: number;'''
if oldv in s and 'centralOnHand' not in s.split('StockRequestProductVariant')[1][:400]:
    s = s.replace(oldv, newv, 1)
p.write_text(s, encoding='utf-8')
print('api.ts ok')
