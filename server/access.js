import {createHash} from 'node:crypto';

export const digest=value=>createHash('sha256').update(value).digest('hex');

// All protected routes use the same session check and HTTP 401 response.
// Caller-supplied account IDs, organization IDs and roles are not identity.
export async function requireSession(pool,req){
 const token=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'')?.[1];
 if(token){
  const {rows}=await pool.query('SELECT a.id,a.email,a.display_name FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()',[digest(token)]);
  if(rows[0])return rows[0];
 }
 throw Object.assign(new Error('로그인이 필요합니다.'),{status:401});
}

// This is only the signed-in account's own membership summary, for every
// existing membership role. It grants no management or transaction access.
export async function listOwnCompanies(pool,user){
 const {rows}=await pool.query('SELECT o.id,o.name,m.role FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.account_id=$1',[user.id]);
 return rows;
}
