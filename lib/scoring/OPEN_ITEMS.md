# Scoring — open items to revisit

Pragmatic stopgaps taken so the pipeline runs end-to-end. Each is deliberate, not
an oversight. Revisit before launch.

| # | item | current stopgap | where | unblock condition |
|---|---|---|---|---|
| 1 | **Cubic term `D` in `college_bar`** | `D = 0` (quadratic is complete + self-consistent per §10a) | `odds.ts` | procedures doc open #4 — set after residency (§15) lands and §10a's table is re-run |
| 2 | **`ambition` §17 vs §10 disagreement** | use §10's **formula**, not §17's stale table (doc: "runs use the formula values") | `ambition.ts` | reconcile §17's listed values with the formula |
| 3 | **Activity `text → tier` (1–4)** | scoring **consumes** an assigned tier per activity; the intake now collects text only and defaults every activity to `DEFAULT_EC_TIER = 2` (app/build/model.ts), so ECs don't yet differentiate students | `ec.ts` | decide the assignment method: model classification of the text / taxonomy pick / self-tag |

Other doc-flagged items not yet touched by this module (see `uniseek_procedures_v6.md`
§12/§14 and `uniseek_student_preferences.md` §5): the `match_score` floor defect,
the load-bearing band quota, real C7 weight vectors (archetypes are a stopgap),
residency (§15), and the confidence label (deferred by product decision).
