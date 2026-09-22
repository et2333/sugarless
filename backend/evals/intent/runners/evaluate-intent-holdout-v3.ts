/** One-shot scorer entry point for the frozen v3 independent holdout. */
process.env.EVAL_HOLDOUT_DATASET_VERSION = 'intent-holdout-v3-300';
process.env.EVAL_HOLDOUT_DATASET_FILE = 'holdout-v3/cases.json';
process.env.EVAL_HOLDOUT_MANIFEST_FILE = 'holdout-v3/manifest.json';
process.env.EVAL_HOLDOUT_REPORT_LABEL = 'intent-holdout-v3-300';
process.env.EVAL_RUN_KIND = 'first_scored_run';

void import('./evaluate-intent-holdout-v2');
