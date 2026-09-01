// Pure compatibility-manifest and upstream-drift logic.
// Shared by scripts/verify-plugin.mjs (CI gate), scripts/drift-check.mjs
// (nightly governance) and the unit tests. No network, no filesystem —
// callers pass parsed data in so every branch is testable offline.

export const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validates compatibility/remotion.json. Returns a list of problems
// (empty = valid). The manifest records the last VERIFIED upstream baseline;
// it is the canonical machine-readable source for every version claim.
export function validateManifest(manifest) {
  if (manifest == null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['compatibility manifest must be a JSON object'];
  }
  const errors = [];

  const remotion = manifest.remotion;
  if (remotion == null || typeof remotion !== 'object' || Array.isArray(remotion)) {
    errors.push('remotion: object required');
  } else if (typeof remotion.tested !== 'string' || !SEMVER_RE.test(remotion.tested)) {
    errors.push('remotion.tested: semver string required');
  }

  const skills = manifest.skills;
  if (skills == null || typeof skills !== 'object' || Array.isArray(skills)) {
    errors.push('skills: object required');
  } else {
    if (typeof skills.tested !== 'string' || !SEMVER_RE.test(skills.tested)) {
      errors.push('skills.tested: semver string required');
    }
    if (!Number.isInteger(skills.count) || skills.count < 1) {
      errors.push('skills.count: positive integer required');
    }
    if (!Array.isArray(skills.names) || skills.names.length === 0) {
      errors.push('skills.names: non-empty string array required');
    } else {
      if (Number.isInteger(skills.count) && skills.count !== skills.names.length) {
        errors.push(`skills.count (${skills.count}) must equal skills.names length (${skills.names.length})`);
      }
      const seen = new Set();
      for (const name of skills.names) {
        if (typeof name !== 'string' || name === '') {
          errors.push('skills.names: every entry must be a non-empty string');
          break;
        }
        if (seen.has(name)) errors.push(`skills.names: duplicate entry "${name}"`);
        seen.add(name);
      }
    }
  }

  if (manifest.mediabunny != null) {
    const mb = manifest.mediabunny;
    if (typeof mb !== 'object' || Array.isArray(mb) || typeof mb.tested !== 'string' || !SEMVER_RE.test(mb.tested)) {
      errors.push('mediabunny.tested: semver string required (or omit mediabunny)');
    }
  }
  if (manifest.verifiedAt != null && (typeof manifest.verifiedAt !== 'string' || !DATE_RE.test(manifest.verifiedAt))) {
    errors.push('verifiedAt: YYYY-MM-DD string required (or omit)');
  }
  return errors;
}

// Every skill recorded in the manifest must appear in the router skill's
// routing guidance, so a manifest entry can never exist without routing
// coverage. `routingText` is the full text of skills/remotion/SKILL.md.
export function checkRouterCoverage(names, routingText) {
  return (names ?? []).filter((n) => typeof n === 'string' && !routingText.includes(n));
}

const majorOf = (v) => Number.parseInt(String(v).split('.')[0], 10);

export const compareSkillNames = (recorded, upstream) => ({
  added: upstream.filter((n) => !recorded.includes(n)),
  removed: recorded.filter((n) => !upstream.includes(n)),
});

// Classifies drift between the recorded baseline and freshly observed upstream
// state. `upstream` = { remotion, skillsVersion, skillNames } (null fields mean
// the observation failed). Levels:
//   none    — identical versions and skill topology
//   low     — version-only movement, same major, skill set unchanged
//   high    — major bump, or any skill added/removed/renamed (topology change)
//   unknown — upstream observation unusable (malformed/failed fetch)
export function classifyDrift(recorded, upstream) {
  const usable = upstream != null && typeof upstream === 'object' &&
    typeof upstream.remotion === 'string' && SEMVER_RE.test(upstream.remotion) &&
    typeof upstream.skillsVersion === 'string' && SEMVER_RE.test(upstream.skillsVersion) &&
    Array.isArray(upstream.skillNames) && upstream.skillNames.every((n) => typeof n === 'string' && n !== '');
  if (!usable) {
    return { level: 'unknown', reasons: ['upstream state unreadable or malformed — nothing to compare'] };
  }

  const reasons = [];
  const { added, removed } = compareSkillNames(recorded.skills.names, upstream.skillNames);
  for (const n of added) reasons.push(`NEW UPSTREAM SKILL DETECTED: ${n} — routing coverage missing`);
  for (const n of removed) reasons.push(`UPSTREAM SKILL REMOVED/RENAMED: ${n}`);

  let level = 'none';
  if (majorOf(upstream.remotion) !== majorOf(recorded.remotion.tested)) {
    level = 'high';
    reasons.push(`Remotion major version changed: ${recorded.remotion.tested} → ${upstream.remotion}`);
  } else if (upstream.remotion !== recorded.remotion.tested) {
    level = 'low';
    reasons.push(`Remotion ${recorded.remotion.tested} → ${upstream.remotion}`);
  }

  if (upstream.skillsVersion !== recorded.skills.tested) {
    if (majorOf(upstream.skillsVersion) !== majorOf(recorded.skills.tested)) {
      level = 'high';
      reasons.push(`Official skills major version changed: ${recorded.skills.tested} → ${upstream.skillsVersion}`);
    } else if (level !== 'high') {
      level = 'low';
    }
    if (!reasons.some((r) => r.startsWith('Official skills major'))) {
      reasons.push(`Official skills ${recorded.skills.tested} → ${upstream.skillsVersion}`);
    }
  }

  if (added.length || removed.length) level = 'high';
  if (level === 'none') reasons.push('upstream matches the recorded compatibility baseline');
  return { level, reasons, added, removed };
}
