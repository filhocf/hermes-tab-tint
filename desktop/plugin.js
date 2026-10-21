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

/** Cada preset é um trio explícito — o que se vê é o que se aplica. */
const PRESETS = [
  { name: 'verde', tab: '#2E7D52', line: '#7EE787', bg: '#0E1C14' },
  { name: 'âmbar', tab: '#8A6512', line: '#E3B341', bg: '#1D1608' },
  { name: 'azul', tab: '#1F4E8A', line: '#6CB6FF', bg: '#0B1526' },
  { name: 'roxo', tab: '#5B2C8A', line: '#C297FF', bg: '#170D26' },
  { name: 'ciano', tab: '#0E5F6B', line: '#67E8F9', bg: '#06181B' },
  { name: 'rosa', tab: '#8A2C5B', line: '#F7A8D0', bg: '#230B18' },
  { name: 'vermelho', tab: '#8A2C2C', line: '#FF9A9A', bg: '#240C0C' },
  { name: 'laranja', tab: '#8A4A12', line: '#FFB86B', bg: '#23140A' },
  { name: 'limão', tab: '#5E6B12', line: '#D7E36B', bg: '#171A08' },
  { name: 'grafite', tab: '#3A4048', line: '#9AA4B2', bg: '#14171B' }
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

function themeOf(key) {
  const t = themes[key]
  if (!t) return null
  const tab = hex(t.tab)
  const line = hex(t.line)
  const bg = hex(t.bg)
  return tab && line && bg ? { tab, line, bg } : null
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
}
${surfSel} [data-slot="composer-surface"] {
  background: ${surface(t)} !important;
  border-color: color-mix(in srgb, ${t.line} 50%, var(--ui-stroke-secondary)) !important;
}
${surfSel} [data-slot="composer-root"] {
  --composer-fill: ${surface(t)};
}
${hostSel} {
  --ui-chat-surface-background: ${t.bg};
  --dt-card: ${surface(t)};
  box-shadow: inset 0 0 0 1px color-mix(in srgb, ${t.line} 30%, transparent);
}
${tabSel} {
  --tab-bg: ${t.tab};
  --pane-tab-strip-bg: ${t.tab};
  --pane-tab-active-bg: ${t.tab};
  --pane-tab-active-accent: ${t.line};
  border-color: color-mix(in srgb, ${t.line} 45%, transparent) !important;
  color: color-mix(in srgb, ${t.line} 20%, var(--ui-text-primary));
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
    'display:grid;grid-template-rows:9fr 1fr 5fr;width:26px;height:26px;border-radius:6px;overflow:hidden;' +
    `border:1px solid color-mix(in srgb, ${t.line} 45%, transparent);background:${t.bg};cursor:pointer;padding:0`
  el.innerHTML =
    `<span style="background:${t.tab}"></span>` +
    `<span style="background:${t.line}"></span>` +
    `<span style="background:${t.bg}"></span>`
  return el
}

function openPicker(anchor, key, ctx) {
  closePicker()
  const current = themeOf(key) || { tab: '#2E7D52', line: '#7EE787', bg: '#0E1C14' }

  const box = document.createElement('div')
  box.setAttribute('data-tab-tint-picker', '')
  box.style.cssText =
    'position:fixed;z-index:60;width:216px;padding:8px;border-radius:8px;' +
    'border:1px solid var(--ui-stroke-secondary);background:var(--ui-bg-elevated);' +
    'box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:11px;color:var(--ui-text-secondary)'

  const title = document.createElement('div')
  title.textContent = 'Tema desta aba'
  title.style.cssText = 'font-weight:600;margin-bottom:6px;color:var(--ui-text-primary)'

  const grid = document.createElement('div')
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:8px'

  const write = next => {
    themes = { ...themes, [key]: next }
    save(ctx)
    paint(true)
  }

  for (const preset of PRESETS) {
    const sw = swatch(preset)
    sw.addEventListener('click', () => {
      write({ tab: preset.tab, line: preset.line, bg: preset.bg })
      host.notify({ kind: 'info', message: `Tema ${preset.name} nesta aba.` })
    })
    grid.appendChild(sw)
  }

  const row = document.createElement('div')
  row.style.cssText = 'display:grid;gap:4px'
  const fields = [
    ['aba', 'tab'],
    ['linha', 'line'],
    ['fundo', 'bg']
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

  box.append(title, grid, row, clear)
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

function schedule(ctx) {
  if (queued) return
  queued = true
  window.setTimeout(() => sync(ctx), 80)
}

export default {
  id: ID,
  name: 'Tab Tint',
  register(ctx) {
    void Promise.resolve(ctx.storage.get(STORE_KEY)).then(stored => {
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) themes = stored
      sync(ctx)
      paint(true)
    })

    // ⌘K → "Tema da aba em foco"
    const area = sdk.PALETTE_AREA
    if (area) {
      try {
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
      } catch {
        /* paleta indisponível nesta shell */
      }
    }

    const observer = new MutationObserver(() => schedule(ctx))
    observer.observe(document.body, { attributes: true, childList: true, subtree: true })
    ctx.onDispose(() => observer.disconnect())

    ctx.setInterval(() => schedule(ctx), 2000)
    try {
      ctx.onDispose(host.state.focusedStoredSessionId.listen(() => schedule(ctx)))
    } catch {
      /* átomo ausente nesta shell — o intervalo cobre */
    }

    ctx.onDispose(() => {
      closePicker()
      observer.disconnect()
      lastCss = null
      styleEl?.remove()
      for (const btn of document.querySelectorAll(`[${BTN_ATTR}]`)) btn.remove()
    })
  }
}
