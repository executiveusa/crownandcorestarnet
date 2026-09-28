import fs from 'node:fs';
import { readJson, arg, rootPath } from '../../lib/io.mjs';

const failures = [];

for (const file of [
  'HEART_AND_SOUL.md',
  'docs/PRD.md',
  'ARCHITECTURE.md',
  'agents/manny/AGENT.md',
  'districts/middleton/POLICY.md',
  'districts/middleton/canon/system.json',
  'config/rooms.json',
  'config/permissions.json',
  'integrations/manifest.json',
  'schedules/schedules.json'
]) {
  if (!fs.existsSync(rootPath(file))) failures.push(`missing required file: ${file}`);
}

const rooms = readJson(rootPath('config','rooms.json'));
const permissions = readJson(rootPath('config','permissions.json'));
const integrations = readJson(rootPath('integrations','manifest.json'));
const schedules = readJson(rootPath('schedules','schedules.json'));

if ((rooms.rooms ?? []).length !== 7) failures.push('exactly seven Crown & Core rooms required');
if (permissions.default !== 'deny_external_write') failures.push('default permission must deny external writes');
if (permissions.hard_rules?.review_gating !== false) failures.push('review gating must be false');
if ((integrations.integrations ?? []).some(x => x.secrets_committed === true)) failures.push('integration manifest reports committed secrets');
if ((schedules.jobs ?? []).some(x => x.external_write === true)) failures.push('proof-mode schedules may not perform external writes');

const expectedRooms = ['conversion','return','trust','nurture','reception','media','performance'];
for (const room of expectedRooms) {
  if (!(rooms.rooms ?? []).some(x => x.id === room)) failures.push(`missing room: ${room}`);
  if (!fs.existsSync(rootPath('agents',room,'AGENT.md'))) failures.push(`missing agent contract: ${room}`);
}

if (failures.length) {
  console.error('System check failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('System check passed.');
console.log('Rooms: 7');
console.log('Default external write: denied');
console.log('Review gating: forbidden');
console.log('Proof schedules: read-only');
