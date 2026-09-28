import path from 'node:path';

export function resolveInside(root, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) throw new Error('path required');
  if (path.isAbsolute(relativePath)) throw new Error('absolute path denied');
  if (/^[A-Za-z]:[\\/]/.test(relativePath) || /^\\\\/.test(relativePath)) throw new Error('drive/UNC path denied');
  const base = path.resolve(root);
  const target = path.resolve(base, relativePath);
  if (target !== base && !target.startsWith(base + path.sep)) throw new Error('workspace escape denied');
  return target;
}
