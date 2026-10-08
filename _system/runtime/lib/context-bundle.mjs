import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TEXT_EXT=new Set(['.md','.txt','.json','.yaml','.yml','.mjs','.js']);

function inside(root,target){
  const r=path.resolve(root), t=path.resolve(target);
  return t===r||t.startsWith(r+path.sep);
}

function collectFiles(root,rel,out){
  if(path.isAbsolute(rel)||rel.split(/[\\/]+/).includes('..')) throw new Error('unsafe context path: '+rel);
  const abs=path.resolve(root,rel);
  if(!inside(root,abs)||!fs.existsSync(abs)) return;
  const stat=fs.statSync(abs);
  if(stat.isDirectory()){
    for(const name of fs.readdirSync(abs)) collectFiles(root,path.join(rel,name),out);
    return;
  }
  if(TEXT_EXT.has(path.extname(abs).toLowerCase())) out.push({rel:rel.replaceAll('\\','/'),abs});
}

export function buildContextBundle({repoRoot,district,agentId=null,promptRel,maxChars=80000,maxFileChars=30000,scopeManifestPath=null}){
  let explicit=[];
  let scopeSha=null;

  if(scopeManifestPath&&fs.existsSync(scopeManifestPath)){
    const raw=fs.readFileSync(scopeManifestPath);
    scopeSha=crypto.createHash('sha256').update(raw).digest('hex');
    const manifest=JSON.parse(raw.toString('utf8'));
    explicit=(manifest.files||[]).map(x=>x.path);
  } else {
    const scopes=JSON.parse(fs.readFileSync(path.join(repoRoot,'_system','runtime','scopes.json'),'utf8'));
    if(!agentId) throw new Error('agentId required when building context without a scope manifest');
    const agentScope=scopes.agents?.[agentId];
    if(!agentScope) throw new Error('no explicit context scope for agent '+agentId);
    explicit=[...(scopes.shared_read||[]),...(agentScope.read||[])];
  }

  const candidates=[];
  for(const rel of [...new Set(explicit)]){
    if(rel===promptRel) continue;
    collectFiles(repoRoot,rel,candidates);
  }

  const seen=new Set();
  const files=[];
  let total=0;
  for(const item of candidates.sort((a,b)=>a.rel.localeCompare(b.rel))){
    if(seen.has(item.rel)) continue;
    seen.add(item.rel);
    const raw=fs.readFileSync(item.abs,'utf8');
    const text=raw.slice(0,maxFileChars);
    if(total+text.length>maxChars){
      const remaining=Math.max(0,maxChars-total);
      if(remaining>0) files.push({path:item.rel,text:text.slice(0,remaining),truncated:true});
      total=maxChars;
      break;
    }
    files.push({path:item.rel,text,truncated:raw.length>text.length});
    total+=text.length;
  }

  const rendered=files.map(f=>'SOURCE: '+f.path+(f.truncated?' [TRUNCATED]':'')+'\n'+f.text).join('\n\n---\n\n');
  return {
    text:rendered,
    files:files.map(f=>({path:f.path,chars:f.text.length,truncated:f.truncated})),
    chars:rendered.length,
    sha256:crypto.createHash('sha256').update(rendered).digest('hex'),
    scope_sha256:scopeSha
  };
}
