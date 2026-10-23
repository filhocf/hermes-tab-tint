import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plugin, bootPlugin, contributionsIn, findCommand, APPLY_CMD_ID } from './helpers/drive.mjs'
import { createHarness } from './helpers/hermes-host.mjs'
import { ARRANGEMENTS, ARRANGEMENT_IDS } from './helpers/arrangements.mjs'

// ARR-07 — Reset layout verb: apaga estado do plugin, mas contribuições de plugin
// permanecem listadas; árvore volta ao default do plugin (2-level on apply).

test('ARR-07.1 test_reset_wipes_plugin_state_but_preserves_contributions', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmds = contributionsIn(h, 'layouts')
  assert.ok(cmds.length >= 6, `ARR-07: pré-condição: 6 contributions precisam existir (têm ${cmds.length})`)
  h.resetLayout()
  const after = contributionsIn(h, 'layouts')
  assert.equal(after.length, 6, `ARR-07: reset não pode apagar contribuições (ficaram ${after.length})`)
})

test('ARR-07.2 test_tree_returns_to_plugin_default_after_reset', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  await cmd.data.run({ name: 'rows-3' })
  const before = h.tree()
  assert.ok(before, 'ARR-07: pré-condição: árvore de rows-3 não persistiu')
  h.resetLayout()
  await bootPlugin(h)
  const t = h.tree()
  assert.ok(t, 'ARR-07: árvore default do plugin não restaurada')
  assert.ok(maxDepth(t) >= 2, 'ARR-07: default do plugin deveria ser 2-level tree')
})

test('ARR-07.3 test_reset_before_register_does_not_break_boot', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  h.resetLayout() // reset sem estado do plugin — núcleo pode resetar antes do plugin registrar
  await bootPlugin(h)
  const cmds = contributionsIn(h, 'palette')
  assert.ok(cmds.length >= 1, 'ARR-07: após reset, contribuições de comando devem continuar registradas')
})

function maxDepth(node, d = 0) {
  if (!node || typeof node !== 'object') return d
  return (node.children ?? []).reduce((m, c) => Math.max(m, maxDepth(c, d + 1)), d)
}
