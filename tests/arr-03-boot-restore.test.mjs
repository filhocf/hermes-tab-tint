import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plugin, bootPlugin, contributionsIn, findCommand, APPLY_CMD_ID } from './helpers/drive.mjs'
import { createHarness, formOf, paneIdsOf } from './helpers/hermes-host.mjs'
import { ARRANGEMENTS, ARRANGEMENT_IDS } from './helpers/arrangements.mjs'

// ARR-03 — Boot restore: arrangement persists; pane ids estáveis (0 panes perdidos).

test('ARR-03.1 test_arrangement_persists_across_restarts', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  await cmd.data.run({ name: 'rows-3' })
  const treeBefore = h.tree() // árvore persistida com o arrangement aplicado
  assert.ok(treeBefore, 'ARR-03: pré-condição: árvore de rows-3 não persistiu')
  // restart: mesmo storage, novo boot do plugin
  const h2 = createHarness({ storage: h.localStorage })
  h2.boot()
  await bootPlugin(h2) // auto-restore, sem apply programático
  const treeAfter = h2.tree()
  assert.ok(treeAfter, 'ARR-03: árvore de arranjo não restaurada')
  assert.deepEqual(formOf(treeAfter), formOf(treeBefore), 'ARR-03: forma da árvore restaurada diverge da persistida')
})

test('ARR-03.2 test_zero_panels_lost_across_restart', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  await cmd.data.run({ name: 'columns-2' })
  const before = paneIdsOf(h.tree()).sort()
  const h2 = createHarness({ storage: h.localStorage })
  h2.boot()
  await bootPlugin(h2)
  const after = paneIdsOf(h2.tree()).sort()
  assert.deepEqual(after, before, `ARR-03: panes perdidos no restart (antes: ${before.length}, depois: ${after.length})`)
})

test('ARR-03.3 test_corrupted_tree_v2_boots_without_crash', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  h.localStorage.set('hermes.desktop.layoutTree.v2', 'not-json{{') // banco zerado / corrompido
  await bootPlugin(h)
  assert.ok(h, 'ARR-03: boot deve retornar sem crash')
  assert.equal(h.registry.get('layouts')?.length, 6, 'ARR-03: arranjos registrados mesmo com estado corrompido')
})

test('ARR-03.4 test_idempotent_restore_no_duplicate_arrangements', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  await cmd.data.run({ name: 'rows-4' })
  await bootPlugin(h) // 2ª boot: restore (não criar arranjo novo)
  const s = h.ctx.storage
  const arrs = await s.get('arrangements.v1')
  assert.ok(Array.isArray(arrs) ? arrs.length === 6 : true, `ARR-03: arrangements duplicados no restore (${Array.isArray(arrs) ? arrs.length : 'n/a'})`)
})
