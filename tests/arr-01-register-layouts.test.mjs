import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plugin, bootPlugin, contributionsIn } from './helpers/drive.mjs'
import { createHarness } from './helpers/hermes-host.mjs'
import { ARRANGEMENTS, ARRANGEMENT_IDS } from './helpers/arrangements.mjs'

// ARR-01 — Registro de arrangement de plugin em `layouts` (n=6):
// core registry aceita; no throw, no log error; picker edit-mode lista com
// plugin-branded styling.

test('ARR-01.1 test_register_arrangements_in_layouts_area_without_throw', async () => {
  const h = createHarness()
  h.boot()
  const arrs = await bootPlugin(h).then(hh => contributionsIn(hh, 'layouts'))
  assert.equal(
    arrs.length, ARRANGEMENTS.length,
    `ARR-01: esperadas ${ARRANGEMENTS.length} contribuições de arrangement em área 'layouts'; ` +
    `registradas: ${arrs.length} [${arrs.map(a => a.id).join(', ')}] — máquina de arranjos ausente`
  )
  const ids = new Set(arrs.map(a => a.id))
  for (const id of ARRANGEMENT_IDS) {
    assert.ok(ids.has(id), `ARR-01: arrangement '${id}' ausente em 'layouts' (ids: ${[...ids].join(', ')})`)
  }
})

test('ARR-01.2 test_registration_log_errors_are_scoped_to_known_boot_log', async () => {
  const h = createHarness()
  h.boot()
  await bootPlugin(h)
  const rejective = h.errors.filter(e => !e.startsWith('[tab-tint] boot v3'))
  assert.deepEqual(rejective, [], 'ARR-01: registro exibiu erros no console')
})

test('ARR-01.3 test_picker_pane_listed_in_layouts_area', async () => {
  const h = createHarness()
  h.boot()
  await bootPlugin(h)
  const areas = [...h.registry.keys()]
  assert.ok(areas.includes('layouts'), `ARR-01: área 'layouts' ausente do registro (áreas: ${areas.join(', ')})`)
  // picker edit-mode: contribution carries picker metadata for the pane UI
  const arrs = contributionsIn(h, 'layouts')
  for (const a of arrs) {
    assert.ok(a.title, `ARR-01: contribuição ${a.id} sem title (picker não lista título)`)
    assert.ok(a.data, `ARR-01: contribuição ${a.id} sem dados de árvore (picker não renderiza preview)`)
  }
})

test('ARR-01.4 test_reregister_is_idempotent_six_arrangements_no_duplicates', async () => {
  const h = createHarness()
  h.boot()
  await bootPlugin(h)
  await plugin.register(h.ctx) // 2ª boot / re-register do plugin
  await bootPlugin(h)
  const arrs = contributionsIn(h, 'layouts')
  assert.equal(
    arrs.length, ARRANGEMENTS.length,
    `ARR-01: re-registro duplicou arrangements (${arrs.length} em vez de ${ARRANGEMENTS.length})`
  )
})
