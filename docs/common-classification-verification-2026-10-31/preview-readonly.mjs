import {Pool} from 'pg';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const scope={window:{}};vm.runInNewContext(await readFile('ui/03-2/catalog.js','utf8'),scope);
const catalog=scope.window.NODE_CATALOG.items;
const tables=['worker_alpha_registrations','occupation_categories','occupations','regions','worksites','job_lines','job_line_dates','worker_profiles','worker_preference_versions','worker_preference_occupations','worker_preference_regions','hiring_condition_versions','equipment','equipment_options'];
try{
 await pool.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 console.log('REAL PostgreSQL; READ ONLY repeatable-read transaction');
 const out={database:(await pool.query('SELECT current_database() AS name, current_setting(\'server_version\') AS version')).rows[0],catalog:{count:catalog.length,uniqueIds:new Set(catalog.map(x=>x.id)).size,excavator:catalog.find(x=>x.id==='excavator')},tables:{}};
 for(const table of tables){const rows=(await pool.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY 1`)).rows;
 out.tables[table]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}
 out.columns=(await pool.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1) ORDER BY table_name,ordinal_position",[tables])).rows;
 const docs=(await pool.query('SELECT document FROM worker_alpha_registrations')).rows.map(x=>x.document);
 const records=docs.flatMap(x=>[...x.abilities,...x.ownedEquipment]);
 out.registrationAggregate={documents:docs.length,records:records.length,unknownKinds:records.filter(x=>!catalog.some(i=>i.id===x.kind)).length,parentMismatches:records.filter(x=>{const i=catalog.find(i=>i.id===x.kind);return i&&((x.major!==undefined&&x.major!==i.major)||(x.middle!==undefined&&x.middle!==i.middle));}).length,payUnits:[...new Set(docs.map(x=>x.preferences.payUnit))],missingYears:records.filter(x=>x.years==='').length};
 out.occupationAggregate=(await pool.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE name='굴착기')::int AS excavator_names FROM occupations")).rows[0];
 out.triggers=(await pool.query("SELECT event_object_table,trigger_name,action_statement FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table IN ('worker_alpha_registrations','job_lines') ORDER BY 1,2")).rows;
 console.log(JSON.stringify(out,null,2));
 await pool.query('ROLLBACK');
}finally{await pool.end();}
