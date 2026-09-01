// Pure compatibility-manifest and upstream-drift logic.
// Shared by scripts/verify-plugin.mjs (CI gate), scripts/drift-check.mjs
// (nightly governance) and the unit tests. No network, no filesystem —
// callers pass parsed data in so every branch is testable offline.

export const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Parse an x.y.z(-prerelease)(+build) string into comparable parts.
// Returns null for anything non-SEMVER (callers decide what 'unknown' means).
function parseSemver(v) {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!m) return null;
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : null };
}

// SemVer-aware comparison (numeric, not lexicographic: 0.10.0 > 0.9.0).
// Build metadata is ignored; prerelease handling follows SemVer 2.0.0
// (no prerelease > any prerelease of the same core).
// Returns -1 | 0 | 1, or null when either input is not a valid version.
export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] < pb.core[i] ? -1 : 1;
  }
  if (pa.pre === null && pb.pre === null) return 0;
  if (pa.pre === null) return 1; // stable release outranks prerelease
  if (pb.pre === null) return -1;
  const len = Math.max(pa.pre.length, pb.pre.length);
  for (let i = 0; i < len; i++) {
    const x = pa.pre[i], y = pb.pre[i];
    if (x === undefined) return -1; // fewer identifiers = lower precedence
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny) { if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1; }
    else if (nx !== ny) return nx ? -1 : 1; // numeric < alphanumeric
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// Compares an installed artifact version against ITS OWN upstream source.
//   installed < latest → 'outdated' · equal → 'current' · installed > latest → 'ahead'
// Anything unreadable/malformed → 'unknown' (never a false 'outdated').
// 'ahead' is newer than upstream (e.g. dist-tag lag) — NOT a failure.
// Used separately for the remotion package and the skills package — a version
// difference between the two artifacts is normal, not an error.
export function versionStatus(installed, latest) {
  const c = compareSemver(installed, latest);
  if (c === null) return 'unknown';
  return c < 0 ? 'outdated' : c === 0 ? 'current' : 'ahead';
}

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
//   low     — version-only upward movement, same major, skill set unchanged
//   high    — major bump, any skill added/removed/renamed, OR upstream moved
//             BELOW the recorded baseline (version regression)
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

  const regression = (artifact, recordedV, upstreamV) => {
    reasons.push(
      `UPSTREAM VERSION REGRESSION DETECTED (${artifact})\n` +
      `Recorded baseline: ${recordedV}\nObserved upstream: ${upstreamV}\n` +
      'No automatic downgrade will be proposed.');
  };

  let level = 'none';
  const remCmp = compareSemver(upstream.remotion, recorded.remotion.tested);
  if (remCmp < 0) {
    level = 'high';
    regression('Remotion', recorded.remotion.tested, upstream.remotion);
  } else if (remCmp > 0) {
    level = majorOf(upstream.remotion) !== majorOf(recorded.remotion.tested) ? 'high' : 'low';
    reasons.push(`Remotion ${recorded.remotion.tested} → ${upstream.remotion}`);
  }

  const skCmp = compareSemver(upstream.skillsVersion, recorded.skills.tested);
  if (skCmp < 0) {
    level = 'high';
    regression('official skills', recorded.skills.tested, upstream.skillsVersion);
  } else if (skCmp > 0) {
    level = level === 'high' ? 'high'
      : majorOf(upstream.skillsVersion) !== majorOf(recorded.skills.tested) ? 'high' : 'low';
    reasons.push(`Official skills ${recorded.skills.tested} → ${upstream.skillsVersion}`);
  }

  if (added.length || removed.length) level = 'high';
  if (level === 'none') reasons.push('upstream matches the recorded compatibility baseline');
  return { level, reasons, added, removed };
}
