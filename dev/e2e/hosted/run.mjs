import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {nativeSession,MODEL,EFFORT,REPO_ROOT} from '../lib/nativeSession.ts';

export const SERVER={name:'DatoCMSReleaseCheck',url:'https://mcp.datocms.com'};
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const hash=value=>createHash('sha256').update(value).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
import {prepareSource,schemaSource,uploadSource,seedSource,observationSource,cleanupSource} from './fixtures.mjs';
export const responseText=call=>(call.result?.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
export function exactScriptOutput(session,source,write,scope){
 const executions=session.mcpCalls.filter(c=>/upsert_and_execute_(safe|unsafe)_script$/.test(c.tool));
 assert.equal(executions.length,1,'A fixture step must execute its exact script once');
 const call=executions[0];
 assert.equal(call.tool,`upsert_and_execute_${write?'unsafe':'safe'}_script`);
 if(scope){
  assert.equal(call.arguments.site_id,scope.site,'Wrong fixture/oracle project');
  assert.equal(call.arguments.environment,scope.environment,'Wrong fixture/oracle environment');
 }
 assert.equal(call.arguments.body.mode,'full');
 assert.equal(call.arguments.body.content.trim(),source.trim(),'Fixture/oracle source must not be rewritten');
 assert.notEqual(call.arguments.no_execute,true);
 assert.equal(call.status,'completed');
 const text=responseText(call);
 assert.match(text,/# Script executed successfully/);
 const output=text.match(/## Output\s+```text\n([\s\S]*?)\n```/);
 assert.ok(output,'Missing actual script output');
 return JSON.parse(output[1]);
}
export function canonicalRecord(value){
 if(Array.isArray(value))return value.map(canonicalRecord);
 if(!value||typeof value!=='object')return value;
 const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,canonicalRecord(v)]));
 if(result.type==='span')result.marks??=[];
 if(result.type==='link'||result.type==='itemLink')result.meta??=[];
 if(result.meta&&result.type==='item'){
  delete result.meta.current_version;delete result.meta.updated_at;
 }
 return result;
}
export function assertOutcome(kind,before,after){
 const expected=structuredClone(before.current);
 if(kind==='simple')expected.title='Summer update';
 else {
  const english=expected.body.en;
  english.document.children[0].children[0].value='Welcome reader';
  english.document.children[1].item.attributes.caption='Summer portrait';
  english.document.children.push({type:'paragraph',children:[{type:'span',value:'See you soon.'}]});
 }
 assert.deepEqual(canonicalRecord(after.current),canonicalRecord(expected),'Requested edits or preservation differ');
 assert.equal(after.versions,before.versions+1,'Exactly one new parent version is required');
 assert.deepEqual(canonicalRecord(after.published),canonicalRecord(before.published),'Published content changed');
}

