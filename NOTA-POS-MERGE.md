# Nota pós-merge — tab-tint-groups

Estado: PR mergeado em upstream/main.
Spec interna (PT-BR), conforme convenção: artefato público em EN.

## Verificações a executar

- Falhas na última execução do CI em GitHub Actions — listar e nomear.
- Pulo para fixture interna: spec interna em PT-BR (arquivo acima); artefato público em EN.
- Pendências penduradas: G1 RED, G2 GREEN, G4 revisão, G6 E2E.

## Regra de casa

- Precedência: SPEC + EARS + AC verificáveis ANTES de implementar.
- Preferível descartar e recomeçar pelo gate do que remendar fora do gate.

## Fontes

- `docs/spec/two-level-tab-groups-142689.md` — gerado pela Seven (G0 Think).
- `CHANGELOG.md` — 0.1.0 → 0.2.0 (bump pendente).
- `desktop/plugin.js` — 473 linhas.
