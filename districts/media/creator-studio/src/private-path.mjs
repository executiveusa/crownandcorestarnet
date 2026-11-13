// Resolve the repository boundary from this module, not the caller's cwd.
// Canonicalize existing symlinked ancestors even for a file not created yet.
import { lstatSync, realpathSync } from 'node:fs';
import { dirname, basename, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot=realpathSync(fileURLToPath(new URL('../../../../',import.meta.url)));
function canonicalFuturePath(filename){
  let cursor=resolve(filename);
  const suffix=[];
  while(true){
    try {
      const st=lstatSync(cursor); // lstat detects dangling links which existsSync hides
      if(st.isSymbolicLink()) {
        // Even outside-repository symlinks are denied to avoid TOCTOU and dangling targets.
        throw new Error('Private state path must not contain symbolic links.');
      }
      return resolve(realpathSync(cursor),...suffix);
    } catch(error) {
      if(error?.code!=='ENOENT')throw error;
      const parent=dirname(cursor);
      if(parent===cursor)throw new Error('No existing filesystem ancestor.');
      suffix.unshift(basename(cursor));
      cursor=parent;
    }
  }
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
