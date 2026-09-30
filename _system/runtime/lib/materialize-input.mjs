import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function inside(root, target) {
  const r = path.resolve(root);
  const t = path.resolve(target);
  return t === r || t.startsWith(r + path.sep);
}

function copyRecursive(src, dst, manifest, repoRoot) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dst, name), manifest, repoRoot);
    }
    return;
  }

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  const bytes = fs.readFileSync(dst);
  manifest.push({
    path: path.relative(repoRoot, src).replaceAll('\\', '/'),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length
  });
}

export function materializeAgentInput({ repoRoot, computerRoot, agent, extraReadPaths = [] }) {
  const scopes = JSON.parse(fs.readFileSync(path.join(repoRoot, '_system', 'runtime', 'scopes.json'), 'utf8'));
  const districtScope = scopes.districts?.[agent.district];
  if (!districtScope) throw new Error('no input scope for district ' + agent.district);

  const bundleRoot = path.join(computerRoot, 'input');
  fs.rmSync(bundleRoot, { recursive: true, force: true });
  fs.mkdirSync(bundleRoot, { recursive: true });

  if (!agent.prompt_path) throw new Error('ICM agent missing explicit prompt_path: ' + agent.id);
  const paths = [
    ...(scopes.shared_read || []),
    ...(districtScope.read || []),
    ...extraReadPaths,
    agent.prompt_path
  ];

  const unique = [...new Set(paths)];
  const files = [];

  for (const rel of unique) {
    if (path.isAbsolute(rel) || rel.split(/[\\/]+/).includes('..')) {
      throw new Error('invalid scoped path: ' + rel);
    }
    const src = path.resolve(repoRoot, rel);
    const dst = path.resolve(bundleRoot, rel);
    if (!inside(repoRoot, src) || !inside(bundleRoot, dst)) {
      throw new Error('scope path outside allowed root: ' + rel);
    }
    if (!fs.existsSync(src)) throw new Error('scoped input missing: ' + rel);
    copyRecursive(src, dst, files, repoRoot);
  }

  const scopeManifest = {
    schema: 'cc.agent.scope.v1',
    agent_id: agent.id,
    district: agent.district,
    generated_at: new Date().toISOString(),
    explicit_paths: unique,
    handoff_paths: [...new Set(extraReadPaths)],
    files: files.sort((a, b) => a.path.localeCompare(b.path))
  };

  const raw = JSON.stringify(scopeManifest, null, 2) + '\n';
  fs.writeFileSync(path.join(bundleRoot, 'SCOPE-MANIFEST.json'), raw);

  return {
    bundleRoot,
    manifest: scopeManifest,
    sha256: crypto.createHash('sha256').update(raw).digest('hex')
  };
}
