import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formOf, weightDelta, createHarness } from './helpers/hermes-host.mjs'
import { ARRANGEMENTS, ARRANGEMENT_IDS } from './helpers/arrangements.mjs'
import { plugin, bootPlugin, contributionsIn, findCommand, APPLY_CMD_ID } from './helpers/drive.mjs'

// ARR-02 — Apply programático via host.applyLayout: persisted tree v2 reflete
// árvore de dois níveis; shapes match spec (N=6); weights normalized to 1e-6.

test('ARR-02.1 test_apply_command_uses_host_applylayout_primary_path', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  assert.ok(cmd, `ARR-02: comando '${APPLY_CMD_ID}' não registrado no palette`)
  await cmd.data.run({ name: 'columns-3' })
  assert.equal(h.applyCalls.length, 1, `ARR-02: host.applyLayout não chamado (calls: ${h.applyCalls.length})`)
  const t = h.tree()
  assert.ok(t, 'ARR-02: árvore persistida em hermes.desktop.layoutTree.v2 após apply')
})

test('ARR-02.2 test_all_six_shapes_match_manifest', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  for (const exp of ARRANGEMENTS) {
    const before = h.applyCalls.length
    const cmd = findCommand(h, APPLY_CMD_ID)
    await cmd.data.run({ name: exp.id })
    assert.equal(h.applyCalls.length, before + 1, `ARR-02: apply de '${exp.id}' não persistiu árvore`)
    const form = formOf(h.tree())
    assert.ok(form, `ARR-02: árvore persisted de '${exp.id}' vazia`)
    assert.equal(form.type, 'split', `ARR-02: raiz de '${exp.id}' deve ser split`)
    assert.equal(form.children.length, exp.panes.length, `ARR-02: '${exp.id}' deveria ter ${exp.panes.length} grupos, tem ${form.children.length}`)
    assert.equal(form.direction, exp.direction, `ARR-02: direção de '${exp.id}' divergente do manifest`)
  }
})

test('ARR-02.3 test_weights_normalized_to_1e-6_after_apply', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  for (const id of ARRANGEMENT_IDS) {
    const cmd = findCommand(h, APPLY_CMD_ID)
    await cmd.data.run({ name: id })
    const d = weightDelta(h.tree())
    assert.ok(
      d <= 1e-6,
      `ARR-02: pesos de '${id}' não normalizados: |sum-1| = ${d} > 1e-6`
    )
  }
})

test('ARR-02.4 test_apply_falls_back_to_navigate_without_host_applylayout', async () => {
  const h = createHarness({ withApplyLayout: false })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  await cmd.data.run({ name: 'columns-3' })
  assert.equal(h.navigations.length, 1, `ARR-02: sem H2, plugin deveria navegar (chamadas: ${h.navigations.length})`)
  assert.equal(h.navigations[0], '/settings', `ARR-02: fallback navegou para '${h.navigations[0]}', esperado '/settings'`)
})

test('ARR-02.5 test_apply_command_runs_through_plugin_composition', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  // O comando é registrado pelo palette (⌘K) — sem ele, run() não existe no caminho real
  const cmd = findCommand(h, APPLY_CMD_ID)
  assert.ok(cmd, `ARR-02: comando '${APPLY_CMD_ID}' ausente — plugin-render sem comando aplicável`)
  await cmd.data.run({ name: 'columns-3' })
  const t = h.tree()
  assert.ok(t, 'ARR-02: árvore persistida após apply')
  assert.equal(t.children.length, 3, `ARR-02: colunas-3 deveria ter 3 tab groups, tem ${t.children.length}`)
})

test('ARR-02.6 test_all_six_arrangements_apply_without_error', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  for (const id of ARRANGEMENT_IDS) {
    const cmd = findCommand(h, APPLY_CMD_ID)
    await cmd.data.run({ name: id })
    assert.ok(h.tree(), `ARR-02: apply de '${id}' não persistiu árvore`)
  }
})
