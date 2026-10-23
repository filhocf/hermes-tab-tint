/** Driver: imports the REAL production entrypoint and boots it on the fake host. */
import plugin from '../../desktop/plugin.js'

export { plugin }

/** Drain the plugin's promise chain (storage get → register → paint). */
export async function settle() {
  await new Promise(r => setImmediate(r))
  await new Promise(r => setImmediate(r))
}

export async function bootPlugin(harness) {
  await plugin.register(harness.ctx)
  await settle()
  return harness
}

export function contributionsIn(harness, area) {
  return harness.registry.get(area) ?? []
}

/** Spec-literal command ids (design item 1). */
export const APPLY_CMD_ID = 'tab-tint.apply-arrangement'
export const OPEN_CMD_ID = 'tab-tint.arrangements.open'

export function findCommand(harness, id) {
  for (const c of contributionsIn(harness, 'palette')) {
    if (c.data?.id === id) return c
  }
  return null
}
