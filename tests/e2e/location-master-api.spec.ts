import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE_ROOT ?? "http://localhost:3000";

test("location-master hierarchy endpoints return cascade data", async ({ request }) => {
  const divisionsRes = await request.get(
    `${API_BASE}/api/v1/location-master/divisions?pageSize=10&locale=en`
  );
  expect(divisionsRes.ok()).toBeTruthy();
  const divisionsJson = await divisionsRes.json();
  expect(divisionsJson?.success).toBeTruthy();
  expect(Array.isArray(divisionsJson?.data)).toBeTruthy();

  const firstDivisionId = Number(divisionsJson?.data?.[0]?.id);
  if (!Number.isFinite(firstDivisionId) || firstDivisionId <= 0) return;

  const districtsRes = await request.get(
    `${API_BASE}/api/v1/location-master/districts?divisionId=${firstDivisionId}&pageSize=10&locale=en`
  );
  expect(districtsRes.ok()).toBeTruthy();
  const districtsJson = await districtsRes.json();
  expect(districtsJson?.success).toBeTruthy();
  expect(Array.isArray(districtsJson?.data)).toBeTruthy();

  const firstDistrictId = Number(districtsJson?.data?.[0]?.id);
  if (!Number.isFinite(firstDistrictId) || firstDistrictId <= 0) return;

  const upazilasRes = await request.get(
    `${API_BASE}/api/v1/location-master/upazilas?districtId=${firstDistrictId}&pageSize=10&locale=en`
  );
  expect(upazilasRes.ok()).toBeTruthy();
  const upazilasJson = await upazilasRes.json();
  expect(upazilasJson?.success).toBeTruthy();
  expect(Array.isArray(upazilasJson?.data)).toBeTruthy();

  const firstUpazilaId = Number(upazilasJson?.data?.[0]?.id);
  if (!Number.isFinite(firstUpazilaId) || firstUpazilaId <= 0) return;

  const unionsRes = await request.get(
    `${API_BASE}/api/v1/location-master/unions?upazilaId=${firstUpazilaId}&pageSize=10&locale=en`
  );
  expect(unionsRes.ok()).toBeTruthy();
  const unionsJson = await unionsRes.json();
  expect(unionsJson?.success).toBeTruthy();
  expect(Array.isArray(unionsJson?.data)).toBeTruthy();
});

