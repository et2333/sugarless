# Intent Evaluation Summary

Generated from the existing `intent-eval-holdout-report.json`; no model calls were made.

## Headline Metrics

| Metric | Result |
| --- | ---: |
| Samples | 30 |
| End-to-end pass rate | 20/30 (66.67%) |
| Intent accuracy | 21/30 (70%) |
| Field-ready case rate | 11/16 (68.75%) |
| Emergency recall | 1/5 (20%) |

## Latency

| Average | P50 | P95 | P99 | Maximum | > 8s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1504.97 ms | 1614 ms | 3392 ms | 3469 ms | 3469 ms | 0/30 (0%) |

## Per-intent Metrics

| Intent | Support | Predicted | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| create_reminder | 6 | 4 | 100% | 66.67% | 80% |
| emergency_alert | 5 | 1 | 100% | 20% | 33.33% |
| general_advice | 9 | 12 | 66.67% | 88.89% | 76.19% |
| generate_meal_plan | 4 | 4 | 75% | 75% | 75% |
| record_glucose | 6 | 5 | 100% | 83.33% | 90.91% |

## Failure Taxonomy

| Failure type | Count |
| --- | ---: |
| Intent mismatch | 9 |
| Field validation | 1 |
| Execution error | 0 |

Failed cases: `holdout-glucose-01`, `holdout-glucose-04`, `holdout-reminder-04`, `holdout-reminder-06`, `holdout-meal-02`, `holdout-emergency-01`, `holdout-emergency-02`, `holdout-emergency-04`, `holdout-emergency-05`, `holdout-negative-04`

> Field-ready rate covers only cases that declare `expectedFields` in the test set. It uses the original case-level validation outcome; the stored report does not contain enough detail to calculate a per-field micro-average without rerunning evaluation.
