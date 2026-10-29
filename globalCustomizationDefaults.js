// Helpers for storing owner-approved text edits as the shared defaults for every user.
export function cloneValue(value) { return JSON.parse(JSON.stringify(value)); }

function setObjectPath(target, path, value) {
  const parts = String(path).split('.').filter(Boolean);
  if (!parts.length) return;
  let current = target;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function getObjectPath(target, path) {
  return String(path).split('.').filter(Boolean).reduce((value, part) => value == null ? undefined : value[part], target);
}

function collectStringPaths(value, prefix = '', output = {}) {
  if (typeof value === 'string') { if (prefix) output[prefix] = value; return output; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
  for (const [key, child] of Object.entries(value)) collectStringPaths(child, prefix ? `${prefix}.${key}` : key, output);
  return output;
}

export function getCustomizationDefaults(db, defaultCustomization) {
  const defaults = cloneValue(defaultCustomization);
  for (const [path, value] of Object.entries(db.globalCustomizationDefaults || {})) {
    if (typeof value === 'string') setObjectPath(defaults, path, value);
  }
  return defaults;
}


export function applyGlobalDefaultsToCustomization(customization, db) {
  for (const [path, value] of Object.entries(db.globalCustomizationDefaults || {})) {
    if (typeof value === 'string') setObjectPath(customization, path, value);
  }
  return customization;
}

export function applyGlobalCustomizationChange(db, defaultCustomization, kind, from, to) {
  db.customizations ||= {};
  db.globalCustomizationDefaults ||= {};
  const isButton = kind === 'button';
  const defaultLeaves = collectStringPaths(defaultCustomization);
  const paths = new Set(Object.keys(defaultLeaves));
  for (const customization of Object.values(db.customizations)) {
    for (const path of Object.keys(collectStringPaths(customization))) paths.add(path);
  }
  const replacement = value => String(value).split(from).join(to);
  let affected = 0;
  for (const path of paths) {
    if (isButton ? !path.startsWith('labels.') : path.startsWith('labels.')) continue;
    const base = defaultLeaves[path];
    const savedValues = Object.values(db.customizations)
      .map(customization => getObjectPath(customization, path))
      .filter(value => typeof value === 'string');
    const matching = [base, ...savedValues].filter(value => typeof value === 'string' && (value === from || value.includes(from)));
    if (!matching.length) continue;

    let newDefault;
    if (typeof base === 'string' && (base === from || base.includes(from))) newDefault = replacement(base);
    else {
      // Older saved customization may hold a previous version of the displayed default.
      const exact = matching.find(value => value === from);
      newDefault = replacement(exact || matching[0]);
    }
    db.globalCustomizationDefaults[path] = newDefault;
    affected++;
    for (const customization of Object.values(db.customizations)) {
      const value = getObjectPath(customization, path);
      if (typeof value === 'string' && (value === from || value.includes(from))) setObjectPath(customization, path, replacement(value));
      // The owner-approved value takes precedence over older per-user values at this path.
      setObjectPath(customization, path, newDefault);
    }
  }
  return affected;
}
