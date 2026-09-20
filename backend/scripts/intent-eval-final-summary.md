# Intent Evaluation Summary

Generated from the existing `intent-eval-final-report.json`; no model calls were made.

## Headline Metrics

| Metric | Result |
| --- | ---: |
| Samples | 20 |
| End-to-end pass rate | 15/20 (75%) |
| Intent accuracy | 15/20 (75%) |
| Field-ready case rate | 8/11 (72.73%) |
| Emergency recall | 2/3 (66.67%) |

## Latency

| Average | P50 | P95 | P99 | Maximum | > 8s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1729.9 ms | 1897 ms | 3092 ms | 3671 ms | 3671 ms | 0/20 (0%) |

## Per-intent Metrics

| Intent | Support | Predicted | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| create_reminder | 4 | 3 | 100% | 75% | 85.71% |
| emergency_alert | 3 | 2 | 100% | 66.67% | 80% |
| general_advice | 6 | 8 | 62.5% | 83.33% | 71.43% |
| generate_meal_plan | 3 | 4 | 75% | 100% | 85.71% |
| record_glucose | 4 | 2 | 100% | 50% | 66.67% |

## Failure Taxonomy

| Failure type | Count |
| --- | ---: |
| Intent mismatch | 5 |
| Field validation | 0 |
| Execution error | 0 |

Failed cases: `final-glucose-02`, `final-glucose-04`, `final-reminder-02`, `final-emergency-03`, `final-negative-02`

> Field-ready rate covers only cases that declare `expectedFields` in the test set. It uses the original case-level validation outcome; the stored report does not contain enough detail to calculate a per-field micro-average without rerunning evaluation.
