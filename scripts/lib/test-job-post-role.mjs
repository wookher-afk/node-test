import {randomBytes} from 'node:crypto';
import {testDatabaseUrl} from './test-database.mjs';

// Disposable local DB only; no account/site mutation, worker identities,
// approval/contract payloads, payment data or direct audit-history writes.
export async function provisionJobPostRuntime(pool){
 const url=new URL(testDatabaseUrl()),role='node_job_runtime_'+randomBytes(8).toString('hex');
 const password=randomBytes(32).toString('hex'),quoted='"'+role+'"',client=await pool.connect();
 try{
  await client.query('BEGIN');
  const db=(await client.query('SELECT current_database() AS name')).rows[0].name;
  if(db!==decodeURIComponent(url.pathname.slice(1)))throw Error('Job post role requires the acknowledged local database');
  await client.query(`CREATE ROLE ${quoted} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  await client.query(`GRANT CONNECT ON DATABASE "${db.replaceAll('"','""')}" TO ${quoted}`);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${quoted}`);
  await client.query(`GRANT SELECT(id,email,display_name) ON accounts TO ${quoted}`);
  await client.query(`GRANT SELECT(account_id,token_hash,expires_at) ON account_sessions TO ${quoted}`);
  await client.query(`GRANT SELECT(organization_id,account_id,role) ON organization_memberships TO ${quoted}`);
  await client.query(`CREATE POLICY "${role}_read" ON organization_memberships FOR SELECT TO ${quoted} USING(true)`);
  await client.query(`GRANT SELECT ON worksites,job_posts,job_lines,job_line_dates,job_post_versions,job_post_version_lines,job_post_version_dates TO ${quoted}`);
  await client.query(`GRANT SELECT(id) ON occupations TO ${quoted}`);
  await client.query(`GRANT SELECT(id,terms_id,status) ON matches TO ${quoted}`);
  await client.query(`GRANT SELECT(id,job_line_id) ON match_terms TO ${quoted}`);
  await client.query(`GRANT SELECT(terms_id,work_date) ON match_dates TO ${quoted}`);
  await client.query(`GRANT INSERT(worksite_id,visibility,created_by,created_at,updated_by,updated_at) ON job_posts TO ${quoted}`);
  await client.query(`GRANT INSERT(job_post_id,occupation_id,resource_mode,daily_pay_krw,allow_partial) ON job_lines TO ${quoted}`);
  await client.query(`GRANT INSERT(job_line_id,work_date,capacity) ON job_line_dates TO ${quoted}`);
  await client.query(`GRANT INSERT(job_post_id,version,organization_id,worksite_id,worksite_snapshot,visibility,recorded_by),UPDATE(sealed_at) ON job_post_versions TO ${quoted}`);
  await client.query(`GRANT INSERT ON job_post_version_lines,job_post_version_dates TO ${quoted}`);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 url.username=role;url.password=password;
 return {role,url:url.href,async dispose(){
  const c=await pool.connect();
  try{
   await c.query('BEGIN');await c.query(`DROP POLICY "${role}_read" ON organization_memberships`);
   await c.query(`DROP OWNED BY ${quoted}`);await c.query(`DROP ROLE ${quoted}`);await c.query('COMMIT');
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
 }};
}
