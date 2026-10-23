import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plugin, bootPlugin, contributionsIn, findCommand, APPLY_CMD_ID } from './helpers/drive.mjs'
import { createHarness, LIVE_TABS, LIVE_SURFACES } from './helpers/hermes-host.mjs'
import { ARRANGEMENTS, ARRANGEMENT_IDS } from './helpers/arrangements.mjs'

// ARR-05 — Latência de apply: < 150 ms do comando à posição final da árvore.
// Não-estimativa: MEDIR (conta os que não são "estimativa": medir).

test('ARR-05.1 test_apply_latency_measured_not_estimated', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const cmd = findCommand(h, APPLY_CMD_ID)
  assert.ok(cmd, 'ARR-05: comando apply não registrado')
  const t0 = process.hrtime.bigint()
  await cmd.data.run({ name: 'columns-3' })
  const t1 = process.hrtime.bigint()
  const ms = Number(t1 - t0) / 1e6
  assert.ok(Number.isFinite(ms) && ms > 0, `ARR-05: latência não medida: ${ms} ms`)
  assert.ok(ms < 150, `ARR-05: apply levou ${ms.toFixed(1)} ms — deve ser < 150 ms`)
})

test('ARR-05.2 test_all_six_arrangements_within_150ms', async () => {
  const h = createHarness({ withApplyLayout: true })
  h.boot()
  await bootPlugin(h)
  const measured = {}
  for (const id of ARRANGEMENT_IDS) {
    const cmd = findCommand(h, APPLY_CMD_ID)
    const t0 = process.hrtime.bigint()
    await cmd.data.run({ name: id })
    const t1 = process.hrtime.bigint()
    measured[id] = Number(t1 - t0) / 1e6
  }
  assert.equal(Object.keys(measured).length, 6, `ARR-05: medidos ${Object.keys(measured).length}, esperados 6`)
  for (const [id, ms] of Object.entries(measured)) {
    assert.ok(ms < 150, `ARR-05: '${id}' levou ${ms.toFixed(1)} ms — deve ser < 150 ms`)
  }
})
