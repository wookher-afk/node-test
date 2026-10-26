import {Pool} from 'pg';
export function testDatabaseUrl() {
 const url=new URL(process.env.DATABASE_URL || 'http://missing');
 if(process.env.NODE_TEST_DATABASE!=='1' || !['postgres:','postgresql:'].includes(url.protocol)
   || !['localhost','127.0.0.1','[::1]','node-test-postgres'].includes(url.hostname)
   || !/^\/node_test(?:_|$)/.test(url.pathname)) {
   throw Error('Tests require NODE_TEST_DATABASE=1 and a local disposable node_test database');
 }
 return url.href;
}
export const pool=new Pool({connectionString:testDatabaseUrl(),max:8});
export async function one(sql,values=[]) {return (await pool.query(sql,values)).rows[0];}
