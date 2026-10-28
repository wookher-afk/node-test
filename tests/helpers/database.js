import {Pool} from 'pg';
import {testDatabaseUrl} from '../../scripts/lib/test-database.mjs';
export {testDatabaseUrl,runtimeDatabaseUrl} from '../../scripts/lib/test-database.mjs';
export const pool=new Pool({connectionString:testDatabaseUrl(),max:8});
export async function one(sql,values=[]) {return (await pool.query(sql,values)).rows[0];}
