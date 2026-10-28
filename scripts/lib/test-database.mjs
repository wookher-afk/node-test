// Provisioning and destructive tests are limited to an acknowledged local DB.
export function testDatabaseUrl(env=process.env) {
 const url=new URL(env.DATABASE_URL || 'http://missing');
 if(env.NODE_TEST_DATABASE!=='1' || !['postgres:','postgresql:'].includes(url.protocol)
   || !['localhost','127.0.0.1','[::1]','node-test-postgres'].includes(url.hostname)
   || !/^\/node_test(?:_|$)/.test(url.pathname)) {
   throw Error('Tests require NODE_TEST_DATABASE=1 and a local disposable node_test database');
 }
 return url.href;
}
export function runtimeDatabaseUrl() {
 const admin=new URL(testDatabaseUrl());
 const runtime=new URL(testDatabaseUrl({...process.env,DATABASE_URL:process.env.TEST_RUNTIME_DATABASE_URL}));
 if(runtime.hostname!==admin.hostname || runtime.port!==admin.port || runtime.pathname!==admin.pathname
   || runtime.search!==admin.search || !/^node_auth_runtime_[a-f0-9]{16}$/.test(runtime.username)) {
   throw Error('HTTP tests require a separate provisioned runtime role on the same local test database');
 }
 return runtime.href;
}
