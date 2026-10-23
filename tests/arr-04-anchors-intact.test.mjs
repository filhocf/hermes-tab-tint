import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plugin, bootPlugin, contributionsIn, findCommand, APPLY_CMD_ID } from './helpers/drive.mjs'
import { createHarness, LIVE_TABS, LIVE_SURFACES } from './helpers/hermes-host.mjs'
import { ARRANGEMENTS, ARRANGEMENT_IDS } from './helpers/arrangements.mjs'

// ARR-04 — Anchors intactos: [data-tree-tab] e [data-session-anchor] por aba
// (7 live hoje; >=N depois da feature) — no anchor breakage.

test('ARR-04.1 test_anchor_counts_unchanged_after_apply', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const before = h.anchors()
  assert.equal(before.tabs.length, LIVE_TABS, 'ARR-04: pré-condição: baseline de abas tem de ser 7')
  assert.equal(before.surfaces.length, LIVE_SURFACES, 'ARR-04: pré-condição: baseline de superfícies tem de ser 4')
  const cmd = findCommand(h, APPLY_CMD_ID)
  await cmd.data.run({ name: 'columns-3' })
  const after = h.anchors()
  assert.ok(after.tabs.length >= LIVE_TABS, `ARR-04: abas após apply (${after.tabs.length}) < baseline $(LIVE_TABS)`)
  assert.ok(after.surfaces.length >= LIVE_SURFACES, `ARR-04: superfícies após apply (${after.surfaces.length}) < baseline $(LIVE_SURFACES)`)
})

test('ARR-04.2 test_anchor_key_bridge_preserved', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  await cmd.data.run({ name: 'rows-3' })
  const tabKeys = new Set([...h.anchors().tabs.map(t => t.getAttribute('data-tree-tab'))])
  const surfaces = h.anchors().surfaces
  // cada surface tem que ter tab de mesmo key (a ponte v0.2 pinta a aba certa)
  for (const s of surfaces) {
    assert.ok(tabKeys.has(s.getAttribute('data-session-anchor')), `ARR-04: surface ${s.getAttribute('data-session-anchor')} sem tab correspondente`)
  }
})

test('ARR-04.3 test_anchor_key_bridge_lives_even_after_apply', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  await cmd.data.run({ name: 'columns-4' })
  // link legítimo só existe se data-session-anchor e data-tree-tab têm o MESMO valor —
  // plano técnico permite MASH: session-tile:<id>
  const tabs = h.anchors().tabs
  assert.ok(tabs.length > 0, 'ARR-04: abas desapareceram após apply')
  const keys = new Set(tabs.map(t2 => t2.getAttribute('data-tree-tab')))
  for (const s of h.anchors().surfaces) {
    const k = s.getAttribute('data-session-anchor')
    assert.ok(keys.has(k), `ARR-04: surface '${k}' sem tab de mesmo key após apply`)
  }
})
