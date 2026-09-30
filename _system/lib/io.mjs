import fs from 'node:fs';
import path from 'node:path';

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

export function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : value + '\n');
}

export function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(x => x.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

export function boolArg(name, fallback = false) {
  const value = arg(name, null);
  if (value === null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function rootPath(...parts) {
  return path.join(process.cwd(), ...parts);
}
