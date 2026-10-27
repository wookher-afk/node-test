import {randomBytes} from 'node:crypto';
import {testDatabaseUrl} from './test-database.mjs';

// This is NOT a migration or production role installer. Never imported by server/.
// All roles/passwords are temporary, generated internally and never printed.
export async function provisionTestRuntime(pool) {
 const url=new URL(testDatabaseUrl());
 const role='node_auth_runtime_'+randomBytes(8).toString('hex');
 const password=randomBytes(32).toString('hex');
 const quotedRole='"'+role+'"'; // Both identifiers and password are generated hex.
 const policies=[['account_roles',role+'_read'],['account_roles',role+'_insert'],
   ['organization_memberships',role+'_read'],['organization_memberships',role+'_insert']];
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const db=(await client.query('SELECT current_database() AS name')).rows[0].name;
  if(db!==decodeURIComponent(url.pathname.slice(1)))throw Error('Provisioning database does not match the acknowledged local test URL');
  const configured=await client.query("SELECT 1 FROM pg_class WHERE oid IN ('account_roles'::regclass,'organization_memberships'::regclass) AND (relrowsecurity OR relforcerowsecurity) UNION ALL SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename IN ('account_roles','organization_memberships')");
  if(configured.rowCount)throw Error('Runtime provisioning requires an isolated schema without existing onboarding policies');
  await client.query(`CREATE ROLE ${quotedRole} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  const quotedDb='"'+db.replaceAll('"','""')+'"';
  // PUBLIC TEMP would otherwise let the role create shadow tables. These ACL
  // changes are deliberately confined to this disposable development database.
  await client.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${quotedDb} FROM PUBLIC`);
  await client.query(`GRANT CONNECT ON DATABASE ${quotedDb} TO ${quotedRole}`);
  await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await client.query(`GRANT USAGE ON SCHEMA public TO ${quotedRole}`);
  await client.query(`GRANT SELECT(id,email,password_hash,display_name), INSERT(email,password_hash,display_name) ON accounts TO ${quotedRole}`);
  await client.query(`GRANT SELECT(account_id,role), INSERT(account_id,role) ON account_roles TO ${quotedRole}`);
  await client.query(`GRANT SELECT(account_id,experience_months), INSERT(account_id,experience_months), UPDATE(experience_months) ON worker_profiles TO ${quotedRole}`);
  await client.query(`GRANT SELECT(id,name), INSERT(name) ON organizations TO ${quotedRole}`);
  await client.query(`GRANT SELECT(organization_id,account_id,role), INSERT(organization_id,account_id,role) ON organization_memberships TO ${quotedRole}`);
  await client.query(`GRANT SELECT(account_id,token_hash,expires_at), INSERT(account_id,token_hash,expires_at), DELETE ON account_sessions TO ${quotedRole}`);
  // GENERATED ALWAYS AS IDENTITY inserts require table privileges, not direct
  // sequence USAGE. Do not grant nextval/currval access to the runtime.
  await client.query('ALTER TABLE account_roles ENABLE ROW LEVEL SECURITY');
  await client.query('ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY');
  await client.query(`CREATE POLICY "${role}_read" ON account_roles FOR SELECT TO ${quotedRole} USING(true)`);
  await client.query(`CREATE POLICY "${role}_insert" ON account_roles FOR INSERT TO ${quotedRole} WITH CHECK(role IN ('worker','company'))`);
  await client.query(`CREATE POLICY "${role}_read" ON organization_memberships FOR SELECT TO ${quotedRole} USING(true)`);
  await client.query(`CREATE POLICY "${role}_insert" ON organization_memberships FOR INSERT TO ${quotedRole} WITH CHECK(role='owner')`);
  await client.query('COMMIT');
 } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
 url.username=role;url.password=password;
 let removed=false;
 return {role,url:url.href,async dispose(){
  if(removed)return;
  const c=await pool.connect();
  try {
   await c.query('BEGIN');
   for(const [table,policy] of policies)await c.query(`DROP POLICY "${policy}" ON ${table}`);
   await c.query('ALTER TABLE account_roles DISABLE ROW LEVEL SECURITY');
   await c.query('ALTER TABLE organization_memberships DISABLE ROW LEVEL SECURITY');
   await c.query(`DROP OWNED BY ${quotedRole}`);
   await c.query(`DROP ROLE ${quotedRole}`);
   await c.query('COMMIT');removed=true;
  } catch(error){await c.query('ROLLBACK');throw error;} finally{c.release();}
 }};
}
