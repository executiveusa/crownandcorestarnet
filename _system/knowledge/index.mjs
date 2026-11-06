import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fs.realpathSync(fileURLToPath(new URL("../../", import.meta.url)));
const catalogFile = path.join(root, "_system/knowledge/catalog.json");
const MAX_DOC_BYTES = 125000;
const MAX_RETURN = 18000;
const allowedPrefixes = ["_shared/", "districts/", "_system/references/", "_system/integrations/", "_system/policy/", "knowledge/", ".paperclip/"];

function validateSource(entry) {
  if (!entry || typeof entry.id !== "string" || !/^[a-z0-9-]{1,50}$/.test(entry.id)) throw new Error("Invalid source ID");
  const rel = entry.path;
  if (typeof rel !== "string" || rel.includes("\\") || rel.startsWith("/") || rel.split("/").includes("..") || !allowedPrefixes.some(p => rel.startsWith(p))) {
    throw new Error("Unsafe catalog path");
  }
  const absolute = path.resolve(root, rel);
  if (!absolute.startsWith(root + path.sep)) throw new Error("Catalog path escape");
  const metadata = fs.lstatSync(absolute);
  if (!metadata.isFile() || metadata.size > MAX_DOC_BYTES || !fs.realpathSync(absolute).startsWith(root + path.sep)) {
    throw new Error("Unsafe or oversized catalog file");
  }
  return absolute;
}

function load() {
  const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
  if (catalog.classification !== "public_repo_only" || !Array.isArray(catalog.sources)) throw new Error("Invalid catalog");
  const ids = new Set();
  for (const entry of catalog.sources) {
    validateSource(entry);
    if (ids.has(entry.id)) throw new Error("Duplicate source ID");
    ids.add(entry.id);
  }
  return catalog.sources;
}

function read(entry) {
  const content = fs.readFileSync(validateSource(entry), "utf8");
  return { content, sha256: crypto.createHash("sha256").update(content).digest("hex") };
}

export function listKnowledge() {
  return {
    classification: "public_repo_only",
    connected_private_database: false,
    connected_paperclip_runtime: false,
    source_count: load().length,
    sources: load().map(({id,title,path:source_path,group,status}) => ({id,title,source_path,group,status}))
  };
}

export function getKnowledge(id) {
  if (typeof id !== "string" || id.length > 50) throw new TypeError("Invalid source ID");
  const entry = load().find(x => x.id === id);
  if (!entry) throw new Error("UNKNOWN_SOURCE");
  const { content, sha256 } = read(entry);
  return {
    id: entry.id, title: entry.title, source_path: entry.path, group: entry.group,
    source_status: entry.status, classification: "public_repo_only", sha256,
    content: content.slice(0, MAX_RETURN), truncated: content.length > MAX_RETURN
  };
}

export function searchKnowledge(query, limit = 5) {
  if (typeof query !== "string" || !query.trim() || query.length > 160) throw new TypeError("Search query must be 1-160 characters");
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new TypeError("Limit must be 1-10");
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])].filter(x => x.length >= 2).slice(0, 12);
  if (!terms.length) throw new TypeError("Search query has no usable keywords");
  const results = [];
  for (const entry of load()) {
    const { content, sha256 } = read(entry);
    const lower = content.toLowerCase();
    const title = entry.title.toLowerCase();
    const full = query.toLowerCase().trim();
    let score = lower.includes(full) ? 8 : 0;
    for (const term of terms) {
      if (title.includes(term)) score += 5;
      if (lower.includes(term)) score += 1;
    }
    if (score < 1) continue;
    let match = lower.indexOf(full);
    if (match < 0) match = Math.min(...terms.map(x => lower.indexOf(x)).filter(x => x >= 0));
    if (!Number.isFinite(match)) match = 0;
    const start = Math.max(0, match - 100);
    const snippet = content.slice(start, Math.min(content.length, start + 490)).replace(/\s+/g, " ").trim();
    const sourceLine = content.slice(0, match).split("\n").length;
    results.push({
      id: entry.id, title: entry.title, source_path: entry.path,
      source_status: entry.status, group: entry.group, classification: "public_repo_only",
      sha256, source_line: sourceLine, excerpt: snippet, score
    });
  }
  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { query, search_mode: "bounded_keyword", classification: "public_repo_only", results: results.slice(0, limit) };
}
