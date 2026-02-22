#!/usr/bin/env node
/**
 * Auto-generate IMPLEMENTED_ADMIN_HREFS from app/admin/(larkon) page.tsx scan.
 * Run: node scripts/admin/generateImplementedAdminHrefs.mjs [--write]
 * Outputs a stable sorted array of hrefs that have real pages.
 * With --write: updates src/larkon-admin/menu/adapters/adminRouteMap.ts
 * Respects ADMIN_ROUTE_MAP (e.g. /admin/roles → /admin/role/role-list).
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..', '..')

/** permissionMenu href → actual route (from adminRouteMap) */
const ADMIN_ROUTE_MAP = {
  '/admin/roles': '/admin/role/role-list',
  '/admin/products': '/admin/products/product-list',
  '/admin/orders': '/admin/orders/orders-list',
  '/admin/inventory': '/admin/inventory/warehouse',
  '/admin/support': '/admin/support/help-center',
}

/** Recursively find all page.tsx under dir, return routes like /admin/foo/bar */
function scanAdminPages(dir, base = '') {
  const routes = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name
    const full = join(dir, e.name)
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      routes.push(...scanAdminPages(full, rel))
    } else if (e.isFile() && e.name === 'page.tsx') {
      const route = '/admin/' + rel.replace(/\/page\.tsx$/, '').replace(/\\/g, '/')
      routes.push(route)
    }
  }
  return routes
}

/** Extract all admin hrefs from permissionMenu.ts */
function extractPermissionMenuHrefs() {
  const p = join(ROOT, 'src', 'lib', 'permissionMenu.ts')
  const content = readFileSync(p, 'utf-8')
  const re = /href:\s*["'](\/admin\/[^"']+)["']/g
  const hrefs = new Set()
  let m
  while ((m = re.exec(content)) !== null) {
    hrefs.add(m[1])
  }
  return [...hrefs]
}

function generateImplementedHrefs() {
  const adminDir = join(ROOT, 'app', 'admin', '(larkon)')
  const actualRoutes = new Set(scanAdminPages(adminDir))
  const menuHrefs = extractPermissionMenuHrefs()

  const implemented = []
  for (const href of menuHrefs) {
    const targetRoute = ADMIN_ROUTE_MAP[href] ?? href
    if (actualRoutes.has(targetRoute)) {
      implemented.push(href)
    }
  }

  return [...new Set(implemented)].sort()
}

function updateAdminRouteMap(hrefs) {
  const p = join(ROOT, 'src', 'larkon-admin', 'menu', 'adapters', 'adminRouteMap.ts')
  let content = readFileSync(p, 'utf-8')
  const lines = hrefs.map((h) => `  '${h}',`)
  const block = `export const IMPLEMENTED_ADMIN_HREFS: Set<string> = new Set([\n${lines.join('\n')}\n])`
  content = content.replace(
    /export const IMPLEMENTED_ADMIN_HREFS: Set<string> = new Set\(\[[\s\S]*?\]\)/,
    block
  )
  writeFileSync(p, content, 'utf-8')
}

function main() {
  const write = process.argv.includes('--write')
  const hrefs = generateImplementedHrefs()

  if (write) {
    updateAdminRouteMap(hrefs)
    console.log(`Updated IMPLEMENTED_ADMIN_HREFS with ${hrefs.length} routes`)
  } else {
    console.log(JSON.stringify(hrefs, null, 2))
  }
}

main()
