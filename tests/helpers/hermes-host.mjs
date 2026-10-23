/**
 * Fake Hermes Desktop host — the ONLY boundary this suite fakes.
 * Mirrors live-verified core facts from docs/spec/two-level-tab-groups-142689.md:
 *   - registry is a generic byArea Map; NO area validation (H1, live-proven)
 *   - plugin storage namespace `hermes.plugin.tab-tint.<key>` (`themes.v3` live)
 *   - core keys: `hermes.desktop.layoutTree.v2`, `hermes.desktop.layoutPreset.active`,
 *     `hermes.desktop.layoutPresets.v2`
 *   - codec v2 tolerates nested splits with groups at two levels (H3)
 *   - anchor grammar: `data-tree-tab` + role="tab"; surface keyed by
 *     `data-session-anchor` (= same key as the tab)
 *
 * It deliberately does NOT normalize weights on applyLayout: normalizing is
 * plugin responsibility (ARR-02 asserts the persisted result).
 */
import { setHarness } from '@hermes/plugin-sdk'

export const LIVE_TABS = 7      // spec: tabs=7
export const LIVE_SURFACES = 4  // spec: surfaces=4 (workspace + 2×session-tile:<id> + 1 more)

const CORE_TREE_KEY = 'hermes.desktop.layoutTree.v2'
const CORE_PRESET_ACTIVE_KEY = 'hermes.desktop.layoutPreset.active'
const CORE_PRESETS_KEY = 'hermes.desktop.layoutPresets.v2'

export function createHarness({ storage = null, withApplyLayout = true } = {}) {
  const localStorage = storage ?? new Map()
  const registry = new Map() // area -> contribution[]
  const errors = []          // console.error captured during register/apply
  const notifications = []
  const navigations = []
  const applyCalls = []
  const paneIds = new Set(['workspace', 'session-tile:a', 'session-tile:b', 'session-tile:c'])

  // ── minimal fake DOM (only the anchor grammar plugin.js touches) ───────
  function fakeElement(tag, attrs = {}) {
    const el = {
      tagName: String(tag).toUpperCase(),
      attributes: { ...attrs },
      children: [],
      parent: null,
      style: {},
      setAttribute(k, v) { el.attributes[k] = String(v) },
      getAttribute(k) { return el.attributes[k] ?? null },
      hasAttribute(k) { return k in el.attributes },
      remove() { if (el.parent) el.parent.children = el.parent.children.filter(c => c !== el) },
      appendChild(child) { child.parent = el; el.children.push(child); return child },
      insertBefore(child) { child.parent = el; el.children.unshift(child); return child },
      addEventListener() {},
      removeEventListener() {},
      getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 30, width: 100, height: 30 } },
      querySelector(sel) { return querySelectorAll(el, sel)[0] ?? null },
      querySelectorAll(sel) { return querySelectorAll(el, sel) }
    }
    return el
  }

  function matches(el, sel) {
    for (const part of sel.split(',')) {
      const s = part.trim()
      const conds = (s.match(/\[([^\]]+)\]/g) ?? []).filter(c => {
        const m = c.slice(1, -1).split('=')
        const v = m[1]?.replace(/^"|"$/g, '')
        return el.attributes[m[0]] !== undefined &&
               (v === undefined || el.attributes[m[0]] === v)
      })
      if (conds.length > 0) return true
    }
    return false
  }

  function walk(node, out = []) {
    for (const c of node.children) { out.push(c); walk(c, out) }
    return out
  }

  function querySelectorAll(root, sel) {
    return walk(root).filter(el => matches(el, sel))
  }

  const document = fakeElement('#fake-document')
  document.title = 'Hermes Desktop'
  document.head = document.appendChild(fakeElement('head'))
  document.body = document.appendChild(fakeElement('body'))
  document.documentElement = fakeElement('html')
  document.documentElement.classList = {
    contains: c => c === 'dark' // app boots in dark mode
  }
  document.querySelectorAll = sel => querySelectorAll(document, sel)
  document.querySelector = sel => querySelectorAll(document, sel)[0] ?? null
  document.createElement = tag => fakeElement(tag)
  const noop = () => {}
  document.addEventListener = noop
  document.removeEventListener = noop
  globalThis.document = document
  globalThis.window = {
    innerWidth: 1600, innerHeight: 900,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    addEventListener: noop,
    removeEventListener: noop
  }
  globalThis.CSS = { escape: s => String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&') }
  globalThis.MutationObserver = class FakeMutationObserver {
    constructor() {}
    observe() {}
    disconnect() {}
  }

  const origError = console.error
  console.error = (...args) => { errors.push(args.join(' ')); origError(args.join(' ')) }

  // ── plugin context (same surface v0.2 already uses) ────────────────────
  const ctx = {
    register(contribution) {
      const area = contribution?.area
      if (!registry.has(area)) registry.set(area, [])
      registry.get(area).push(contribution) // H1: no validation, no throw
    },
    storage: {
      async get(key) {
        const v = localStorage.get(`hermes.plugin.tab-tint.${key}`)
        return v === undefined ? null : v
      },
      async set(key, value) {
        localStorage.set(`hermes.plugin.tab-tint.${key}`, value)
      }
    },
    onDispose(fn) { (ctx._disposed ??= []).push(fn) },
    _disposed: [],
    setInterval( /* fn, ms */ ) { return 0 } // no timers firing inside tests
  }

  // ── fake host (SDK boundary) ──────────────────────────────────────────
  const host = {
    state: {}
  }
  if (withApplyLayout) {
    host.applyLayout = (id, tree) => {
      applyCalls.push({ id, tree })
      localStorage.set(CORE_TREE_KEY, JSON.stringify(tree))
      localStorage.set(CORE_PRESET_ACTIVE_KEY, JSON.stringify(id))
      return { ok: true }
    }
  }

  function boot() {
    // seed live anchors: 7 tabs / 4 surfaces (spec header, probes boot v4–v7)
    const tab = key => {
      const t = fakeElement('div', { 'data-tree-tab': key, role: 'tab' })
      t.appendChild(fakeElement('span', { class: 'pane-tab-content' }))
      document.body.appendChild(t)
      return t
    }
    const surface = key => {
      const s = fakeElement('div', { 'data-chat-surface': key, 'data-session-anchor': key })
      document.body.appendChild(s)
      return s
    }
    tab('workspace'); surface('workspace')
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) tab(`session-tile:${id}`)
    surface('session-tile:a'); surface('session-tile:b'); surface('session-tile:c')
  }

  function restart() {
    // core restart: core repaints its own boot default; storage backend kept
    localStorage.set(CORE_TREE_KEY, JSON.stringify({
      type: 'split', id: 'spl-boot', direction: 'horizontal',
      children: [{ type: 'group', id: 'grp-boot', panes: ['workspace'] }]
    }))
  }

  function resetLayout() {
    // core reset verb (ARR-07): wipes applied user state; contributions survive
    localStorage.delete(CORE_TREE_KEY)
    localStorage.delete(CORE_PRESET_ACTIVE_KEY)
    applyCalls.length = 0
  }

  setHarness({
    notify: p => void notifications.push(p),
    navigate: p => void navigations.push(p),
    applyLayout: host.applyLayout
  })

  function anchors() {
    const tabs = querySelectorAll(document.body, '[data-tree-tab][role="tab"]')
    const surfaces = querySelectorAll(document.body, '[data-chat-surface][data-session-anchor]')
    return { tabs, surfaces }
  }

  return {
    ctx, host, registry, localStorage, errors, paneIds,
    boot, restart, resetLayout, anchors, notifications, navigations, applyCalls,
    localStorageMap: localStorage,
    coreKeys: { CORE_TREE_KEY, CORE_PRESET_ACTIVE_KEY, CORE_PRESETS_KEY },
    tree() { return JSON.parse(localStorage.get(CORE_TREE_KEY) ?? 'null') },
    activePreset() {
      const v = localStorage.get(CORE_PRESET_ACTIVE_KEY)
      return v === undefined ? null : JSON.parse(v)
    }
  }
}

