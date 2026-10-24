\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE
 w uuid; outsider uuid; mgr uuid; co uuid; s uuid; o uuid; p uuid; m uuid; d date := DATE '2030-07-02';
BEGIN
 INSERT INTO users DEFAULT VALUES RETURNING id INTO w;
 INSERT INTO users DEFAULT VALUES RETURNING id INTO outsider;
 INSERT INTO users DEFAULT VALUES RETURNING id INTO mgr;
 INSERT INTO companies(display_name) VALUES('Auth test') RETURNING id INTO co;
 INSERT INTO company_members VALUES(co,mgr,'active');
 INSERT INTO worker_profiles(user_id,display_name) VALUES(w,'worker');
 INSERT INTO occupations(code,name_ko) VALUES('auth-'||substr(w::text,1,8),'test') RETURNING id INTO o;
 INSERT INTO jobsites(company_id,name) VALUES(co,'site') RETURNING id INTO s;
 INSERT INTO job_positions(jobsite_id,occupation_id) VALUES(s,o) RETURNING id INTO p;
 INSERT INTO job_position_dates VALUES(p,d,1);
 INSERT INTO matches(position_id,worker_id) VALUES(p,w) RETURNING id INTO m;
 INSERT INTO match_dates VALUES(m,d);
 BEGIN
  PERFORM node_cancel_match(m,outsider,'unauthorized');
  RAISE EXCEPTION 'ASSERTION FAILED: outsider cancelled match';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'ASSERTION FAILED:%' THEN RAISE; END IF;
  IF SQLERRM NOT LIKE '%not authorized%' THEN RAISE; END IF;
 END;
 IF node_cancel_match(m,mgr,'company cancellation') <> 'cancelled' THEN
   RAISE EXCEPTION 'authorized cancellation failed';
 END IF;
 RAISE NOTICE 'PASS: cancellation access control';
END $$;
ROLLBACK;
