/**
 * Splits a name into lowercase words: "Rahim Khan" -> ["rahim", "khan"].
 * Stored on each document and indexed (multikey), so a prefix search like
 * /^kha/ matches any word of the name and still uses the index.
 */
export function tokenize(value: string): string[] {
  const words = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return [...new Set(words)];
}

/** Escapes user input so it is matched literally inside a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a filter for the nameTokens array: every typed word must prefix-match
 * some word of the name ("rah kh" matches "Rahim Khan"). Anchored regexes use the index.
 */
export function nameTokensFilter(search: string) {
  const tokens = tokenize(search).slice(0, 5);
  if (tokens.length === 0) return undefined;
  return { $all: tokens.map((token) => new RegExp(`^${escapeRegex(token)}`)) };
}
