# Readiness Checklist

A human-readable version of the real scoring rubric implemented in
`readiness_score_detail()` (src/lib/modelops/tools.ts) and documented
in `src/lib/modelops/taxonomy.ts` / `tool-rules.ts`.

## 1. Model Identification — max 10 points
- [ ] model_name is filled in (+5)
- [ ] version is filled in (+5)

## 2. Dataset & Input Schema — max 15 points
- [ ] dataset is filled in (+7)
- [ ] input_shape is filled in and not left as "Not specified" (+4)
- [ ] data_types has at least one entry (+4)

## 3. Evaluation Metrics — max 25 points
- [ ] 0 metrics = 0 pts · 1 metric = 10 pts · 2 metrics = 18 pts · 3+ metrics = 25 pts

## 4. Governance, Risks & Limitations — max 25 points
- [ ] limitations has at least one entry (+10)
- [ ] risks has at least one entry (+10)
- [ ] warnings has at least one entry (+5)

## 5. Testing & Reproducibility — max 25 points
- [ ] tests has at least one entry (+15)
- [ ] reproducibility is filled in with real detail — NOT a generic phrase
      like "Standard execution pipeline" or "Standard pipeline execution" (+10)

## Score bands
| Score | Meaning |
|---|---|
| 90–100 | Ready for release |
| 70–89 | Ready with reservations — human review required |
| 50–69 | Not ready — major gaps present |
| 0–49 | Not ready — critical information missing |

## Before marking anything "Ready"
- [ ] All 5 categories above are checked
- [ ] A human (not the AI) has reviewed and approved the decision
- [ ] No field contains an assumption — only submitted evidence
- [ ] If comparing two runs, confirm any metric marked "improved" was
      actually measured in both runs, not defaulted to 0 (see known
      quality finding in tool-rules.ts)
