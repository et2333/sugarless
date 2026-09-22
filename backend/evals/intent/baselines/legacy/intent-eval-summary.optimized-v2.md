# Intent Evaluation Summary

Generated from the existing `intent-eval-report.optimized-v2.json`; no model calls were made.

## Headline Metrics

| Metric | Result |
| --- | ---: |
| Samples | 120 |
| End-to-end pass rate | 120/120 (100%) |
| Intent accuracy | 120/120 (100%) |
| Field-ready case rate | 56/56 (100%) |
| Emergency recall | 17/17 (100%) |

## Latency

| Average | P50 | P95 | P99 | Maximum | > 8s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 812.71 ms | 1 ms | 3253 ms | 3523 ms | 4124 ms | 0/120 (0%) |

## Per-intent Metrics

| Intent | Support | Predicted | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| create_reminder | 30 | 30 | 100% | 100% | 100% |
| emergency_alert | 17 | 17 | 100% | 100% | 100% |
| general_advice | 34 | 34 | 100% | 100% | 100% |
| generate_meal_plan | 12 | 12 | 100% | 100% | 100% |
| record_glucose | 27 | 27 | 100% | 100% | 100% |

## Failure Taxonomy

| Failure type | Count |
| --- | ---: |
| Intent mismatch | 0 |
| Field validation | 0 |
| Execution error | 0 |

Failed cases: 

> Field-ready rate covers only cases that declare `expectedFields` in the test set. It uses the original case-level validation outcome; the stored report does not contain enough detail to calculate a per-field micro-average without rerunning evaluation.
