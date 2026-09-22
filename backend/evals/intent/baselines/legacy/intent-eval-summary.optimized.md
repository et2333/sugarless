# Intent Evaluation Summary

Generated from the existing `intent-eval-report.optimized.json`; no model calls were made.

## Headline Metrics

| Metric | Result |
| --- | ---: |
| Samples | 120 |
| End-to-end pass rate | 118/120 (98.33%) |
| Intent accuracy | 118/120 (98.33%) |
| Field-ready case rate | 54/56 (96.43%) |
| Emergency recall | 17/17 (100%) |

## Latency

| Average | P50 | P95 | P99 | Maximum | > 8s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 871.39 ms | 0 ms | 3170 ms | 3422 ms | 4503 ms | 0/120 (0%) |

## Per-intent Metrics

| Intent | Support | Predicted | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| create_reminder | 30 | 29 | 100% | 96.67% | 98.31% |
| emergency_alert | 17 | 17 | 100% | 100% | 100% |
| general_advice | 34 | 36 | 94.44% | 100% | 97.14% |
| generate_meal_plan | 12 | 12 | 100% | 100% | 100% |
| record_glucose | 27 | 26 | 100% | 96.3% | 98.11% |

## Failure Taxonomy

| Failure type | Count |
| --- | ---: |
| Intent mismatch | 2 |
| Field validation | 0 |
| Execution error | 0 |

Failed cases: `glucose-21`, `reminder-14`

> Field-ready rate covers only cases that declare `expectedFields` in the test set. It uses the original case-level validation outcome; the stored report does not contain enough detail to calculate a per-field micro-average without rerunning evaluation.
