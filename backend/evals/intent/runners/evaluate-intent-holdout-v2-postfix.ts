/** Explicitly labelled rerun of the consumed v2 holdout for post-fix regression. */
process.env.EVAL_ALLOW_HOLDOUT_RERUN = 'true';
process.env.EVAL_HOLDOUT_REPORT_LABEL = 'intent-holdout-v2-postfix';
process.env.EVAL_RUN_KIND = 'v2_postfix_regression';

void import('./evaluate-intent-holdout-v2');
