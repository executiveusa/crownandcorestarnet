// Resolve the repository boundary from this module, not the caller's cwd.
// Canonicalize existing symlinked ancestors even for a file not created yet.
import { existsSync, realpathSync } from 'node:fs';
import { dirname, basename, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot=realpathSync(fileURLToPath(new URL('../../../../',import.meta.url)));
function canonicalFuturePath(filename){
  let cursor=resolve(filename);
  const suffix=[];
  while(!existsSync(cursor)){
    const parent=dirname(cursor);
    if(parent===cursor)throw new Error('No existing filesystem ancestor.');
    suffix.unshift(basename(cursor));
    cursor=parent;
  }
  return resolve(realpathSync(cursor),...suffix);
}
export function requireOutsideRepository(filename){
  if(typeof filename!=='string'||!isAbsolute(filename))
    throw new Error('Private state path must be absolute and outside repository.');
  const target=canonicalFuturePath(filename);
  const rel=relative(repoRoot,target);
  if(rel===''||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep)))
    throw new Error('Private state path must be outside the public repository.');
  return target;
}
