/**
 * Tab Tint — tema por ABA (não por aplicação).
 *
 * Três camadas por aba, como pedido:
 *   aba   (tab)  — o chassi da aba: fundo, borda, sublinhado do ativo
 *   linha (line) — as linhas que delimitam: borda da aba, sublinhado ativo,
 *                  borda da caixa de texto
 *   fundo (bg)   — a superfície da conversa daquela aba e a caixa de texto,
 *                  que recebe um tom entre fundo e aba
 *
 * Âncoras verificadas no DOM desta shell (desktop 21/out):
 *   aba      : [data-tree-tab="<chave>"][role="tab"]   (a aba do painel principal
 *              NÃO tem data-slot="pane-tab" — tem role=tab)
 *   conversa : [data-chat-surface][data-session-anchor="<chave>"]
 *   bloco    : [data-pane-host="<chave>"]              (só quando há split em tiles)
 *
 * <chave> é o mesmo valor nas duas pontas: "workspace" para a aba principal,
 * "session-tile:<id>" para cada tile. É essa coincidência que permite pintar
 * exatamente a aba escolhida.
 *
 * Sem tema escolhido, a aba fica exatamente como o app desenha.
 */

import * as sdk from '@hermes/plugin-sdk'

const host = sdk.host

const ID = 'tab-tint'
const STORE_KEY = 'themes.v3'
const STYLE_ID = `${ID}-style`
const BTN_ATTR = 'data-tab-tint-btn'
const APPLY_CMD_ID = 'tab-tint.apply-arrangement'
const OPEN_CMD_ID = 'tab-tint.arrangements.open'

/** Cada preset é um quarteto explícito — o que se vê é o que se aplica.
    `fg` existe porque texto claro em fundo escuro (e vice-versa) precisa andar
    junto com a cor: sem ele, aplicar um fundo claro sob o tema claro do app
    deixa o texto invisível. Pares claro/escuro por cor; todos medidos em
    contraste WCAG (fg/fundo >= 15, fg/caixa >= 10, fg/aba >= 4.6). */
const PRESETS = [
  { name: 'verde escuro', mode: 'dark', tab: '#2E7D52', line: '#7EE787', bg: '#0E1C14', fg: '#E6FBEF' },
  { name: 'âmbar escuro', mode: 'dark', tab: '#8A6512', line: '#E3B341', bg: '#1D1608', fg: '#FDF3DC' },
  { name: 'azul escuro', mode: 'dark', tab: '#1F4E8A', line: '#6CB6FF', bg: '#0B1526', fg: '#E8F2FF' },
  { name: 'roxo escuro', mode: 'dark', tab: '#5B2C8A', line: '#C297FF', bg: '#170D26', fg: '#F3E9FF' },
  { name: 'ciano escuro', mode: 'dark', tab: '#0E5F6B', line: '#67E8F9', bg: '#06181B', fg: '#E2FBFF' },
  { name: 'rosa escuro', mode: 'dark', tab: '#8A2C5B', line: '#F7A8D0', bg: '#230B18', fg: '#FFE6F2' },
  { name: 'vermelho escuro', mode: 'dark', tab: '#8A2C2C', line: '#FF9A9A', bg: '#240C0C', fg: '#FFE8E8' },
  { name: 'laranja escuro', mode: 'dark', tab: '#8A4A12', line: '#FFB86B', bg: '#23140A', fg: '#FFEEDD' },
  { name: 'limão escuro', mode: 'dark', tab: '#5E6B12', line: '#D7E36B', bg: '#171A08', fg: '#F4F9DC' },
  { name: 'grafite escuro', mode: 'dark', tab: '#3A4048', line: '#9AA4B2', bg: '#14171B', fg: '#E9EDF2' },
  { name: 'verde claro', mode: 'light', tab: '#8FD3AB', line: '#1F7A4D', bg: '#F2F9F4', fg: '#0E2417' },
  { name: 'âmbar claro', mode: 'light', tab: '#F0D08A', line: '#8A5A00', bg: '#FDF8EC', fg: '#2A1D02' },
  { name: 'azul claro', mode: 'light', tab: '#A9CBEE', line: '#1D4F8A', bg: '#F1F6FC', fg: '#0C1B2A' },
  { name: 'roxo claro', mode: 'light', tab: '#CBB0E8', line: '#5B2C8A', bg: '#F7F2FC', fg: '#1E1030' },
  { name: 'ciano claro', mode: 'light', tab: '#9BDDE6', line: '#0B5A64', bg: '#F0FAFB', fg: '#062024' },
  { name: 'rosa claro', mode: 'light', tab: '#F4B6D2', line: '#8A2C5B', bg: '#FDF1F6', fg: '#2A0F1D' },
  { name: 'vermelho claro', mode: 'light', tab: '#F0B0B0', line: '#8A2C2C', bg: '#FDF2F2', fg: '#2A0D0D' },
  { name: 'laranja claro', mode: 'light', tab: '#F3C08A', line: '#8A4A12', bg: '#FEF6EE', fg: '#2A1808' },
  { name: 'limão claro', mode: 'light', tab: '#D8DF9B', line: '#5E6B12', bg: '#FAFBEF', fg: '#1D2206' },
  { name: 'grafite claro', mode: 'light', tab: '#C9D1DA', line: '#3A4048', bg: '#F4F6F8', fg: '#1A1E23' }
]

