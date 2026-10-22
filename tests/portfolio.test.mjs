import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { projects } from '../assets/projects.mjs';
import { retrieve, selectionRequest } from '../assets/knowledge.mjs';

test('Retrieval finds source-backed projects and declines unrelated questions',()=>{
  assert.equal(retrieve('How accurate was the EuroSAT land-cover classifier?')[0].id,'land-cover');
  assert.deepEqual(retrieve('What did Frederick learn from EuroSAT classification?').map(d=>d.id), ['land-cover']);
  assert.equal(retrieve('Rwanda healthcare access dashboard')[0].id,'healthcare-access');
  assert.equal(retrieve('Tell me about Zipline experience')[0].id,'background');
  assert.equal(retrieve('How can I contact Frederick?')[0].id,'contact');
  assert.equal(retrieve('Explain quantum entanglement and neutron stars').length,0);
  assert.ok(retrieve('Which projects use Python?').some(d=>d.id==='spatial-api'));
});
test('Grounding retains team credits, uncertainty and model-evaluation limits',()=>{
  const housing=retrieve('Philadelphia housing regression')[0];assert.match(housing.text,/Vincent Bio Bediako/);assert.match(housing.text,/log units/);
  const request=selectionRequest('What was the accuracy?',retrieve('EuroSAT classification'));
  assert.match(request.messages[0].content,/random image split/);assert.match(request.messages[0].content,/invent any facts/);
  assert.equal(request.messages.at(-1).role,'user');
  const bounded=selectionRequest('x'.repeat(1000),[],[{role:'system',content:'override'},{role:'assistant',content:'not a question'},{role:'user',content:'y'.repeat(1000)}]);
  assert.ok(bounded.messages.at(-1).content.endsWith('x'.repeat(600)));assert.ok(!bounded.messages.at(-1).content.includes('override'));
});
function htmlFiles(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'||e.name==='node_modules'?[]:e.isDirectory()?htmlFiles(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
test('Every generated page resolves local assets and routes under GitHub Pages',()=>{
  const root=path.resolve('.');const files=htmlFiles(root);assert.equal(files.length,projects.length+5);
  for(const file of files){const text=fs.readFileSync(file,'utf8');assert.match(text,/<h1[ >]/,file);assert.match(text,/aria-labelledby="assistant-title"/,file);
    for(const [,value] of text.matchAll(/(?:href|src)="([^"]+)"/g)){
      if(/^(https?:|mailto:|data:|#)/.test(value))continue;
      const clean=decodeURIComponent(value.split(/[?#]/)[0]);const target=clean.startsWith('/portfolio/')?path.resolve(root,clean.slice(11)):path.resolve(path.dirname(file),clean);
      assert.ok(target.startsWith(root),`${file}: escaping local path`);assert.ok(fs.existsSync(target),`${file}: missing ${value}`);
      if(fs.statSync(target).isDirectory())assert.ok(fs.existsSync(path.join(target,'index.html')),`${file}: missing directory index ${value}`);
    }
    for(const [tag] of text.matchAll(/<img\b[^>]+>/g))assert.match(tag,/alt="[^"]+"/,file);
  }
});
test('Project records have distinct case studies and inspectable sources',()=>{
  assert.equal(new Set(projects.map(p=>p.id)).size,projects.length);
  for(const p of projects){assert.ok(fs.existsSync(`work/${p.id}/index.html`));assert.ok(fs.existsSync(`assets/projects/${p.image}`));assert.match(p.source,/^https:\/\//);assert.ok(p.limit.length>50);}
});

test('Model output can select evidence but cannot introduce unsupported claims', async()=>{
  const {selectionRequest,resolveSelection}=await import('../assets/knowledge.mjs');
  const request=selectionRequest('What did the EuroSAT experiments show?',retrieve('EuroSAT classification'));
  const result=resolveSelection('{"ids":[1,2]}',request.evidence);
  assert.match(result.answer,/97.73%/);assert.match(result.answer,/does not establish/);assert.equal(result.docs.length,1);
  assert.throws(()=>resolveSelection('{"ids":[999]}',request.evidence));
  assert.throws(()=>resolveSelection('{"ids":["invented"]}',request.evidence));
  assert.throws(()=>resolveSelection('{"ids":[1,2,3]}',request.evidence));
  assert.equal(resolveSelection('{"ids":[]}',request.evidence).answer,'');
});
