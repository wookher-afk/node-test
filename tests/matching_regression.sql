\set ON_ERROR_STOP on
-- Run on a disposable PostgreSQL database after migrations.
BEGIN;
DO $$
DECLARE
  w uuid; c uuid; manager uuid; site uuid; occ uuid; p uuid; p2 uuid;
  m1 uuid; m2 uuid; m3 uuid; t1 uuid; t2 uuid; t3 uuid; d date := DATE '2030-06-10';
  failures integer := 0;
BEGIN
  INSERT INTO users DEFAULT VALUES RETURNING id INTO w;
  INSERT INTO users DEFAULT VALUES RETURNING id INTO manager;
  INSERT INTO companies(display_name) VALUES ('NODE test company') RETURNING id INTO c;
  INSERT INTO company_members(company_id,user_id,member_status) VALUES(c,manager,'active');
  INSERT INTO worker_profiles(user_id,display_name) VALUES(w,'test worker');
  INSERT INTO occupations(code,name_ko) VALUES('test-'||substr(w::text,1,8),'test occupation') RETURNING id INTO occ;
  INSERT INTO jobsites(company_id,name) VALUES(c,'test site') RETURNING id INTO site;
  INSERT INTO job_positions(jobsite_id,occupation_id) VALUES(site,occ) RETURNING id INTO p;
  INSERT INTO job_positions(jobsite_id,occupation_id) VALUES(site,occ) RETURNING id INTO p2;
  INSERT INTO job_position_dates VALUES(p,d,1),(p2,d,1);
  INSERT INTO matches(position_id,worker_id) VALUES(p,w) RETURNING id INTO m1;
  INSERT INTO matches(position_id,worker_id) VALUES(p,w) RETURNING id INTO m2;
  INSERT INTO matches(position_id,worker_id) VALUES(p2,w) RETURNING id INTO m3;
  INSERT INTO match_dates VALUES(m1,d),(m2,d),(m3,d);
  INSERT INTO match_terms(match_id,version,terms_json) VALUES(m1,1,'{"rate":200000}') RETURNING id INTO t1;
  INSERT INTO match_terms(match_id,version,terms_json) VALUES(m2,1,'{"rate":200000}') RETURNING id INTO t2;
  INSERT INTO match_terms(match_id,version,terms_json) VALUES(m3,1,'{"rate":200000}') RETURNING id INTO t3;

  -- One approval is not enough.
  PERFORM node_approve_match(m1,t1,'worker',w);
  BEGIN
    PERFORM node_confirm_match(m1);
    RAISE EXCEPTION 'ASSERTION FAILED: single approval confirmed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'ASSERTION FAILED:%' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%both parties%' THEN RAISE; END IF;
  END;
  PERFORM node_approve_match(m1,t1,'company',manager);
  IF node_confirm_match(m1) <> 'confirmed' THEN RAISE EXCEPTION 'confirmation failed'; END IF;

  -- Quota 1: second match cannot confirm.
  PERFORM node_approve_match(m2,t2,'worker',w);
  PERFORM node_approve_match(m2,t2,'company',manager);
  BEGIN
    PERFORM node_confirm_match(m2);
    RAISE EXCEPTION 'ASSERTION FAILED: overbooking accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'ASSERTION FAILED:%' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%capacity full%' THEN RAISE; END IF;
  END;

  -- Another position, same worker/date: cannot confirm.
  PERFORM node_approve_match(m3,t3,'worker',w);
  PERFORM node_approve_match(m3,t3,'company',manager);
  BEGIN
    PERFORM node_confirm_match(m3);
    RAISE EXCEPTION 'ASSERTION FAILED: worker double-booked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'ASSERTION FAILED:%' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%already booked%' THEN RAISE; END IF;
  END;

  -- Cancel releases the slot.
  PERFORM node_cancel_match(m1,w,'test cancellation');
  IF (SELECT status FROM matches WHERE id=m1) <> 'cancelled' THEN RAISE EXCEPTION 'cancellation failed'; END IF;
  IF node_confirm_match(m2) <> 'confirmed' THEN RAISE EXCEPTION 'quota not released'; END IF;

  -- Old approvals cannot confirm changed terms.
  INSERT INTO match_terms(match_id,version,terms_json) VALUES(m3,2,'{"rate":250000}');
  BEGIN
    PERFORM node_confirm_match(m3);
    RAISE EXCEPTION 'ASSERTION FAILED: stale approvals accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'ASSERTION FAILED:%' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%both parties%' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS: bilateral approval, quota, date collision, cancellation, terms version';
END $$;
ROLLBACK;
