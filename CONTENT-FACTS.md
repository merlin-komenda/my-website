# Content Facts

Single source of truth for every factual claim on merlin-komenda.com.

Site copy is checked against this file. This file is not checked against site copy.

If a number, title, or count is not in `facts.json`, it does not go on the site.
No claim gets generated, inferred, or rounded. If it is needed and missing, add it to `facts.json` first.

Verified: 17 Aug 2026
Next review: 17 Nov 2026

---

## Identity and delivery metrics — moved

Values for identity (name, title, company, tagline, email, start date), delivery metrics, and automation coverage now live in **`facts.json`** at the repo root. That file is the source of truth for every number, title string, and count; `validate-facts.js` checks published copy against it and blocks the build on mismatch.

This file keeps everything a validator can't check: the naming policy, the vendor-neutrality rule, retired framings and why they're retired, and open editorial questions. Read both together — `facts.json` for what the values are, this file for the rules around them.

**Title must match across:** site header, all meta tags (title, og:title, twitter:title, description variants), resume PDF, LinkedIn. One value, everywhere. Use the ampersand, not "and." Do not expand it in meta tags for readability. (Resume PDF and LinkedIn are outside `validate-facts.js`'s scanned surfaces — see Open Items.)

**Retired framing: "4 of 7 phases."** The 7-phase frame no longer describes the system and is enforced as a banned string in `facts.json`. Do not restore it in any form, including as history. Preferred framing leads with the gaps, not the ratio — naming stage 9 and stage 10 as deliberately open is the credibility move. The two open stages are open on purpose and are documented as such. They are not backlog.

---

## Tooling attribution

**No vendor or model names in case study copy.** Not Claude, not ChatGPT, not GPT-4, not any successor.

Reason: model names date a case study faster than the work ages. Vendor-neutral copy stays accurate as the underlying tooling changes, which it will.

**The rule is drop the vendor, keep the mechanism.** Neutrality is not a licence for vagueness. "AI-powered automation" is the phrasing every vendor deck uses and it is weaker than what it replaces. Describe what the system does specifically enough that the vendor is irrelevant rather than merely absent.

- Avoid: "an AI-powered automation that processes client files"
- Use: "a workflow that ingests client files at scale and converts visual assets into structured inputs"

The second names no vendor and carries more information than the original did.

This also resolves a standing contradiction: the 2025 agent setup tool was described as GPT-powered in the impact log and Claude-built in the case study body. Neutral phrasing removes the conflict without needing to establish which was correct.

**Open question, decide before drafting:** whether neutrality extends to the AgentOS write-up. There the architecture is the subject rather than the delivery outcome, so naming components may be load-bearing. Not covered by this rule either way until decided.

---

## Naming and disclosure policy

**No customer names on the site.** No exceptions, no logos, no identifiable detail.

Acceptable substitutions:
- "a global CPG account"
- "a second enterprise account"
- "an enterprise customer"

Zappi is named. Zappi's customers are not.

This rule is most likely to be broken when writing up the Intake Brief, because the strongest evidence is account-specific. The pattern carries the weight, not the account.

---

## Claims that must not be made

- **AgentOS rollback or recovery safety.** The GitHub sync is not built. There is currently no rollback path for the live Notion tree. Do not imply a version-controlled safety net.
- **Any metric not listed in `facts.json`.**
- **Exact figures where the source is approximate.**

---

## Date labels

Use years, or month and year. Do not use seasonal labels ("Spring 2026") - they read as stale within a quarter and the site is not reviewed quarterly.

---

## Open items

1. **Title alignment.** The published value is set. Resume PDF and LinkedIn still need to be brought to match. Until they do, the mismatch is live on the one page a hiring manager cross-references, and it reads as inflation regardless of intent.
2. **AgentOS vendor naming.** See Tooling attribution. Decide before that copy is drafted, not during.
3. **Unwritten work.** Present in the record, absent from the site: the Intake Brief reconciliation engine, the V1-to-V2 rescope, AgentOS as a governed system, and the CSM enablement programme. None of these have approved copy yet. Do not let an automated pass generate them.
4. **Enterprise AI rollout has no case study.** The claim itself (60 people, 7 product verticals) is published and approved — it's been in the `/how-i-work/` impact log and in `context.js` all along, and is now tracked in `facts.json`. What's missing is a written case study telling that story, not approval for the underlying fact. Don't confuse "no case study yet" with "not cleared to publish."

---

## How to use this file

**Corrections pass:** reconcile site copy to this file. Values only. No tone edits, no restructuring.

**New content:** copy is authored, reviewed, then placed. Placement instructions only to an automated pass, never a brief.

**When something changes:** update this file first, then the site. Never the reverse.
