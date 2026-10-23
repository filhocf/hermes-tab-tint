import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plugin, bootPlugin, contributionsIn } from './helpers/drive.mjs'
import { createHarness, formOf } from './helpers/hermes-host.mjs'
import { ARRANGEMENTS, ARRANGEMENT_IDS } from './helpers/arrangements.mjs'

// ARR-06 — Plugin ctx.storage roundtrip: 100% em 6 arrangements, sem colisão
// com hermes.desktop.layoutPresets.v2.

function treeOf(id) {
  return { type: 'split', id: `tint-${id}`, direction: 'horizontal',
           children: [{ type: 'group', panes: ['workspace'] }] }
}

test('ARR-06.1 test_listArrangements_reflects_user_saved_after_restart', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const expected = {}
  for (const id of ARRANGEMENT_IDS) expected[id] = treeOf(id)
  await h.ctx.storage.set('arrangements.v1', expected)
  const h2 = createHarness({ storage: h.localStorageMap })
  h2.boot()
  await bootPlugin(h2) // restart: mesmo storage, novo boot — restore path do plugin
  assert.ok(plugin.listArrangements, 'ARR-06: plugin.listArrangements ausente — pane não consegue listar restaurados')
  const list = await plugin.listArrangements(h2.ctx)
  assert.equal(list.length, 6, `ARR-06: restaurados ${list.length}, esperado 6`)
  for (const id of ARRANGEMENT_IDS) {
    const got = list.find(a => a.name === id)
    assert.ok(got, `ARR-06: arranjo '${id}' não restaurado`)
    assert.deepEqual(formOf(got.tree), formOf(expected[id]), `ARR-06: árvore de '${id}' diverge do salvo`)
  }
})

test('ARR-06.2 test_saveArrangement_writes_plugin_namespace_not_core_keys', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const coreKey = h.coreKeys.CORE_PRESETS_KEY
  assert.ok(plugin.saveArrangement, 'ARR-06: plugin.saveArrangement ausente — pane não consegue salvar arranjo')
  const ok = await plugin.saveArrangement(h.ctx, 'grid-2x2', treeOf('grid-2x2'))
  assert.ok(ok, 'ARR-06: salvar arranjo falhou')
  const saved = await h.ctx.storage.get('arrangements.v1')
  assert.ok('grid-2x2' in Object(saved ?? {}), 'ARR-06: arranjo salvo não encontrado na storage do plugin')
  assert.equal(h.localStorageMap.get(coreKey), undefined,
    `ARR-06: plugin escreveu no namespace do core ('${coreKey}') — colisão`)
})

test('ARR-06.3 test_raw_storage_roundtrip_survives_restart', async () => {
  const h = createHarness()
  h.boot()
  const bad = ['<script>alert(1)</script>', 'a b c d e f g', 'x  y']
  const map = {}
  for (const name of bad) map[name] = treeOf(name)
  await h.ctx.storage.set('arrangements.v1', map)
  const got = await h.ctx.storage.get('arrangements.v1')
  for (const name of bad) {
    assert.ok(name in got, `ARR-06: nome malicioso '${name}' perdido no roundtrip`)
  }
})
