/**
 * Two-level tab groups — shape manifest from the spec
 * docs/spec/two-level-tab-groups-142689.md (ARR-01, ARR-02, design item 4).
 *
 * The grammar: arrangements are named two-level trees, algorithmically
 * generated — columns 2..4, rows 2..4 — per-group stacking inside every
 * group. ARR-01 fixes N = 6.
 *
 * Live pane keys (spec line 18): the workspace tab is keyed `workspace`;
 * every tile is keyed `session-tile:<id>`. 7 live today.
 *
 * direction: root split orientation; panes: per-group pane distribution.
 */
export const LIVE_PANES = ['workspace', 'session-tile:a', 'session-tile:b', 'session-tile:c', 'session-tile:d', 'session-tile:e', 'session-tile:f']

export const ARRANGEMENTS = [
  { id: 'columns-2', direction: 'horizontal', panes: [4, 3] },
  { id: 'columns-3', direction: 'horizontal', panes: [3, 2, 2] },
  { id: 'columns-4', direction: 'horizontal', panes: [2, 2, 2, 1] },
  { id: 'rows-2',    direction: 'vertical',   panes: [4, 3] },
  { id: 'rows-3',    direction: 'vertical',   panes: [3, 2, 2] },
  { id: 'rows-4',    direction: 'vertical',   panes: [2, 2, 2, 1] }
]

export const ARRANGEMENT_IDS = ARRANGEMENTS.map(a => a.id)