// ── form comparison (tree value suffers id-churn per boot — compare FORM,
//    never strings; spec evidence: "a spec de verify compara FORMA, não string") ──
export function formOf(node) {
  if (!node || typeof node !== 'object') return null
  if (node.type === 'split') {
    return {
      type: 'split',
      direction: node.direction ?? node.splitType ?? null,
      children: (node.children ?? []).map(formOf)
    }
  }
  if (node.type === 'group') {
    return { type: 'group', panes: [...(node.panes ?? [])].sort() }
  }
  return { type: node.type ?? 'unknown' }
}

export function paneIdsOf(node) {
  if (!node || typeof node !== 'object') return []
  if (node.type === 'group') return [...(node.panes ?? [])]
  return (node.children ?? []).flatMap(paneIdsOf)
}

export function maxDepth(node, d = 0) {
  if (!node || typeof node !== 'object') return d
  return (node.children ?? []).reduce((m, c) => Math.max(m, maxDepth(c, d + 1)), d)
}

// weights normalized to 1e-6: |sum(sizes) - 1| <= 1e-6 in EVERY split that carries sizes
export function weightDelta(node) {
  if (!node || typeof node !== 'object') return 0
  let worst = 0
  if (node.type === 'split' && Array.isArray(node.sizes) && node.sizes.length) {
    const sum = node.sizes.reduce((a, b) => a + b, 0)
    worst = Math.max(worst, Math.abs(sum - 1))
  }
  for (const c of node.children ?? []) worst = Math.max(worst, weightDelta(c))
  return worst
}
