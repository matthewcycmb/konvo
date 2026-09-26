# Empty onboarding experiment: diagnosis and local fix

Read-only audit on September 21, 2026. The experiment and dashboard are live:

- Experiment: https://us.posthog.com/project/569146/experiments/465606
- Personalized dashboard: https://us.posthog.com/project/569146/dashboard/2117718
- PostHog flag response contract: https://posthog.com/docs/api/flags

App Store Connect reports 1.7.0 (116) Ready for Sale / Ready for Distribution.
PostHog experiment 465606 is running from 2026-09-21T04:13:48.071452Z,
with active flag `konvo-onboarding-annual-v1` and a 50/50 control/test split.

## Observed events

Queries bounded from the experiment start through the audit returned:

| Build | Onboarding events | Distinct people | Experiment variant | Test / preview |
| --- | ---: | ---: | --- | --- |
| 116 | 103 | 8 | null | false / false |
| 120 | 54 | 1 | test | true / true |
| 108 | 255 | 21 | null | absent / absent |

These are raw build-level counts before applying project test-account or known
prerelease-person exclusions, not participant counts. There were no
`$experiment_exposure`, `experiment_exposed`, or `experiment_ineligible` events
since launch. Preview traffic is correctly excluded from production results.

## Cause

A read-only flag evaluation with the same eligibility/schema properties as the
app returned HTTP 200, `errorsWhileComputingFlags: false`, and an enabled
`flags["konvo-onboarding-annual-v1"]` object with a `variant` string. It did not
return `featureFlags`.

Native `resolveExperiment` called `/flags/?v=2` but read legacy
`featureFlags[key]`. That guard returned the unenrolled original-flow fallback
before RevenueCat offering validation. The fallback is persisted, and the
previous guard emitted no diagnostic. The preview feature bypasses flag
evaluation, explaining why owner QA showed the personalized flow while public
build events lacked experiment assignments.

## Local correction and validation

`KonvoStore.swift` now reads `flags[key].enabled` and `flags[key].variant`,
accepts only enabled `control` / `test`, and records
`experiment_ineligible` with reason `flag_unavailable` for rejected responses.
Both RevenueCat offering checks, exposure behavior, preview exclusions, and
persisted assignments are unchanged. Existing fallback users are not relabeled
or reassigned; future fresh eligible installs can enroll after a release.

`node wrapper/test/test_experiment_flags.js` compiles and executes the actual
Swift guard offline. The original code failed on a valid v2 control response.
After the fix, both arms and ten rejection cases pass. A thirteenth case using
the captured live v2 response also passed. Bridge contract and experiment view
regressions passed, as did `git diff --check`. No synthetic exposure or purchase
events were sent. This validates parsing, not end-to-end enrollment on an iPhone.

## Deployment status

Source fix only: no new archive, upload, review submission, release, live flag,
experiment, or dashboard change was made during this audit. Existing build 121
and earlier IPA files predate this correction. A new production build and release
are required. Confirm genuine fresh-install exposure and page events after that
release before treating the A/B test as operational. Do not backfill unassigned
traffic or remove QA exclusions to populate the dashboards.

Current source contains the newer weekly/special-offer treatment, whereas build
116 contains the annual-only treatment. Preserve `onboarding_version` reporting
and review the experiment description/metrics for the actual treatment shipped
when preparing the next production release.

Subsequent authorized upload: production 1.8.0 (122) was built from the current
source, verified, and uploaded successfully. Its receipt and processing status
are recorded in `build122.json`. The upload has not been submitted for review or
released, so the fix is not yet live for App Store customers.
