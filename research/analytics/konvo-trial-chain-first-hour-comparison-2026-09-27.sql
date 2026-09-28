-- Build 130 acquisition cohort, NOT all users who upgraded to build 130.
-- Set the shared public-launch variable only after App Store release.
WITH first_welcome AS (
    SELECT person_id, min(timestamp) AS started,
           argMin(toString(properties.build), timestamp) AS first_build
    FROM events
    WHERE timestamp >= toDateTime('2026-08-01 00:00:00') AND timestamp <= toDateTime('2026-09-28 04:55:00')
      AND event = 'onboarding_screen_viewed' AND properties.screen_id = 's1'
    GROUP BY person_id
), excluded AS (
    SELECT DISTINCT person_id
    FROM events
    WHERE timestamp >= toDateTime('2026-08-01 00:00:00') AND timestamp <= toDateTime('2026-09-28 04:55:00')
      AND (properties.is_test_build = true OR properties.onboarding_preview = true
        OR (timestamp >= toDateTime('2026-09-18 00:00:00')
            AND timestamp < toDateTime('2026-09-21 04:11:22')
            AND toInt(properties.build) BETWEEN 109 AND 116)
        -- Preserve the project's existing Apple-review traffic heuristic.
        OR (properties.build IS NOT NULL AND properties.$geoip_country_code = 'US'
            AND (properties.$geoip_city_name = 'Cupertino'
              OR empty(toString(coalesce(properties.$geoip_subdivision_1_code, ''))))))
), cohort AS (
SELECT person_id, started, first_build FROM first_welcome
WHERE ((started >= toDateTime('2026-09-01 07:00:00') AND started < toDateTime('2026-09-06 07:00:00') AND first_build IN ('100','101','102')) OR (started >= toDateTime('2026-09-27 14:22:15') AND started <= toDateTime('2026-09-28 03:55:00') AND first_build='130'))
AND person_id NOT IN (SELECT person_id FROM excluded)
), observed AS (
 SELECT person_id,event,timestamp,properties FROM events
 WHERE timestamp>=toDateTime('2026-09-01 07:00:00') AND timestamp<=toDateTime('2026-09-28 04:55:00')
 AND event IN ('login_succeeded','paywall_viewed','paywall_presented','onboarding_completed','purchase_result','rc_trial_started_event')
)
SELECT c.first_build, uniq(c.person_id) AS starters, uniqIf(c.person_id,e.event='login_succeeded' AND e.timestamp<c.started+INTERVAL 1 HOUR AND e.timestamp>=c.started) AS connected,
uniqIf(c.person_id,e.event='paywall_viewed' AND e.timestamp<c.started+INTERVAL 1 HOUR AND e.timestamp>=c.started) AS wall_requested,
uniqIf(c.person_id,((e.event='onboarding_completed' AND e.properties.screen_id='s13_paywall') OR (e.event='purchase_result' AND e.properties.result='purchased')) AND e.timestamp<c.started+INTERVAL 1 HOUR AND e.timestamp>=c.started) AS accepted,
uniqIf(c.person_id,e.event='rc_trial_started_event' AND e.timestamp<c.started+INTERVAL 1 HOUR AND e.timestamp>=c.started) AS trial
FROM cohort c LEFT JOIN observed e ON e.person_id=c.person_id GROUP BY c.first_build ORDER BY c.first_build
