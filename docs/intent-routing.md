# Intent Routing

The AI chat endpoint uses a safety-first hybrid router:

1. Normalize punctuation, units, numbers, and time expressions.
2. Assess emergency risk independently from the requested business action.
3. Route high-confidence action requests through deterministic rules.
4. Send unmatched or ambiguous language to Gemini for semantic classification.
5. Validate structured intent output and action slots with Zod.
6. Ask a follow-up question when a required slot or confirmation is missing.
7. Execute the validated action and return the actual execution result.

Emergency risk always overrides business execution. A message may contain both a
recording request and a critical glucose value; the response will prioritize the
emergency guidance and will not silently execute the lower-priority action.

## Routing thresholds

- Rule confidence `>= 0.90`: execute after slot validation.
- Missing required slots: store pending state and ask a targeted question.
- Lower-confidence or unmatched input: use Gemini structured JSON classification.
- Gemini action confidence `< 0.75`: require explicit confirmation.

Pending intent state currently uses an in-memory store with a ten-minute TTL. It
is suitable for the single-instance MVP. Use Redis or another shared TTL store
before running multiple backend replicas.

## Supported executable intents

- `record_glucose`
- `create_reminder`
- `generate_meal_plan`

Knowledge questions return `general_advice`. Modify and cancel requests are
recognized but require a concrete target; they are never reinterpreted as create
operations. A pending action can be cancelled directly.

## Evaluation

Run the deterministic regression and orchestration suites:

```bash
npm run test:intent-router
npm run test:intent-orchestrator
```

Run the versioned evaluation set:

```bash
npm run eval:intent:frozen
```

Replay all 170 previously used cases and persist a timestamped, traceable report:

```bash
npm run eval:intent:history
```

Reports are written to `backend/evals/intent/results/intent-history-v1/`. Each JSON
report records fixture hashes, the Git revision and dirty state, per-case outcomes,
routing source, clarification state, latency, Gemini calls, repair calls, and API-
reported input/output/total tokens. Generated results stay local; selected comparison
points are promoted to `backend/evals/intent/baselines/` for version control.
The report keeps intent accuracy separate from field readiness and action readiness;
the stricter overall regression pass requires all applicable checks to pass. Gemini's
API-reported total may include tokens outside the SDK's input/output counters, so the
difference is retained as `otherApiReportedTokens` rather than silently discarded.
Failure diagnostics separate intent mismatches, clarification-blocked actions, and
field mismatches with a ready action. Treat them as review queues: a historical
fixture can conflict with a newer safety policy, so failed cases must be adjudicated
before changing routing rules or labels.
The 170 examples have already been seen during development, so their results must
be described as historical regression performance rather than holdout accuracy.

The frozen v2 holdout contains 300 newly authored, class-balanced examples (60 per
intent, with 30 Chinese and 30 English examples in every class). Action cases label
whether the expected behavior is execution or clarification, so a safety-preserving
follow-up is not counted as an intent failure. Build and validate the dataset without
running inference:

```bash
npm run eval:intent:holdout:v2:build
```

Do not inspect failures and tune rules against this set before the first scored run.
After that run, the manifest changes from `frozen_unscored` to
`scored_first_run_complete` and records the report, implementation, and scorer hashes.
The scorer understands `execute`, `clarify`, `respond`, and `emergency` as distinct
expected outcomes. It verifies the frozen dataset hash before inference, records an
implementation source hash when the Git worktree is dirty, and blocks accidental
second runs unless `EVAL_ALLOW_HOLDOUT_RERUN=true` is deliberately set:

```bash
npm run eval:intent:holdout:v2
```

The report includes intent accuracy, macro-F1, slot readiness, emergency recall,
emergency false-positive rate, latency, and per-intent results. The included set
is a compact engineering regression set, not evidence of production accuracy.
For a publishable generalization result, evaluate once on a separately authored,
unseen, class-balanced set of at least 300 examples and keep it out of rule tuning.

## Voice input metrics

Voice is an input channel rather than a model-development focus. Keep the API
comparison dashboard limited to:

- transcription success rate and P95 latency;
- Chinese CER / English WER on a small labelled audio set;
- exact-match accuracy for medication, glucose value/unit, and reminder time;
- end-to-end voice intent/action accuracy, with emergency recall as a safety slice;
- provider cost per processed audio minute.

In production, user repetition or text correction rate can serve as a lightweight
proxy when reference transcripts are unavailable. Correlate transcription and
intent events with an anonymous trace ID; do not log raw audio or full health text
by default.

The global i18n language is the single source of truth for voice behavior:

- `zh` uses browser recognition/synthesis locale `zh-CN` and backend ASR language `zh`;
- `en` uses browser recognition/synthesis locale `en-US` and backend ASR language `en`.

No separate voice-language selector is required. Backend transcription reads the
existing `Accept-Language` header. Setting `VOICE_AUTO_LANGUAGE_FALLBACK=true`
enables an optional AssemblyAI automatic-language retry only after fixed-language
transcription fails; it is disabled by default to avoid extra latency and cost.
The current web voice button uses the browser Web Speech API and therefore follows
the selected UI language directly; this backend retry applies only to audio sent to
the AssemblyAI transcription endpoint.
