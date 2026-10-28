import {randomBytes} from 'node:crypto';
import {testDatabaseUrl} from './test-database.mjs';

// Local, disposable DB only. Separate from onboarding: no password hashes,
// account mutation, matching, payment, moderation or direct audit-write grants.
export async function provisionWorksiteRuntime(pool){
 const url=new URL(testDatabaseUrl()),role='node_site_runtime_'+randomBytes(8).toString('hex');
 const password=randomBytes(32).toString('hex'),quoted='"'+role+'"',client=await pool.connect();
 try{
  await client.query('BEGIN');
  const db=(await client.query('SELECT current_database() AS name')).rows[0].name;
  if(db!==decodeURIComponent(url.pathname.slice(1)))throw Error('Worksite role requires the acknowledged local database');
  await client.query(`CREATE ROLE ${quoted} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  await client.query(`GRANT CONNECT ON DATABASE "${db.replaceAll('"','""')}" TO ${quoted}`);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${quoted}`);
  await client.query(`GRANT SELECT(id,email,display_name) ON accounts TO ${quoted}`);
  await client.query(`GRANT SELECT(account_id,token_hash,expires_at) ON account_sessions TO ${quoted}`);
  await client.query(`GRANT SELECT(organization_id,account_id,role) ON organization_memberships TO ${quoted}`);
  // The onboarding launcher owns these temporary policies, and removes them.
  await client.query(`CREATE POLICY "${role}_read" ON organization_memberships FOR SELECT TO ${quoted} USING(true)`);
  await client.query(`GRANT SELECT(id) ON regions TO ${quoted}`);
  await client.query(`GRANT SELECT ON worksites,worksite_assignments TO ${quoted}`);
  await client.query(`GRANT INSERT(organization_id,region_id,name,address,location_notes,description,created_by,created_at,updated_by,updated_at) ON worksites TO ${quoted}`);
  await client.query(`GRANT UPDATE(region_id,name,address,location_notes,description,is_active,version,updated_by,updated_at) ON worksites TO ${quoted}`);
  await client.query(`GRANT INSERT(worksite_id,organization_id,account_id,can_view,can_edit,can_deactivate,can_confirm_work,created_by,updated_by), UPDATE(organization_id,can_view,can_edit,can_deactivate,can_confirm_work,active,updated_by,updated_at) ON worksite_assignments TO ${quoted}`);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 url.username=role;url.password=password;
 return {role,url:url.href,async dispose(){
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   await c.query(`DROP POLICY "${role}_read" ON organization_memberships`);
   await c.query(`DROP OWNED BY ${quoted}`);
   await c.query(`DROP ROLE ${quoted}`);
   await c.query('COMMIT');
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
 }};
}
