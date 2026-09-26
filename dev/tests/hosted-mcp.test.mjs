import test from 'node:test';
import assert from 'node:assert/strict';
import {assertOutcome,exactScriptOutput} from '../e2e/hosted/run.mjs';
import * as hosted from '../e2e/hosted/run.mjs';
import {readFileSync} from 'node:fs';
import {initialRecord,expectedRecord} from '../evals/coexistence/cases.mjs';
function record(kind){const value=initialRecord({variant:'multiple'});value.type='item';return {kind,current:value,published:structuredClone(value),versions:2};}
function changed(before){const current=expectedRecord({variant:'multiple',operation:'structured'});current.type='item';return {kind:before.kind,current,published:structuredClone(before.published),versions:3};}
test('hosted sessions require their own credential file without inheriting the host home',()=>{
 const source=readFileSync(new URL('../e2e/hosted/run.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/HOME\s*:\s*homedir\(\)/);
 assert.match(source,/mcpCredentials\s*:/);
 assert.match(source,/E2E_CODEX_MCP_CREDENTIALS/);
});
test('hosted command routing permits skill reads and rejects CLI or direct API fallbacks',()=>{
 assert.equal(typeof hosted.assertNoHostedFallback,'function');
 for(const command of ['cat .agents/skills/datocms-cma/SKILL.md','rg --files','cat datocms.config.json'])assert.doesNotThrow(()=>hosted.assertNoHostedFallback([{command}]));
 for(const command of ['npx datocms whoami','datocms cma:call items list','curl https://site-api.datocms.com/items','curl https://mcp.datocms.com','/bin/zsh -lc "npx datocms whoami"'])assert.throws(()=>hosted.assertNoHostedFallback([{command}]),/CLI\/direct HTTP fallback/);
});
test('hosted route checks report unavailable authentication instead of a built-in resource-list route',()=>{
 assert.equal(typeof hosted.checkMcpRoute,'function');
 const builtins=[{server:'codex',tool:'list_mcp_resources'},{server:'codex',tool:'list_mcp_resource_templates'}];
 assert.throws(()=>hosted.checkMcpRoute({mcpCalls:builtins},'AuthRequired: Missing Authorization header'),/Hosted MCP unavailable/);
 assert.throws(()=>hosted.checkMcpRoute({mcpCalls:builtins},''),/Hosted MCP unavailable/);
 assert.throws(()=>hosted.checkMcpRoute({mcpCalls:[]},''),/Hosted MCP unavailable/);
 const valid={server:hosted.SERVER.name,tool:'get_api_methods'};
 assert.doesNotThrow(()=>hosted.checkMcpRoute({mcpCalls:[valid,...builtins]},''));
 assert.throws(()=>hosted.checkMcpRoute({mcpCalls:[valid]},'invalid_token'),/Hosted MCP unavailable/);
 for(const other of [{server:'OtherServer',tool:'read'},{server:'codex',tool:'list_mcp_resource_unrecognized'},{server:'codex',tool:'execute'}])assert.throws(()=>hosted.checkMcpRoute({mcpCalls:[valid,other]},''),/Unexpected MCP route/);
 assert.throws(()=>hosted.checkMcpRoute({mcpCalls:[{server:'OtherServer',tool:'read'}]},''),/Unexpected MCP route/);
});
test('hosted oracle accepts the requested edit and ignores only update bookkeeping',()=>{
 const before=record('published'),after=changed(before);assert.doesNotThrow(()=>assertOutcome('published',before,after));
 after.current.body.en.document.children[1].item.meta={current_version:'2',updated_at:'now'};
 before.current.body.en.document.children[1].item.meta={current_version:'1',updated_at:'before'};
 assert.doesNotThrow(()=>assertOutcome('published',before,after));
});
test('hosted oracle rejects changes to non-target blocks, assets, locales and publication',()=>{
 for(const mutate of [
  after=>after.current.body.en.document.children[2].item.attributes.caption='wrong',
  after=>after.current.body.en.document.children[1].item.attributes.image.custom_data.source='wrong',
  after=>after.current.body.it.document.children[1].code='trimmed',
  after=>after.published.title='unexpectedly published',
  after=>after.current.meta.published_at='different date',
  after=>after.versions++,
 ]){const before=record('published'),after=changed(before);mutate(after);assert.throws(()=>assertOutcome('published',before,after));}
});
test('hosted fixture output requires verbatim source and an actual execution receipt',()=>{
 const source='console.log(JSON.stringify({ok:true}));';
 const call={tool:'upsert_and_execute_safe_script',status:'completed',arguments:{body:{mode:'full',content:source}},result:{content:[{type:'text',text:'# Script executed successfully\n\n## Output\n\n```text\n{"ok":true}\n```'}]}};
 assert.deepEqual(exactScriptOutput({mcpCalls:[call]},source,false),{ok:true});
 const scoped=structuredClone(call);scoped.arguments.site_id='12345';scoped.arguments.environment='sandbox';
 assert.deepEqual(exactScriptOutput({mcpCalls:[scoped]},source,false,{site:'12345',environment:'sandbox'}),{ok:true});
 assert.throws(()=>exactScriptOutput({mcpCalls:[scoped]},source,false,{site:'12345',environment:'main'}));
 assert.throws(()=>exactScriptOutput({mcpCalls:[scoped]},source,false,{site:'67890',environment:'sandbox'}));
 assert.throws(()=>exactScriptOutput({mcpCalls:[call,call]},source,false));
 assert.throws(()=>exactScriptOutput({mcpCalls:[call]},'console.log("different");',false));
 const noExecute=structuredClone(call);noExecute.arguments.no_execute=true;
 assert.throws(()=>exactScriptOutput({mcpCalls:[noExecute]},source,false));
 const fake=structuredClone(call);fake.result.content[0].text='The operation succeeded';
 assert.throws(()=>exactScriptOutput({mcpCalls:[fake]},source,false));
});

test('every fixed hosted fixture script compiles against the installed SDK and project-shaped types', async()=>{
 const ts=(await import('typescript')).default;
 const {mkdirSync,mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
 const {join,resolve}=await import('node:path');
 const {prepareSource,schemaSource,uploadSource,seedSource,observationSource,cleanupSource}=await import('../e2e/hosted/fixtures.mjs');
 // Inside dev/ so TypeScript resolves the SDK from dev/node_modules whatever the cwd.
 const local=resolve(import.meta.dirname,'../local');
 mkdirSync(local,{recursive:true});
 const directory=mkdtempSync(join(local,'hosted-types-'));
 const types=`import type {Client,ItemTypeDefinition} from '@datocms/cma-client-node';
 declare const client:Client;
 declare namespace Schema {
  type HostedImage=ItemTypeDefinition<{locales:'en'|'it'},'image-type',{caption:{type:'string'},image:{type:'file'}}>;
  type HostedArticle=ItemTypeDefinition<{locales:'en'|'it'},'article-type',{title:{type:'string'},untouched:{type:'string'},body:{type:'structured_text',localized:true,blocks:HostedImage}}>;
 }
 `;
 try {
  const scripts=[prepareSource('12345','e2e-fixture'),schemaSource(),uploadSource(),seedSource({image:'image-type',article:'article-type'},{id:'upload-id'}),observationSource([{kind:'simple',id:'record-id'}]),cleanupSource('12345','e2e-fixture')];
  const files=scripts.map((s,i)=>{const p=join(directory,`${i}.mts`);writeFileSync(p,types+s);return p;});
  const program=ts.createProgram(files,{strict:true,noEmit:true,skipLibCheck:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,target:ts.ScriptTarget.ES2022});
  const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(d=>`${d.file?.fileName}: ${ts.flattenDiagnosticMessageText(d.messageText,'\n')}`),[]);
 } finally {rmSync(directory,{recursive:true,force:true});}
});
