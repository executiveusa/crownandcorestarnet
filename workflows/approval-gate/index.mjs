import { readJson, writeJson, arg, rootPath } from '../../lib/io.mjs';

const input = arg('input', rootPath('schemas', 'action-request.example.json'));
const output = arg('out', rootPath('outbox', 'APPROVAL-RESULT.json'));

const request = readJson(input);
const permissions = readJson(rootPath('config', 'permissions.json'));

const gated = new Set(permissions.approval_required ?? []);
const hard = permissions.hard_rules ?? {};
const reasons = [];

if (!request.id) reasons.push('missing action id');
if (!request.type) reasons.push('missing action type');
if (!request.target_system) reasons.push('missing target system');
if (!request.business_reason) reasons.push('missing business reason');
if (!request.success_metric) reasons.push('missing success metric');
if (!request.stop_condition) reasons.push('missing stop condition');
if (!request.rollback) reasons.push('missing rollback');

const requiresApproval = gated.has(request.type);
const approval = request.approval ?? {};

if (requiresApproval) {
  if (approval.required !== true) reasons.push('gated action must declare approval.required=true');
  if (approval.approved !== true) reasons.push('gated action is not approved');
  if (!approval.approved_by) reasons.push('missing approved_by');
  if (!approval.approved_at) reasons.push('missing approved_at');
}

if (request.type === 'review_request' && hard.review_gating === false && request.review_gated === true) {
  reasons.push('review gating is forbidden');
}

if (request.type === 'spend' || request.type === 'ad_change') {
  if (!(typeof request.cost_ceiling === 'number' && request.cost_ceiling >= 0)) {
    reasons.push('spend/ad actions require numeric cost_ceiling');
  }
}

const result = {
  action_id: request.id ?? null,
  action_type: request.type ?? null,
  requires_approval: requiresApproval,
  decision: reasons.length ? 'BLOCK' : 'ALLOW',
  reasons,
  checked_at: new Date().toISOString()
};

writeJson(output, result);
console.log(`${result.decision}: ${result.action_id ?? 'unknown'}`);
if (reasons.length) for (const reason of reasons) console.log(`- ${reason}`);

process.exitCode = reasons.length ? 2 : 0;
