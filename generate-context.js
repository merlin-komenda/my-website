#!/usr/bin/env node
'use strict';

/**
 * generate-context.js
 *
 * Builds context.js from two inputs:
 *   - context.narrative.txt — hand-written prose (philosophy, principles,
 *     working style, Propel26 framing, prior-role history, etc.). Never
 *     touched by this script beyond token substitution.
 *   - facts.json — every factual claim (title, metrics, tool list). This
 *     script is the only place that turns those values into sentences.
 *
 * Run via `npm run build` (see package.json). Output is context.js, which
 * carries a generated-file header and must not be hand-edited — edits go
 * in context.narrative.txt (prose) or facts.json (values), then
 * `npm run generate-context` (or `npm run build`) regenerates it.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'facts.json'), 'utf8'));
const narrative = fs.readFileSync(path.join(ROOT, 'context.narrative.txt'), 'utf8');

function numberWord(n) {
  return NUMBER_WORDS[n] || String(n);
}

// "30 days to 15" -> { start: '30', end: '15' }
function parseDayRange(value) {
  const m = value.match(/(\d+)\s*days?\s*to\s*(\d+)/i);
  if (!m) throw new Error(`generate-context: could not parse day range from timeToFirstValue "${value}"`);
  return { start: m[1], end: m[2] };
}

// "60 people, 7 product verticals" -> { people: '60', verticals: '7' }
function parseRollout(value) {
  const m = value.match(/(\d+)\s*people.*?(\d+)\s*product\s*verticals?/i);
  if (!m) throw new Error(`generate-context: could not parse enterpriseAiRollout "${value}"`);
  return { people: m[1], verticals: m[2] };
}

// "~20 hours to 8-10 hours" -> { start: '20', end: '8-10' }
function parseHourRange(value) {
  const m = value.match(/~?\s*(\d+)\s*hours?\s*to\s*([\d-]+)/i);
  if (!m) throw new Error(`generate-context: could not parse agentSetupTime "${value}"`);
  return { start: m[1], end: m[2] };
}

function buildKeyResultsBlock() {
  const m = facts.metrics;
  const ttfv = parseDayRange(m.timeToFirstValue.value);
  const rollout = parseRollout(m.enterpriseAiRollout.value);
  const hours = parseHourRange(m.agentSetupTime.value);
  const ac = facts.automationCoverage;

  const lines = [
    `${m.implementationTimeReduction.value} reduction in time-to-live; first customer usage in ${ttfv.end} days, down from ${ttfv.start}`,
    `${m.adoptionSpeed.value} adoption through scalable platform setup patterns`,
    `${m.onboardingGeneratedRevenue.value} in onboarding-generated revenue`,
    `Enterprise rollout across ${rollout.people} people and ${rollout.verticals} product verticals at a Fortune 500 company`,
    `Built AI-powered agent setup tool that cut deployment time from ~${hours.start} hours to ${hours.end}`,
    `Phase-mapped AI system deployed across ${ac.stagesWithActiveTooling.value} of ${ac.stagesMapped.value} implementation stages, with a structured pipeline for future additions`,
  ];
  return lines.map((l) => `- ${l}`).join('\n');
}

function buildToolsBlock() {
  const tools = facts.automationCoverage.tools.value;
  const intro = `${numberWord(tools.length).replace(/^./, (c) => c.toUpperCase())} active AI tools deployed across ${facts.identity.company.value}'s implementation methodology:`;
  const list = tools.map((t, i) => `${i + 1}. ${t.name} — ${t.description}`).join('\n');
  return { intro, list };
}

function generate() {
  const tools = buildToolsBlock();

  const substitutions = {
    EMAIL: facts.identity.email.value,
    TITLE: facts.identity.title.value,
    COMPANY: facts.identity.company.value,
    LOCATION: facts.identity.location.value,
    CURRENT_ROLE_START: facts.identity.currentRoleStart.value,
    IMPLEMENTATIONS_PER_YEAR: facts.metrics.implementationsPerYear.value,
    NPS: facts.metrics.nps.value,
    KEY_RESULTS_BLOCK: buildKeyResultsBlock(),
    TOOLS_INTRO: tools.intro,
    TOOLS_LIST_BLOCK: tools.list,
  };

  let body = narrative;
  for (const [token, value] of Object.entries(substitutions)) {
    body = body.split(`{{${token}}}`).join(value);
  }

  const unresolved = body.match(/\{\{[A-Z_]+\}\}/g);
  if (unresolved) {
    throw new Error(`generate-context: unresolved placeholder(s) in context.narrative.txt: ${unresolved.join(', ')}`);
  }

  // Escape backtick/backslash/${ so the narrative can't accidentally break
  // out of the template literal it gets wrapped in below.
  const escaped = body
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .trimEnd();

  const header = `// GENERATED FILE — do not edit directly.
//
// Source: context.narrative.txt (hand-written prose) + facts.json (values).
// Regenerate with: npm run generate-context  (or: npm run build)
// Edits made here will be overwritten on the next build.

`;

  return `${header}const CP_SYSTEM = \`${escaped}\`;\n`;
}

if (require.main === module) {
  const output = generate();
  fs.writeFileSync(path.join(ROOT, 'context.js'), output);
  console.log('generate-context: wrote context.js');
}

module.exports = { generate };
