#!/usr/bin/env node
'use strict';

/**
 * validate-facts.js
 *
 * Checks published copy against facts.json and fails the build on drift.
 * Node, no dependencies.
 *
 * Scanned surfaces (published copy):
 *   index.html, experience/index.html, how-i-work/index.html,
 *   propel26/index.html, givebutter/index.html, context.js
 *
 * Explicitly NOT scanned:
 *   layout-reference.html      — marked "not for deployment", excluded via .vercelignore
 *   Zappi-IMP-homepage.html    — internal Zappi material, excluded via .vercelignore
 *   _archive-v1/               — historical placeholder, no live content
 *   ai/index.html, projects.html — deleted; redirect is server-side only (vercel.json)
 *   *.json, *.css, vercel.json, package.json, etc. — config, not copy
 *
 * Design constraint: this script never scans blindly for "any number." Every
 * check is anchored to a specific claim pattern from facts.json (a keyword,
 * a known-wrong string, or a specific metric's expected qualifier). That is
 * deliberate — a validator that fires on unrelated years, dates, phone
 * numbers, dimensions, or CSS values gets disabled by the next person who
 * hits a false positive, which defeats the point of having it at all.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const SURFACES = [
  'index.html',
  'experience/index.html',
  'how-i-work/index.html',
  'propel26/index.html',
  'givebutter/index.html',
  'context.js',
];

const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'facts.json'), 'utf8'));

const failures = [];
const warnings = [];

// facts.json self-consistency: the tool list and the published tool count
// are two different fields by necessity (an array vs. a number), so nothing
// stops them drifting apart except checking it here, every run.
{
  const toolsCount = facts.automationCoverage.tools.value.length;
  const liveCount = facts.automationCoverage.liveAutomations.value;
  if (toolsCount !== liveCount) {
    console.error(
      `validate-facts: facts.json is internally inconsistent — automationCoverage.tools has ${toolsCount} entries but liveAutomations is ${liveCount}. Fix facts.json before validating copy.`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Strip <style>...</style> blocks so CSS percentages/dimensions/colors can
// never be mistaken for claim values. Newline count is preserved so line
// numbers reported for real matches elsewhere stay accurate.
function stripStyleBlocks(text) {
  return text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
    const newlineCount = (match.match(/\n/g) || []).length;
    return '\n'.repeat(newlineCount);
  });
}

function report(file, index, text, message) {
  failures.push({ file, line: lineAt(text, index), message });
}

function windowHasKeyword(text, index, matchLength, radius, keywords) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + matchLength + radius);
  const window = text.slice(start, end).toLowerCase();
  return keywords.some((k) => window.includes(k.toLowerCase()));
}

// ---------------------------------------------------------------------------
// per-surface checks
// ---------------------------------------------------------------------------

function checkRetiredStrings(file, text) {
  for (const entry of facts.retiredStrings) {
    if (entry.type === 'literal') {
      const re = new RegExp(escapeRegExp(entry.pattern), 'gi');
      let m;
      while ((m = re.exec(text))) {
        report(file, m.index, text, `retired string "${m[0]}" — ${entry.reason}`);
      }
    } else if (entry.type === 'regex') {
      const re = new RegExp(entry.pattern, (entry.flags || '') + 'g');
      let m;
      while ((m = re.exec(text))) {
        report(file, m.index, text, `retired pattern "${m[0]}" — ${entry.reason}`);
        if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width matches
      }
    } else if (entry.type === 'contextual') {
      const re = new RegExp(escapeRegExp(entry.pattern), (entry.flags || '') + 'g');
      let m;
      while ((m = re.exec(text))) {
        if (windowHasKeyword(text, m.index, m[0].length, entry.contextWindow || 150, entry.contextKeywords || [])) {
          report(file, m.index, text, `retired figure "${m[0]}" — ${entry.reason}`);
        }
      }
    }
  }
}

function checkTitleForm(file, text) {
  const base = 'Global Director of Implementation';
  const re = new RegExp(escapeRegExp(base) + '(?!\\s&\\sOnboarding\\b)', 'g');
  let m;
  while ((m = re.exec(text))) {
    // Peek ahead to render a useful excerpt in the message.
    const excerpt = text.slice(m.index, Math.min(text.length, m.index + base.length + 20)).replace(/\s+/g, ' ');
    report(file, m.index, text, `title appears in unapproved form: "${excerpt.trim()}…" — must read exactly "${facts.identity.title.value}"`);
  }
}

function checkVendorNames(file, text) {
  const re = /\b(Claude(?:\s+Code)?|ChatGPT|GPT-?\d*(?:\.\d+)?|Codex|Gemini(?:\s*\d+(?:\.\d+)?)?)\b/g;
  let m;
  while ((m = re.exec(text))) {
    const lineStart = text.lastIndexOf('\n', m.index) + 1;
    const lineEnd = text.indexOf('\n', m.index);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);

    // Exception: context.js's Personal Projects section, about the site's
    // own build rather than Zappi case-study work.
    if (file === 'context.js') {
      const sectionStart = text.indexOf('== PERSONAL PROJECTS ==');
      if (sectionStart !== -1) {
        const nextHeading = text.indexOf('\n==', sectionStart + 1);
        const sectionEnd = nextHeading === -1 ? text.length : nextHeading;
        if (m.index >= sectionStart && m.index < sectionEnd) continue;
      }
    }

    report(file, m.index, text, `vendor/model name "${m[0]}" in published copy — no vendor names outside context.js's Personal Projects section`);
  }
}

function checkMetricQualifiers(file, text) {
  // implementation time reduction — ~38%
  {
    const re = /(?<![~\d])38%/g;
    let m;
    while ((m = re.exec(text))) {
      report(file, m.index, text, `"38%" missing required "~" qualifier — facts.json: implementationTimeReduction is "${facts.metrics.implementationTimeReduction.value}"`);
    }
  }
  // adoption speed — ~40% faster
  {
    const re = /(?<![~\d])40%/g;
    let m;
    while ((m = re.exec(text))) {
      if (windowHasKeyword(text, m.index, m[0].length, 40, ['faster', 'adoption'])) {
        report(file, m.index, text, `"40%" missing required "~" qualifier — facts.json: adoptionSpeed is "${facts.metrics.adoptionSpeed.value}"`);
      }
    }
  }
  // onboarding-generated revenue — ~10% increase
  {
    const re = /(?<![~\d])10%/g;
    let m;
    while ((m = re.exec(text))) {
      if (windowHasKeyword(text, m.index, m[0].length, 60, ['revenue', 'onboarding'])) {
        report(file, m.index, text, `"10%" missing required "~" qualifier — facts.json: onboardingGeneratedRevenue is "${facts.metrics.onboardingGeneratedRevenue.value}"`);
      }
    }
  }
  // agent setup time — ~20 hours to 8-10 hours
  {
    const re = /(?<!~)\b20\s*hours?\b/gi;
    let m;
    while ((m = re.exec(text))) {
      if (windowHasKeyword(text, m.index, m[0].length, 80, ['8-10', '8–10', '8 to 10'])) {
        report(file, m.index, text, `"${m[0]}" missing required "~" qualifier — facts.json: agentSetupTime is "${facts.metrics.agentSetupTime.value}"`);
      }
    }
  }
  // A trailing "+" isn't the only valid way to avoid presenting a floor as
  // exact — "above 75", "over 60", "at least 60" all do the same job.
  // Only flag a bare number with no qualifying word anywhere nearby.
  const FLOOR_QUALIFIERS = ['above', 'over', 'at least', 'more than'];

  // implementations per year — 60+
  {
    const re = /\b60(?!\+)\b/g;
    let m;
    while ((m = re.exec(text))) {
      if (windowHasKeyword(text, m.index, m[0].length, 40, ['implementation']) &&
          windowHasKeyword(text, m.index, m[0].length, 40, ['year', 'annual']) &&
          !windowHasKeyword(text, m.index, m[0].length, 20, FLOOR_QUALIFIERS)) {
        report(file, m.index, text, `"60" missing required "+" qualifier (or "above"/"over" wording) — facts.json: implementationsPerYear is "${facts.metrics.implementationsPerYear.value}"`);
      }
    }
  }
  // NPS — 75+
  {
    const re = /\b75(?!\+)\b/g;
    let m;
    while ((m = re.exec(text))) {
      if (windowHasKeyword(text, m.index, m[0].length, 20, ['nps']) &&
          !windowHasKeyword(text, m.index, m[0].length, 20, FLOOR_QUALIFIERS)) {
        report(file, m.index, text, `"75" missing required "+" qualifier (or "above"/"over" wording) — facts.json: nps is "${facts.metrics.nps.value}"`);
      }
    }
  }
  // active AI tool count — must equal liveAutomations (7)
  {
    const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const re = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+active AI tools\b/gi;
    let m;
    while ((m = re.exec(text))) {
      const raw = m[1].toLowerCase();
      const n = words[raw] !== undefined ? words[raw] : parseInt(raw, 10);
      const expected = facts.automationCoverage.liveAutomations.value;
      if (n !== expected) {
        report(file, m.index, text, `"${m[0]}" states ${n} tools — facts.json: liveAutomations is ${expected}`);
      }
    }
  }
  // "N of M stages" — must equal stagesWithActiveTooling of stagesMapped (8 of 11)
  {
    const re = /\b(\d+)\s+of\s+(\d+)\s+(?:implementation\s+)?stages?\b/gi;
    let m;
    while ((m = re.exec(text))) {
      const n = parseInt(m[1], 10);
      const total = parseInt(m[2], 10);
      const expectedN = facts.automationCoverage.stagesWithActiveTooling.value;
      const expectedTotal = facts.automationCoverage.stagesMapped.value;
      if (n !== expectedN || total !== expectedTotal) {
        report(file, m.index, text, `"${m[0]}" — facts.json: ${expectedN} of ${expectedTotal} stages`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// unused-fact detection (warning only)
// ---------------------------------------------------------------------------

// Hyphen-minus, all Unicode hyphen/dash variants, and the minus sign all
// collapse to a plain "-" so "8-10" and "8–10" compare equal.
function normalizeDashes(s) {
  return s.replace(/[‐-―−]/g, '-');
}

function collectFactLeaves() {
  const leaves = [];
  for (const [key, val] of Object.entries(facts.identity)) {
    leaves.push({ path: `identity.${key}`, value: String(val.value) });
  }
  for (const [key, val] of Object.entries(facts.metrics)) {
    leaves.push({ path: `metrics.${key}`, value: String(val.value) });
  }
  for (const [key, val] of Object.entries(facts.automationCoverage)) {
    if (key === 'tools') {
      for (const tool of val.value) {
        leaves.push({ path: `automationCoverage.tools["${tool.name}"]`, value: tool.name });
      }
      continue;
    }
    leaves.push({ path: `automationCoverage.${key}`, value: String(val.value) });
  }
  return leaves;
}

// A literal full-string match is right for text facts (names, titles,
// email) but wrong for numeric ones: the same figure legitimately appears
// with different dash styles, word order, or phrasing ("60 people and 7
// product verticals" vs. "7 product verticals... 60-person"). For numeric
// facts, require every distinct number in the value to appear somewhere in
// scanned copy as its own token, rather than the whole string verbatim.
function isFactUsed(value, normalizedLowerText) {
  const normValue = normalizeDashes(value).toLowerCase();
  const numbers = normValue.match(/\d+(?:\.\d+)?/g);

  if (!numbers) {
    return normalizedLowerText.includes(normValue);
  }
  return numbers.every((n) => new RegExp(`\\b${n}\\b`).test(normalizedLowerText));
}

function checkUnusedFacts(allText) {
  const normalized = normalizeDashes(allText).toLowerCase();
  for (const leaf of collectFactLeaves()) {
    if (!isFactUsed(leaf.value, normalized)) {
      warnings.push(`fact "${leaf.path}" (value: "${leaf.value}") not found in any scanned surface — genuinely unused, or needs a copy update`);
    }
  }
}

// ---------------------------------------------------------------------------
// tool list published check (hard failure — this is the divergence guard
// item 1 asked for: facts.json's tool names must actually be the ones on
// the site, not just internally self-consistent)
// ---------------------------------------------------------------------------

function checkToolNamesPublished(contextJsText) {
  if (contextJsText === null) {
    warnings.push('context.js not found — could not verify published tool list against facts.json');
    return;
  }
  for (const tool of facts.automationCoverage.tools.value) {
    if (!contextJsText.includes(tool.name)) {
      failures.push({
        file: 'context.js',
        line: '(tool list)',
        message: `tool "${tool.name}" is in facts.json but not found in context.js's published tool list`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

let combinedText = '';
let contextJsText = null;

for (const relPath of SURFACES) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    warnings.push(`surface "${relPath}" listed but not found on disk — skipped`);
    continue;
  }
  let text = fs.readFileSync(fullPath, 'utf8');
  if (relPath.endsWith('.html')) {
    text = stripStyleBlocks(text);
  }

  checkRetiredStrings(relPath, text);
  checkTitleForm(relPath, text);
  checkVendorNames(relPath, text);
  checkMetricQualifiers(relPath, text);

  if (relPath === 'context.js') contextJsText = text;

  combinedText += '\n' + text;
}

checkToolNamesPublished(contextJsText);
checkUnusedFacts(combinedText);

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

if (failures.length) {
  console.error(`validate-facts: ${failures.length} failure(s)\n`);
  for (const f of failures) {
    console.error(`  FAIL  ${f.file}:${f.line}  ${f.message}`);
  }
} else {
  console.log('validate-facts: no failures');
}

if (warnings.length) {
  console.log(`\nvalidate-facts: ${warnings.length} warning(s)`);
  for (const w of warnings) {
    console.log(`  WARN  ${w}`);
  }
}

process.exit(failures.length ? 1 : 0);
