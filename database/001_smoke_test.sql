\set ON_ERROR_STOP on
BEGIN;
INSERT INTO accounts DEFAULT VALUES;
INSERT INTO accounts DEFAULT VALUES;
INSERT INTO organizations(name) VALUES('가상 시공사');
INSERT INTO occupation_categories(name) VALUES('토목');
INSERT INTO occupations(category_id,name) VALUES(1,'배관공');
INSERT INTO worksites(organization_id,name) VALUES(1,'가상 현장');
INSERT INTO job_posts(worksite_id) VALUES(1);
INSERT INTO job_lines(job_post_id,occupation_id,resource_mode,daily_pay_krw) VALUES(1,1,'worker',250000);
INSERT INTO job_line_dates(job_line_id,work_date,capacity) VALUES(1,'2026-11-01',1);
INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash) VALUES(1,1,1,'{"date":"2026-11-01"}','v1');
INSERT INTO match_dates(terms_id,work_date) VALUES(1,'2026-11-01');
INSERT INTO matches(terms_id) VALUES(1);
DO $$ BEGIN
 BEGIN UPDATE matches SET status='confirmed' WHERE id=1; RAISE EXCEPTION 'approval guard failed'; EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='approval guard failed' THEN RAISE; END IF;
 END;
END $$;
INSERT INTO match_approvals(terms_id,party,approved_by) VALUES(1,'worker',1),(1,'company',2);
UPDATE matches SET status='confirmed' WHERE id=1;
INSERT INTO resource_reservations(match_id,account_id,period) VALUES(1,1,tstzrange('2026-11-01 08:00+09','2026-11-01 17:00+09','[)'));
DO $$ BEGIN
 BEGIN INSERT INTO resource_reservations(account_id,period) VALUES(1,tstzrange('2026-11-01 12:00+09','2026-11-01 18:00+09','[)')); RAISE EXCEPTION 'overlap guard failed'; EXCEPTION WHEN exclusion_violation THEN NULL; END;
END $$;
INSERT INTO completion_confirmations(match_id,party,confirmed_by) VALUES(1,'worker',1),(1,'company',2);
INSERT INTO payment_obligations(match_id,amount_krw) VALUES(1,250000);
INSERT INTO payment_claims(obligation_id,amount_krw) VALUES(1,250000);
INSERT INTO receipt_confirmations(claim_id,confirmed_by) VALUES(1,1);
DO $$ BEGIN
 IF (SELECT count(*) FROM match_approvals WHERE terms_id=1)<>2 THEN RAISE EXCEPTION 'approval count'; END IF;
 IF (SELECT count(*) FROM receipt_confirmations)<>1 THEN RAISE EXCEPTION 'receipt count'; END IF;
END $$;
-- A second worker cannot take the already-filled date.
INSERT INTO accounts DEFAULT VALUES;
INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash)
VALUES(1,3,1,'{"date":"2026-11-01"}','v1-other');
INSERT INTO match_dates(terms_id,work_date) VALUES(2,'2026-11-01');
INSERT INTO matches(terms_id) VALUES(2);
INSERT INTO match_approvals(terms_id,party,approved_by) VALUES(2,'worker',3),(2,'company',2);
DO $ BEGIN
 BEGIN
   UPDATE matches SET status='confirmed' WHERE id=2;
   RAISE EXCEPTION 'capacity guard failed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='capacity guard failed' THEN RAISE; END IF;
   IF SQLERRM NOT LIKE 'Job capacity exceeded%' THEN RAISE; END IF;
 END;
END $;
-- An older terms version cannot be confirmed after renegotiation.
INSERT INTO match_terms(job_line_id,worker_id,version,terms,terms_hash)
VALUES(1,3,2,'{"date":"2026-11-01","pay":260000}','v2-other');
DO $ BEGIN
 BEGIN
   UPDATE matches SET status='confirmed' WHERE id=2;
   RAISE EXCEPTION 'version guard failed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='version guard failed' THEN RAISE; END IF;
   IF SQLERRM NOT LIKE 'Outdated terms version%' THEN RAISE; END IF;
 END;
END $;
-- Confirmed contracts cannot be edited or have approvals silently removed.
DO $ BEGIN
 BEGIN
   UPDATE match_terms SET terms='{"pay":1}' WHERE id=1;
   RAISE EXCEPTION 'terms immutability guard failed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='terms immutability guard failed' THEN RAISE; END IF;
   IF SQLERRM NOT LIKE 'Confirmed terms are immutable%' THEN RAISE; END IF;
 END;
 BEGIN
   DELETE FROM match_approvals WHERE terms_id=1 AND party='worker';
   RAISE EXCEPTION 'approval immutability guard failed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='approval immutability guard failed' THEN RAISE; END IF;
   IF SQLERRM NOT LIKE 'Confirmed match details are immutable%' THEN RAISE; END IF;
 END;
 BEGIN
   DELETE FROM match_dates WHERE terms_id=1;
   RAISE EXCEPTION 'date immutability guard failed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='date immutability guard failed' THEN RAISE; END IF;
   IF SQLERRM NOT LIKE 'Confirmed match details are immutable%' THEN RAISE; END IF;
 END;
END $;
-- Reassigning a date or approval from a confirmed match is also forbidden.
DO $ BEGIN
 BEGIN
   UPDATE match_dates SET terms_id=2 WHERE terms_id=1;
   RAISE EXCEPTION 'date reassignment guard failed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='date reassignment guard failed' THEN RAISE; END IF;
   IF SQLERRM NOT LIKE 'Confirmed match details are immutable%' THEN RAISE; END IF;
 END;
 BEGIN
   UPDATE match_approvals SET terms_id=2 WHERE terms_id=1 AND party='worker';
   RAISE EXCEPTION 'approval reassignment guard failed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='approval reassignment guard failed' THEN RAISE; END IF;
   IF SQLERRM NOT LIKE 'Confirmed match details are immutable%' THEN RAISE; END IF;
 END;
END $;
ROLLBACK;
SELECT 'DB-BASE-01 smoke tests passed' AS result;
