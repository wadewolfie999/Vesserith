// Isolated developer-only PostgreSQL fixture. Not imported by the application build.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import { createServer } from 'node:http';
const db=new PGlite();
await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; insert into auth.users values('00000000-0000-4000-8000-000000000001');");
for(const file of readdirSync('supabase/migrations').sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);set role authenticated;");
const allowed={bootstrap:['select public.vesserith_bootstrap() s',()=>[]],read:['select public.vesserith_read($1::jsonb) s',p=>[JSON.stringify(p.known)]],mutate:['select public.vesserith_mutate($1,$2,$3,$4::jsonb) s',p=>[p.requestId,p.kind,p.expected,JSON.stringify(p.payload)]],preview:['select public.vesserith_preview_import($1::jsonb) s',p=>[JSON.stringify(p)]],commit:['select public.vesserith_commit_import($1,$2::jsonb,$3) s',p=>[p.id,JSON.stringify(p.choices),p.requestId]]};
const server=createServer(async(req,res)=>{
  if(req.headers.host!=='127.0.0.1:4181'||req.headers.origin!=='http://127.0.0.1:4180'){res.writeHead(403);res.end();return;}
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:4180');res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const operation=allowed[req.url?.slice(1)];if(req.method!=='POST'||!operation){res.writeHead(404);res.end();return;}
  try{let data='';for await(const part of req){data+=part;if(data.length>60000000)throw new Error('Too large');}const payload=JSON.parse(data),batch=req.url==='/mutate'&&payload.kind==='mastery_batch';const args=batch?[payload.requestId,JSON.stringify(payload.payload)]:operation[1](payload);const result=await db.query(batch?'select public.vesserith_mastery_batch($1,$2::jsonb) s':operation[0],args);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result.rows[0].s));}
  catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
});
server.listen(4181,'127.0.0.1',()=>console.log('Isolated test database on 127.0.0.1:4181. No real learner data.'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await db.close();process.exit(0);}));
