#!/usr/bin/env bash
set -euo pipefail
# Run against an EMPTY disposable DB after migrations 001-003.
# Two independent PostgreSQL sessions compete for one job/day slot.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
psql -X -v ON_ERROR_STOP=1 -At <<'SQL' > "$tmp/ids"
WITH
u AS (INSERT INTO users DEFAULT VALUES RETURNING id),
v AS (INSERT INTO users DEFAULT VALUES RETURNING id),
c AS (INSERT INTO companies(display_name) VALUES('race') RETURNING id),
o AS (INSERT INTO occupations(code,name_ko) VALUES('race-worker','test') RETURNING id),
s AS (INSERT INTO jobsites(company_id,name) SELECT id,'site' FROM c RETURNING id),
p AS (INSERT INTO job_positions(jobsite_id,occupation_id) SELECT s.id,o.id FROM s,o RETURNING id),
w1 AS (INSERT INTO worker_profiles(user_id,display_name) SELECT id,'one' FROM u RETURNING user_id),
w2 AS (INSERT INTO worker_profiles(user_id,display_name) SELECT id,'two' FROM v RETURNING user_id),
q AS (INSERT INTO job_position_dates(position_id,work_date,capacity) SELECT id,'2030-08-10',1 FROM p RETURNING position_id),
m1 AS (INSERT INTO matches(position_id,worker_id) SELECT p.id,w1.user_id FROM p,w1 RETURNING id,worker_id),
m2 AS (INSERT INTO matches(position_id,worker_id) SELECT p.id,w2.user_id FROM p,w2 RETURNING id,worker_id),
d1 AS (INSERT INTO match_dates(match_id,work_date) SELECT id,'2030-08-10' FROM m1 RETURNING match_id),
d2 AS (INSERT INTO match_dates(match_id,work_date) SELECT id,'2030-08-10' FROM m2 RETURNING match_id),
t1 AS (INSERT INTO match_terms(match_id,version,terms_json) SELECT id,1,'{}'::jsonb FROM m1 RETURNING id,match_id),
t2 AS (INSERT INTO match_terms(match_id,version,terms_json) SELECT id,1,'{}'::jsonb FROM m2 RETURNING id,match_id),
a1 AS (INSERT INTO match_approvals(match_terms_id,party_role,approved_by) SELECT t1.id,'worker',m1.worker_id FROM t1 JOIN m1 ON m1.id=t1.match_id RETURNING match_terms_id),
a2 AS (INSERT INTO match_approvals(match_terms_id,party_role,approved_by) SELECT t2.id,'worker',m2.worker_id FROM t2 JOIN m2 ON m2.id=t2.match_id RETURNING match_terms_id),
a3 AS (INSERT INTO match_approvals(match_terms_id,party_role,approved_by) SELECT t1.id,'company',u.id FROM t1,u RETURNING match_terms_id),
a4 AS (INSERT INTO match_approvals(match_terms_id,party_role,approved_by) SELECT t2.id,'company',u.id FROM t2,u RETURNING match_terms_id)
SELECT m1.id::text||' '||m2.id::text FROM m1,m2,q,d1,d2,a1,a2,a3,a4;
SQL
read -r m1 m2 < "$tmp/ids"
test -n "$m1" && test -n "$m2"
(psql -X -v ON_ERROR_STOP=1 -At -c "SELECT node_confirm_match('$m1'::uuid)" >"$tmp/one.out" 2>"$tmp/one.err"; echo $? >"$tmp/one.rc") &
p1=$!
(psql -X -v ON_ERROR_STOP=1 -At -c "SELECT node_confirm_match('$m2'::uuid)" >"$tmp/two.out" 2>"$tmp/two.err"; echo $? >"$tmp/two.rc") &
p2=$!
wait "$p1"; wait "$p2"
one=$(cat "$tmp/one.rc"); two=$(cat "$tmp/two.rc")
if ! { { [ "$one" -eq 0 ] && [ "$two" -ne 0 ]; } || { [ "$one" -ne 0 ] && [ "$two" -eq 0 ]; }; }; then
 echo "FAIL: expected one successful confirmation"; cat "$tmp/"*.err; exit 1
fi
confirmed=$(psql -X -v ON_ERROR_STOP=1 -At -c "SELECT count(*) FROM matches WHERE id IN ('$m1'::uuid,'$m2'::uuid) AND status='confirmed'")
test "$confirmed" = 1 || { echo "FAIL: confirmed=$confirmed"; exit 1; }
echo "PASS: exactly one concurrent match confirmed"