async function main(){
 const {values}=parseArgs({options:{site:{type:'string'},output:{type:'string'}}});
 if(!values.site||!values.output)throw Error('Use --site <authorized disposable site ID> --output <fresh local directory>');
 if(!/^\d+$/.test(values.site))throw Error('Site ID must be numeric');
 const site=values.site,output=resolve(values.output);
 if(existsSync(output))throw Error('Output exists; preserve evidence and choose a fresh directory');
 mkdirSync(output,{recursive:true});
 const environment=`e2e-hosted-${Date.now()}-${randomBytes(4).toString('hex')}`;
 const report={model:MODEL,reasoningEffort:EFFORT,endpoint:SERVER.url,environment,startedAt:new Date().toISOString(),cases:[],phases:[],cleanup:null};
 const save=()=>writeFileSync(join(output,'report.json'),json(report));save();
 async function run(name,prompt,instructions,source){
  const workspace=mkdtempSync(join(tmpdir(),'dato-hosted-e2e-'));
  if(source)writeFileSync(join(workspace,'operation.ts'),source);
  try {
   const result=await nativeSession({repoRoot:REPO_ROOT,workspace,output:join(output,name),hostedMcp:SERVER,timeoutMs:420000,maxCommands:35,maxMcpCalls:40,prompt,instructions});
   assert.equal(result.exitCode,0,`${name}: native exit`);assert.equal(result.completed,true,`${name}: incomplete turn`);
   assert.equal(result.timedOut,false);assert.equal(result.capped,false);assert.equal(result.credentialLeak,false);
   assert.deepEqual(result.errors,[]);
   for(const call of result.mcpCalls){
    assert.equal(call.server,SERVER.name,'Unexpected MCP route');
    if(call.arguments?.site_id)assert.equal(call.arguments.site_id,site,'Unexpected project');
   }
   return result;
  } finally {rmSync(workspace,{recursive:true,force:true});}
 }
 async function exact(name,source,{write=false,target=environment}={}){
  const prompt=`Use only the current hosted DatoCMS MCP for authorized fixture infrastructure, site ${site}, environment ${target}. Read operation.ts and execute that exact full TypeScript source once through the ${write?'unsafe':'safe'} script tool after obtaining every required method token. Do not alter its source or execute it locally. Use script://${name}-${environment}.ts. Do not make any other mutation. Return its actual output. This is a deterministic fixture/oracle step, not a skill-quality task.`;
  const result=await run(name,prompt,`Only the explicitly named disposable site and fixture operation are authorized. No CLI/direct HTTP fallback, account changes, roles, API tokens or billing. The exact script owns all permissible effects. If it fails, report that failure without rewriting or replaying it.`,source);
  const data=exactScriptOutput(result,source,write,{site,environment:target});
  report.phases.push({name,write,target,sourceSha256:hash(source),passed:true});save();console.log(`PASS fixture ${name}`);return data;
 }

 let attemptedFork=false;
 try {
  const prepare=prepareSource(site,environment);
  attemptedFork=true;
  const prepared=await exact('prepare',prepare,{write:true,target:'main'});assert.equal(prepared.environment,environment);report.baseline=prepared.baseline;save();
  const schema=await exact('schema',schemaSource(),{write:true});
  const uploaded=await exact('upload',uploadSource(),{write:true});
  const records=await exact('seed',seedSource(schema,uploaded),{write:true});
  const ids=records.records;
  assert.deepEqual(ids.map(x=>x.kind),['simple','localized','published']);report.records=ids;save();
  const observation=observationSource(ids);
  const before=await exact('before',observation);writeFileSync(join(output,'before.json'),json(before));
  for(const target of ids){
   const original=before.records.find(r=>r.kind===target.kind);
   const blockId=original.current.body.en.document.children[1].item.id;
   const task=target.kind==='simple'?`Change its title to "Summer update". Leave every other field unchanged. Do not publish.`:`Make three edits to its English Structured Text: change the existing greeting span "Hello reader" to "Welcome reader", change the caption of existing image block ${blockId} to "Summer portrait", and append a final paragraph containing "See you soon.". Preserve the greeting marks, existing link, block ID and image, all other nodes and fields, and the entire Italian locale. Do not publish.`;
   const result=await run(`case-${target.kind}`,`Use the current hosted DatoCMS MCP for site ${site}, environment ${environment}, record ${target.id}. ${task}`,`Only the requested record edit in the named disposable sandbox is authorized. No changes to schema, settings, environments, uploads, roles, API tokens, billing, or other records. Keep the selected MCP route; no local CLI or direct HTTP fallback.`);
   for(const call of result.mcpCalls.filter(c=>/script$/.test(c.tool)))assert.equal(call.arguments.environment,environment,'Wrong script environment');
   const executions=result.mcpCalls.filter(c=>/upsert_and_execute_/.test(c.tool));
   const errors=executions.filter(c=>c.status!=='completed'||!/# Script executed successfully/.test(responseText(c))).map(c=>({tool:c.tool,text:responseText(c),error:c.error??null}));
   report.cases.push({kind:target.kind,recordId:target.id,strictExecutionPassed:errors.length===0,executionErrors:errors,mcpCalls:result.mcpCalls.length,correctOutcome:null});save();console.log(`COMPLETED actor ${target.kind}; strict=${errors.length===0}`);
  }
  const after=await exact('after',observation);writeFileSync(join(output,'after.json'),json(after));
  for(const entry of report.cases){
   try {assertOutcome(entry.kind,before.records.find(r=>r.kind===entry.kind),after.records.find(r=>r.kind===entry.kind));entry.correctOutcome=true;}
   catch(error){entry.correctOutcome=false;entry.failure=String(error);}
  }
 } catch(error){report.failure=String(error);console.error(String(error));}
 finally {
  if(attemptedFork){
   try {
    report.cleanup=await exact('cleanup',cleanupSource(site,environment),{write:true,target:'main'});
   }catch(error){report.cleanup={clean:false,error:String(error)};console.error(`CLEANUP FAILED: ${error}`);}
  }
  report.completedAt=new Date().toISOString();report.passed=!report.failure&&report.cases.length===3&&report.cases.every(c=>c.correctOutcome)&&report.cleanup?.clean===true;save();
 }
 console.log(json(report));if(!report.passed)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error);process.exitCode=1;});