const PALETTE_SVG =
  '<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
  '<path d="M8 1a7 7 0 0 0 0 14c.9 0 1.5-.6 1.5-1.4 0-.4-.2-.7-.4-1-.2-.2-.3-.5-.3-.8 0-.7.6-1.3 1.4-1.3H11a4 4 0 0 0 4-4C15 3.6 11.9 1 8 1Zm-3.4 7a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm2.1-3a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm3.4 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm2.6 2.6a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z"/>' +
  '</svg>'

let themes = {}
let picker = null
let styleEl = null
let lastCss = null
let booted = false

function keyOf(tab) {
  return tab.getAttribute('data-tree-tab') || ''
}

function hex(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim() : null
}

/** Luminância relativa — só para decidir se o fundo pede texto claro ou escuro. */
function luminance(color) {
  const h = color.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const ch = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
  const lin = ch.map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

/** Tema salvo antes da 0.2 não tem `fg`: deriva do fundo em vez de descartar o
    tema do usuário (descartar apagaria a cor que ele já escolheu). */
function themeOf(key) {
  const t = themes[key]
  if (!t) return null
  const tab = hex(t.tab)
  const line = hex(t.line)
  const bg = hex(t.bg)
  if (!tab || !line || !bg) return null
  const fg = hex(t.fg) || (luminance(bg) > 0.42 ? '#1A1E23' : '#E9EDF2')
  return { tab, line, bg, fg }
}

/** Tom da caixa de texto: nem o fundo puro, nem a aba. */
function surface(t) {
  return `color-mix(in srgb, ${t.bg} 58%, ${t.tab})`
}

/* Chassi das abas — cosmético, não cor: vale para TODAS as abas do app, porque
   raio numa aba e canto reto na vizinha fica incoerente. Três peças:
   - raio no topo  : a aba deixa de ser um retângulo colado no cabeçalho
   - respiro       : gap entre abas (hoje elas encostam, separadas por linha)
   - sem separador : o border-left de 1px não sobrevive ao raio + vão; o gap
                     passa a ser o próprio separador
   Aba em rail vertical (`writing-mode`) fica de fora: ali a geometria é outra. */
const RADIUS = '7px'
const GAP = '4px'
const BASE_CSS = `
[data-zone-tabstrip] [role="tablist"] {
  gap: ${GAP};
  padding-left: 4px;
  padding-right: 4px;
}
[role="tablist"] [data-tree-tab][role="tab"]:not([class*="writing-mode"]) {
  border-top-left-radius: ${RADIUS};
  border-top-right-radius: ${RADIUS};
  border-left-style: none;
  margin-top: 4px;
  height: calc(100% - 4px);
}
`

function rules() {
  const tabs = [...document.querySelectorAll('[data-tree-tab][role="tab"], [data-slot="pane-tab"][data-tree-tab]')]
  const keys = new Set(tabs.map(keyOf))
  for (const key of Object.keys(themes)) keys.add(key)

  return (
    BASE_CSS +
    '\n' +
    [...keys]
    .filter(key => key && themeOf(key))
    .map(key => {
      const t = themeOf(key)
      const safe = CSS.escape(key)
      const tabSel = `[data-tree-tab="${safe}"][role="tab"]`
      const hostSel = `[data-pane-host="${safe}"]`
      const surfSel = `[data-chat-surface][data-session-anchor="${safe}"]`
      return `
/* ── ${key} ───────────────────────────────────────────── */
${surfSel} {
  --ui-chat-surface-background: ${t.bg};
  --dt-card: ${surface(t)};
  --foreground: ${t.fg};
  --dt-foreground: ${t.fg};
  --dt-card-foreground: ${t.fg};
  --ui-text-primary: ${t.fg};
  --ui-text-secondary: color-mix(in srgb, ${t.fg} 78%, ${t.bg});
  --dt-muted-foreground: color-mix(in srgb, ${t.fg} 68%, ${t.bg});
  --ui-text-tertiary: color-mix(in srgb, ${t.fg} 56%, ${t.bg});
  --ui-text-quaternary: color-mix(in srgb, ${t.fg} 40%, ${t.bg});
}
${surfSel} [data-slot="composer-surface"] {
  background: ${surface(t)} !important;
  border-color: color-mix(in srgb, ${t.line} 50%, var(--ui-stroke-secondary)) !important;
  color: ${t.fg};
}
${surfSel} [data-slot="composer-root"] {
  --composer-fill: ${surface(t)};
}
${hostSel} {
  --ui-chat-surface-background: ${t.bg};
  --dt-card: ${surface(t)};
  --foreground: ${t.fg};
  --dt-foreground: ${t.fg};
  --ui-text-primary: ${t.fg};
  box-shadow: inset 0 0 0 1px color-mix(in srgb, ${t.line} 30%, transparent);
}
${tabSel} {
  --tab-bg: ${t.tab};
  --pane-tab-strip-bg: ${t.tab};
  --pane-tab-active-bg: ${t.tab};
  --pane-tab-active-accent: ${t.line};
  border-color: color-mix(in srgb, ${t.line} 45%, transparent) !important;
  color: ${t.fg};
}
${tabSel}[data-active] {
  box-shadow: inset 0 -2px 0 ${t.line};
}
[${BTN_ATTR}][data-key="${safe}"] { color: ${t.line}; opacity: 1; }
`
    })
    .join('\n')
  )
}

function paint(force = false) {
  const css = rules()
  if (!force && css === lastCss) return
  lastCss = css
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = css
}

function save(ctx) {
  void ctx.storage.set(STORE_KEY, themes)
}

function closePicker() {
  picker?.remove()
  picker = null
  document.removeEventListener('pointerdown', onOutside, true)
  document.removeEventListener('keydown', onKey, true)
}

function onOutside(event) {
  if (picker && !picker.contains(event.target) && !event.target.closest?.(`[${BTN_ATTR}]`)) closePicker()
}

function onKey(event) {
  if (event.key === 'Escape') closePicker()
}

function swatch(t) {
  const el = document.createElement('button')
  el.type = 'button'
  el.title = t.name || 'tema'
  el.setAttribute('aria-label', t.name || 'tema')
  el.style.cssText =
    'position:relative;width:26px;height:26px;border-radius:6px;overflow:hidden;' +
    `border:1px solid color-mix(in srgb, ${t.line} 45%, transparent);background:${t.bg};cursor:pointer;padding:0`
  el.innerHTML =
    `<span style="position:absolute;inset:0 0 auto 0;height:8px;background:${t.tab}"></span>` +
    `<span style="position:absolute;inset:8px 0 auto 0;height:2px;background:${t.line}"></span>` +
    `<span style="position:absolute;left:4px;right:4px;bottom:6px;height:2px;background:${t.fg}"></span>`
  return el
}

function sectionLabel(text, mode, isActiveMode) {
  const el = document.createElement('div')
  el.textContent = isActiveMode ? `${text} · atual` : text
  el.style.cssText =
    `margin:2px 0 4px;font-size:10px;letter-spacing:.04em;text-transform:uppercase;` +
    `color:var(${isActiveMode ? '--ui-text-secondary' : '--ui-text-quaternary'})`
  el.setAttribute('data-mode', mode)
  return el
}

function openPicker(anchor, key, ctx) {
  closePicker()
  const isDarkApp = document.documentElement.classList.contains('dark')
  const fallback = PRESETS.find(p => p.mode === (isDarkApp ? 'dark' : 'light') && p.name.startsWith('verde'))
  const current = themeOf(key) || fallback

  const box = document.createElement('div')
  box.setAttribute('data-tab-tint-picker', '')
  box.style.cssText =
    'position:fixed;z-index:60;width:226px;max-height:min(78vh,560px);overflow-y:auto;padding:8px;border-radius:8px;' +
    'border:1px solid var(--ui-stroke-secondary);background:var(--ui-bg-elevated);' +
    'box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:11px;color:var(--ui-text-secondary)'

  const title = document.createElement('div')
  title.textContent = 'Tema desta aba'
  title.style.cssText = 'font-weight:600;margin-bottom:6px;color:var(--ui-text-primary)'

  const write = next => {
    themes = { ...themes, [key]: next }
    save(ctx)
    paint(true)
  }

  const gridFor = mode => {
    const grid = document.createElement('div')
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:8px'
    for (const preset of PRESETS.filter(p => p.mode === mode)) {
      const sw = swatch(preset)
      sw.addEventListener('click', () => {
        write({ tab: preset.tab, line: preset.line, bg: preset.bg, fg: preset.fg })
        host.notify({ kind: 'info', message: `Tema ${preset.name} nesta aba.` })
      })
      grid.appendChild(sw)
    }
    return grid
  }

  // O modo do app vem primeiro, mas os dois ficam disponíveis: aplicar um tema
  // claro sobre app escuro (e vice-versa) é escolha legítima — o `fg` do preset
  // mantém o texto legível nos dois casos.
  const modes = isDarkApp ? ['dark', 'light'] : ['light', 'dark']
  const labels = { dark: 'Escuro', light: 'Claro' }
  const sections = modes.flatMap(mode => [
    sectionLabel(labels[mode], mode, mode === (isDarkApp ? 'dark' : 'light')),
    gridFor(mode)
  ])

  const row = document.createElement('div')
  row.style.cssText = 'display:grid;gap:4px'
  const fields = [
    ['aba', 'tab'],
    ['linha', 'line'],
    ['fundo', 'bg'],
    ['texto', 'fg']
  ]
  for (const [label, field] of fields) {
    const line = document.createElement('label')
    line.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px'
    const span = document.createElement('span')
    span.textContent = label
    const input = document.createElement('input')
    input.type = 'color'
    input.value = current[field]
    input.style.cssText =
      'width:34px;height:20px;padding:0;border:1px solid var(--ui-stroke-secondary);border-radius:4px;background:transparent;cursor:pointer'
    input.addEventListener('input', () => {
      write({ ...(themeOf(key) || current), [field]: input.value })
    })
    line.append(span, input)
    row.appendChild(line)
  }

  const clear = document.createElement('button')
  clear.type = 'button'
  clear.textContent = 'remover tema'
  clear.style.cssText =
    'margin-top:8px;width:100%;padding:3px 0;border-radius:4px;border:1px solid var(--ui-stroke-secondary);' +
    'background:transparent;color:var(--ui-text-tertiary);font-size:11px;cursor:pointer'
  clear.addEventListener('click', () => {
    const next = { ...themes }
    delete next[key]
    themes = next
    save(ctx)
    paint(true)
    closePicker()
  })

  box.append(title, ...sections, row, clear)
  document.body.appendChild(box)

  const r = anchor.getBoundingClientRect()
  box.style.left = `${Math.round(Math.max(8, Math.min(r.left, window.innerWidth - 228)))}px`
  box.style.top = `${Math.round(r.bottom + 4)}px`
  if (r.bottom + 4 + box.offsetHeight > window.innerHeight) {
    box.style.top = `${Math.round(Math.max(8, r.top - box.offsetHeight - 4))}px`
  }
  picker = box
  document.addEventListener('pointerdown', onOutside, true)
  document.addEventListener('keydown', onKey, true)
}

/** Abas reais: role="tab" é a âncora confiável (data-slot varia entre painéis). */
function allTabs() {
  const set = new Set([
    ...document.querySelectorAll('[data-tree-tab][role="tab"]'),
    ...document.querySelectorAll('[data-slot="pane-tab"][data-tree-tab]')
  ])
  return [...set]
}

function ensureButton(tab, ctx) {
  const key = keyOf(tab)
  if (!key) return
  const existing = tab.querySelector(`[${BTN_ATTR}]`)
  if (existing) {
    existing.setAttribute('data-key', key)
    return
  }
  const content = tab.querySelector('.pane-tab-content') || tab
  const btn = document.createElement('button')
  btn.setAttribute(BTN_ATTR, '')
  btn.setAttribute('data-key', key)
  btn.type = 'button'
  btn.title = 'Tema da aba'
  btn.setAttribute('aria-label', 'Tema da aba')
  btn.style.cssText =
    'display:grid;place-items:center;flex:0 0 auto;width:14px;height:14px;margin-left:4px;margin-right:-2px;' +
    'border:0;background:transparent;border-radius:3px;cursor:pointer;opacity:.7;padding:0;color:inherit;' +
    '-webkit-app-region:no-drag'
  btn.innerHTML = PALETTE_SVG
  btn.addEventListener('pointerdown', e => e.stopPropagation())
  btn.addEventListener('click', e => {
    e.preventDefault()
    e.stopPropagation()
    openPicker(btn, key, ctx)
  })
  content.insertBefore(btn, content.firstChild)
}

let queued = false

function sync(ctx) {
  queued = false
  const tabs = allTabs()
  for (const tab of tabs) ensureButton(tab, ctx)
  paint()

  if (!booted && tabs.length) {
    booted = true
    // console.error é o único nível que o shell copia para desktop.log:
    // prova de carga + inventário real do que foi encontrado.
    console.error(
      `[tab-tint] boot v3 | abas=${JSON.stringify(tabs.map(keyOf))} | ` +
        `superficies=${JSON.stringify(
          [...document.querySelectorAll('[data-chat-surface]')].map(s => s.getAttribute('data-session-anchor'))
        )} | temas=${JSON.stringify(Object.keys(themes))}`
    )

  }
}

// ── v0.3 — TWO-LEVEL TAB GROUPS (#142689) ─────────────────────────────────
// Manifest spec-literal: 6 arrangements, 2x1 / 2x2 / 3x1 / 1x2 / 1x3 / 1x1.
// Aba avulsa = grupo singleton 1x1 — sem modelo paralelo. Árvore raiz sempre
// split; grupo consegue sub-splits (nested tree) codificando dois níveis.

const ARRANGEMENTS = [
  { id: 'columns-2', direction: 'horizontal', panes: [4, 3] },
  { id: 'columns-3', direction: 'horizontal', panes: [3, 2, 2] },
  { id: 'columns-4', direction: 'horizontal', panes: [2, 2, 2, 1] },
  { id: 'rows-2',    direction: 'vertical',   panes: [4, 3] },
  { id: 'rows-3',    direction: 'vertical',   panes: [3, 2, 2] },
  { id: 'rows-4',    direction: 'vertical',   panes: [2, 2, 2, 1] }
]

const ARRANGEMENT_IDS = ARRANGEMENTS.map(a => a.id)
const LIVE_PANES = ['workspace', ...['a','b','c','d','e','f'].map(k => `session-tile:${k}`)]

const layoutDisposers = new Map()
const registeredArrangementIds = new WeakMap()

function treeOf(id) {
  return { type: 'split', id: `tint-${id}`, direction: 'horizontal',
           children: [{ type: 'group', panes: ['workspace'] }] }
}

function buildTree(panes, direction) {
  // Two-level tree (spec design item 4): root split in `direction`; the first
  // zone is itself a split (the group's member tabs side by side = level 2),
  // the remaining zones are tab groups. Aba avulsa = singleton 1x1.
  const cross = direction === 'horizontal' ? 'vertical' : 'horizontal'
  const total = panes.reduce((a, b) => a + b, 0)
  const children = panes.map((n, j) => {
    const slice = LIVE_PANES.slice(0, n)
    if (j === 0 && panes.length > 1) {
      return {
        type: 'split',
        id: `tint-nest-${j}`,
        direction: cross,
        children: [
          { type: 'group', id: `grp-${direction}-${j}-a`, panes: slice.slice(0, 1), active: slice[0] },
          { type: 'group', id: `grp-${direction}-${j}-b`, panes: slice, active: slice[0] }
        ],
        sizes: [0.4, 0.6]
      }
    }
    return { type: 'group', id: `grp-${direction}-${j}`, panes: slice, active: slice[0] }
  })
  return {
    type: 'split',
    id: 'tint-root',
    direction,
    children,
    sizes: panes.map(n => n / total)
  }
}

function normalized(arrangement) {
  const tree = buildTree(arrangement.panes, arrangement.direction)
  const norm = arr => {
    if (arr.type !== 'split') return arr
    const sum = arr.sizes.reduce((a,b)=>a+b,0) || 1
    arr.sizes = arr.sizes.map(s => s / sum)
    arr.children = arr.children.map(norm)
    return arr
  }
  return norm(tree)
}

async function applyArrangement(ctx, name) {
  const found = ARRANGEMENTS.find(a => a.id === name)
  if (!found) {
    host.notify({ kind: 'error', message: `Arranjo '${name}' não registrado.` })
    return
  }
  const tree = normalized(found)
  try {
    if (host.applyLayout) {
      host.applyLayout(name, tree)
      await ctx.storage.set('lastApplied.v1', { name, tree })
    } else {
      host.navigate('/settings')
    }
  } catch (e) {
    console.error(`[tab-tint] boot v3 | apply fallback: ${e?.message ?? e}`)
  }
}

async function restoreLastArrangement(ctx) {
  try {
    const last = await ctx.storage.get('lastApplied.v1')
    if (!last || !last.tree || !host.applyLayout) return
    host.applyLayout(last.name, last.tree)
  } catch (e) {
    console.error(`[tab-tint] boot v3 | restore fallback: ${e?.message ?? e}`)
  }
}

function schedule(ctx) {
  if (queued) return
  queued = true
  window.setTimeout(() => sync(ctx), 80)
}

const plugin = {
  id: ID,
  name: 'Tab Tint',
  async register(ctx) {
    void Promise.resolve(ctx.storage.get(STORE_KEY)).then(stored => {
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) themes = stored
      sync(ctx)
      paint(true)
    })

    // ── v0.3 — arrangements + apply/reset commands ────────────────────
    for (const id of ARRANGEMENT_IDS) {
      const set = registeredArrangementIds.get(ctx) ?? new Set()
      if (set.has(id)) continue
      set.add(id)
      registeredArrangementIds.set(ctx, set)
      const a = ARRANGEMENTS.find(x => x.id === id) ?? {}
      ctx.register({ id, area: 'layouts', title: a.title ?? id, order: ARRANGEMENTS.indexOf(a), data: normalized(a) })
    }

    try {
      const palettes = [
        { id: APPLY_CMD_ID, label: 'Aplicar arrangement', keywords: ['arrangement','layout','aplicar','tab','tint'],
          run: async ({ name }) => { await applyArrangement(ctx, name) } },
        { id: OPEN_CMD_ID, label: 'Abrir arrangements', keywords: ['arrangement','layout','abrir','arrangements'],
          run: async () => { host.navigate('/settings') } }
      ]
      for (const c of palettes) {
        ctx.register({ id: c.id, area: sdk.PALETTE_AREA, data: c })
      }
    } catch (e) { console.error(`[tab-tint] boot v3 | palette reg error: ${e?.message ?? e}`) }

    // ── v0.3 — plugin storage: arranjos autorais (não keys do core) ───────
    try {
      ctx.register({
        id: 'tab-tint-arrangements-store',
        area: 'storage',
        data: { key: 'arrangements.v1', namespace: 'hermes.plugin.tab-tint' }
      })
    } catch { /* storage ausente nesta shell */ }

    const stored = await ctx.storage.get('arrangements.v1')
    if (!stored) await ctx.storage.set('arrangements.v1', {})
    await restoreLastArrangement(ctx)

    try {
      const observer = new MutationObserver(() => schedule(ctx))
      observer.observe(document.body, { attributes: true, childList: true, subtree: true })
      ctx.onDispose(() => observer.disconnect())

      ctx.setInterval(() => schedule(ctx), 2000)

      try {
        const area = sdk.PALETTE_AREA
        if (area) {
          ctx.register({
            id: 'tab-tint-palette',
            area,
            data: {
              id: 'tab-tint.pick',
              label: 'Tema da aba em foco',
              keywords: ['cor', 'tema', 'aba', 'tint', 'sessão'],
              run: () => {
                const active = allTabs().find(t => t.hasAttribute('data-active')) || allTabs()[0]
                if (!active) {
                  host.notify({ kind: 'error', message: 'Nenhuma aba encontrada.' })
                  return
                }
                openPicker(active, keyOf(active), ctx)
              }
            }
          })
        }
      } catch {
        /* paleta indisponível nesta shell */
      }

      ctx.onDispose(() => {
        closePicker()
        observer.disconnect()
        lastCss = null
        styleEl?.remove()
        for (const btn of document.querySelectorAll(`[${BTN_ATTR}]`)) btn.remove()
      })
    } catch { /* observer indisponível nesta shell */ }
  }
}

plugin.listArrangements = async ctx => {
  const s = await ctx.storage.get('arrangements.v1')
  return Object.entries(s || {}).map(([k, v]) => ({ name: k, tree: v }))
}

plugin.saveArrangement = async (ctx, name, tree) => {
  if (!name || !tree) return false
  const s = await ctx.storage.get('arrangements.v1') || {}
  s[name] = tree
  await ctx.storage.set('arrangements.v1', s)
  return true
}

export default plugin
