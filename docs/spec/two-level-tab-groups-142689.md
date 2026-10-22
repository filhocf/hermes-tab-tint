---
title: "Two-level tab groups with per-group tiling layout (#142689)"
status: design
date: 2026-10-21
verified: live packaged build (apps/desktop release/linux-unpacked), probes boot v4-v7
---

# Two-level tab groups with per-group tiling layout (#142689)

## Pergunta

Opção de abordagem: extensão plugin (tab-tint) vs patch core. Desenhar a implementação plugin-only e os ganchos core que ela depende; desenhar e criar o cmd+pane de layout.

## Evidência

Live (probes boot v4/v5/v6/v7 no build packaged em execução; plugin instalado em `~/.hermes/desktop-plugins/tab-tint/`):

- [medido] boot v4 17:00, live: `tabs=7` `[role="tab"][data-tree-tab]`, `surfaces=4` `[data-chat-surface][data-session-anchor]` (`workspace` + 2×`session-tile:<id>`), `slotPaneTab=3`, `tablists=6`, sem tablist aninhado na tela agora, `hosts=0` (`[data-pane-host]` não renderiza neste build).
- [medido] Persisted tree: `localStorage['hermes.desktop.layoutTree.v2']` = árvore de splits com nesting em dois níveis (`{"type":"split","id":"spl-root",...children:[{type:"group"...},{type:"split"...}]}`); `hermes.desktop.layoutPreset.active` guarda o preset ativo.
- [medido] Registro de plugin para area 'layouts': `ctx.register({id, area:'layouts', title, data:LayoutNode-tree})` aceito sem throw em 3 boots (v5/v6/v7); registry NÃO valida area.
- [medido] Plugin storage namespace: `hermes.plugin.tab-tint.themes.v3` (localStorage sob wrapper `writeKey`).
- [medido] Live: 19 areas exportadas pelo SDK (`window.__HERMES_PLUGIN_SDK__`); **NÃO existe `LAYOUTS_AREA` no SDK**.
- [medido] Tree value sofre id-churn a cada boot (unchanged=false em 2/2 verificação) — a spec de verify compara FORMA, não string.
- [medido] `hosts=0`: a âncora que o tab-tint v0.2 usa (`[data-pane-host]`) NÃO existe neste build — v0.3 precisa de âncoras re-visadas (e o doc existing de tile host está ultrapassado).

Lido:

- [lido] `contrib/registry.ts:53-137` — byArea Map genérico; sem whitelist de area.
- [lido] `contrib/plugin.ts:350` — `scope()` apenas namespaceia id e marca source; não valida area.
- [lido] `pane-shell/tree/presets.ts:19-59` — `registerBundledPresets` espera `{id, resting?, tier?, listed?, order, title, tree}`.
- [lido] `presets.ts:219` — `applyLayoutPreset(id, tree)` chama `applyTree` (store.ts:1752); **não exportado via SDK**.
- [lido] `keybinds/plugin-actions.ts:19-48` — `PLUGIN_APP_ACTIONS`: só view toggles; NÃO tem layout apply.
- [lido] `model.ts:20-64` — `LayoutNode = SplitNode | GroupNode`; `GroupNode.panes: string[]` (sem subtree por tab); `normalize` mantém splits não vazios.
- [lido] `layout-persistence.ts` — `LAYOUT_KEYS`: `hermes.desktop.layoutTree.v2`, `hermes.desktop.layoutPreset.active`, etc.

## Desenho

### Recomendação em uma linha

**Patch core mínimo + plugin (tab-tint v0.3)**: o registry aceita contributions de plugin em `area: 'layouts'` (live-proven), MAS apply programático exige H2 (host verb applyLayout); sem H2, o plugin lista arrangements e o usuário aplica na UI nativa.

### Model grammar

- Arrangement = named tree `{id, title, order, tier, tree: LayoutNode, resting?: string[]}`.
- Two-level = tree com splits nested; outer level = tab groups (group nodes), inner level = per-group tiling (split children per zone).
- A grammar já suporta; v2 já persiste (live).

### Plugin-only implementation

1. **cmd (⌘K)**: `tab-tint.apply-arrangement` (applies preset named; needs H2) + `tab-tint.arrangements.open` (opens picker pane). Each `run()` uses `host.applyLayout(id, tree)` (H2) or falls back to `host.navigate('/settings')`.
2. **pane**: "Arranjos" (config panel + cards) — placement `'right'`, `render` via `jsx()` from `react/jsx-runtime`; card grid per arrangement; drag-and-drop entre grupos; preview per group; save current as preset.
3. **persistence**: `ctx.storage` `'arrangements.v1'` = `{name: tree}` — user-authored arrangements sobrevivem a reload (plugin storage namespace live-verified).
4. **Encoding**: enum shapes algorithmically generated (columns 2..4, rows 2..4, grid 2x2/3x2, per-group stacking) — sem free-form editing no pane (paste JSON como escape hatch).

### Core hooks que o design depende

- **H1** [grátis, provado]: aceitação de contribuições de plugin em `'layouts'` (live).
- **H2** [faltante]: verb para aplicar: `host.applyLayout(id, tree?)` — wraps `applyLayoutPreset`; case denial list: `'denied'`. Sem H2: plugin só navega (host.navigate to picker route; verify exact path live).
- **H3** [provado como leitura]: codec v2 tolera nested splits com grupos em dois níveis.
- **H4** [provado]: `ctx.storage` namespace — persistência de arranjos key-scoped plugin.

## Riscos e lacunas

- Windows/other-platform paths (FancyZones), dock enforce, drag-session interactions com presets de plugin mid-session — untested.
- `resting` semantics em presets de plugin — `layoutPickOpens` lê `layoutPresetResting`; plugin não chama `layoutPresetResting` (core-internal); plugin preset tier → i18n strings... tier check pode esconder preset em Simple mode.
- Storage user-saved presets round-trip via localStorage `hermes.desktop.layoutPresets.v2` (core side), plugin arrangements via plugin storage — dois sources; plugin não shadowing core user presets.
- applyTree programa; verificação G4, on-screen: user decide visual.

## Critério de aceitação

- ARR-01: Registro de arrangement de plugin em `layouts` (n=6) — core registry aceita; no throw, no log error; picker edit-mode lista com plugin-branded styling.
- ARR-02: Apply programático via `host.applyLayout` — persisted tree v2 reflete tree de dois níveis; shapes match spec (N=6 arrangements); weights normalized to 1e-6 after apply.
- ARR-03: Boot restore: after restart, arrangement persists; pane ids stable across restarts (0 lost panes).
- ARR-04: Anchors intact: `[data-tree-tab]` ` data-session-anchor` per tab (7 live today; ≥N after feature lands) — no anchor breakage.
- ARR-05: Apply latency: < 150 ms from command run to settled tree position (count ones that are not "estimativa": medir).
- ARR-06: Plugin `ctx.storage` roundtrip: 100% on 6 arrangements, no collision with `hermes.desktop.layoutPresets.v2` keys.
- ARR-07: Reset layout verb wipes plugin state → plugin presets remain listed (they're contributions) but tree = plugin default... plugin contributes its own 2-level on apply.
