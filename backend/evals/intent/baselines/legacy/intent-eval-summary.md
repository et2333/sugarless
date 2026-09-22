# Intent Evaluation Summary

Generated from the existing `intent-eval-report.json`; no model calls were made.

## Headline Metrics

| Metric | Result |
| --- | ---: |
| Samples | 120 |
| End-to-end pass rate | 106/120 (88.33%) |
| Intent accuracy | 109/120 (90.83%) |
| Field-ready case rate | 44/56 (78.57%) |
| Emergency recall | 17/17 (100%) |

## Latency

| Average | P50 | P95 | P99 | Maximum | > 8s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 2454.21 ms | 2470 ms | 4116 ms | 4826 ms | 8956 ms | 1/120 (0.83%) |

## Per-intent Metrics

| Intent | Support | Predicted | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| create_reminder | 30 | 27 | 100% | 90% | 94.74% |
| emergency_alert | 17 | 17 | 100% | 100% | 100% |
| general_advice | 34 | 45 | 75.56% | 100% | 86.08% |
| generate_meal_plan | 12 | 10 | 100% | 83.33% | 90.91% |
| record_glucose | 27 | 21 | 100% | 77.78% | 87.5% |

## Failure Taxonomy

| Failure type | Count |
| --- | ---: |
| Intent mismatch | 11 |
| Field validation | 3 |
| Execution error | 0 |

Failed cases: `glucose-02`, `glucose-03`, `glucose-04`, `glucose-08`, `glucose-14`, `glucose-17`, `reminder-02`, `reminder-05`, `reminder-07`, `reminder-13`, `reminder-19`, `meal-06`, `meal-10`, `negative-05`

> Field-ready rate covers only cases that declare `expectedFields` in the test set. It uses the original case-level validation outcome; the stored report does not contain enough detail to calculate a per-field micro-average without rerunning evaluation.
