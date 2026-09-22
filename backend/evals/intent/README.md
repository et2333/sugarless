# Intent evaluation

This directory separates model evaluation from deterministic automated tests.

## Layout

- `datasets/`: versioned inputs and manifests. Holdout datasets are immutable after their first scored run.
- `builders/`: dataset generation scripts. They must not invoke routing or a model while constructing a holdout.
- `runners/`: evaluators and report summarizers.
- `baselines/`: selected, versioned reports used for documented comparisons.
- `results/`: generated local runs. This directory is ignored by Git.

## Commands

Run these commands from `backend/`:

```bash
npm run test:intent
npm run test:typecheck
npm run eval:typecheck
npm run eval:intent:history
npm run eval:intent:holdout:v2:postfix
npm run eval:intent:holdout:v3
```

The history suite is a regression set. The v2 and v3 suites are frozen holdouts;
do not tune the implementation on a holdout and then present a rerun as an
independent first-pass result.
