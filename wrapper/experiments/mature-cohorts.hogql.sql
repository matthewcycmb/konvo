-- Noncanonical experiment decision report. Set age_days to 35 or 60.
-- RevenueCat integration revenue is USD. Gross vs proceeds basis is UNVERIFIED;
-- do not multiply by an assumed store fee or call this net proceeds.
-- Uses only mature first-exposure cohorts and deduplicated RC webhook events.
WITH
    35 AS age_days,
    exposures AS (
        SELECT person_id,
            min(timestamp) AS exposed_at,
            argMin(properties.$feature_flag_response, timestamp) AS variant,
            uniqExact(properties.$feature_flag_response) AS variants_seen
        FROM events
        WHERE event = '$experiment_exposure'
          AND timestamp >= toDateTime('2026-09-19 00:00:00')
          AND properties.$feature_flag = 'konvo-onboarding-annual-v1'
          AND properties.is_test_build = false
        GROUP BY person_id
        HAVING variants_seen = 1
           AND exposed_at <= now() - toIntervalDay(age_days)
    ),
    revenue_events AS (
        SELECT person_id,
            coalesce(nullIf(toString(properties.insert_id), ''), toString(uuid)) AS rc_event_id,
            argMax(timestamp, timestamp) AS occurred_at,
            argMax(toFloatOrZero(properties.revenue), timestamp) AS usd
        FROM events
        WHERE timestamp >= toDateTime('2026-09-19 00:00:00')
          AND startsWith(event, 'rc_')
          AND properties.store = 'APP_STORE'
          AND properties.revenue IS NOT NULL
        GROUP BY person_id, rc_event_id
    ),
    per_person AS (
        SELECT e.person_id, e.variant, e.exposed_at,
            sumIf(r.usd, r.occurred_at >= e.exposed_at AND r.occurred_at < e.exposed_at + toIntervalDay(age_days)) AS rc_usd,
            countIf(r.usd > 0 AND r.occurred_at >= e.exposed_at AND r.occurred_at < e.exposed_at + toIntervalDay(age_days)) AS payments,
            countIf(r.usd < 0 AND r.occurred_at >= e.exposed_at AND r.occurred_at < e.exposed_at + toIntervalDay(age_days)) AS refund_signals
        FROM exposures e
        LEFT JOIN revenue_events r ON e.person_id = r.person_id
        GROUP BY e.person_id, e.variant, e.exposed_at
    ),
    paywall_reach AS (
        SELECT e.person_id,
            countIf(p.timestamp >= e.exposed_at AND p.timestamp < e.exposed_at + toIntervalDay(age_days)) > 0 AS viewed
        FROM exposures e
        LEFT JOIN (
            SELECT person_id, timestamp FROM events
            WHERE event = 'paywall_viewed' AND timestamp >= toDateTime('2026-09-19 00:00:00')
        ) p ON e.person_id = p.person_id
        GROUP BY e.person_id
    )
SELECT p.variant, age_days AS cohort_age_days,
    count() AS mature_exposed_users,
    countIf(w.viewed) AS paywall_viewers,
    countIf(p.payments > 0) AS confirmed_payers,
    sum(p.refund_signals) AS refund_event_signals,
    round(sum(p.rc_usd), 2) AS rc_reported_usd,
    round(avg(p.rc_usd), 3) AS rc_usd_per_exposed_user,
    round(sumIf(p.rc_usd,w.viewed) / nullIf(countIf(w.viewed),0), 3) AS rc_usd_per_paywall_viewer
FROM per_person p
LEFT JOIN paywall_reach w ON p.person_id = w.person_id
GROUP BY p.variant
ORDER BY p.variant
