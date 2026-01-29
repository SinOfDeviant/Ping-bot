/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

export const Wiki_Page_Title = "Ping Bot";

/**
 * Wiki key that stores blacklisted users
 */
export const BlackListed = "__blacklist";

/**
 * Reserved key used internally for ping statistics
 */
export const PING_STATS_KEY = "__pingStats";

/**
 * All reserved wiki keys (cannot be group names)
 */
export const RESERVED_KEYS = new Set<string>([
  BlackListed,
  PING_STATS_KEY,
]);

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type WikiData = {
  [key: string]: string[] | Record<string, number> | undefined;
  __pingStats?: Record<string, number>;
  __blacklist?: string[];
};

/* -------------------------------------------------------------------------- */
/*                               PARSE HELPERS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Generic safe JSON parse
 */
export function safeParse<T = Record<string, any>>(content?: string): T {
  try {
    return JSON.parse(content || "{}") as T;
  } catch {
    return {} as T;
  }
}

/**
 * Wiki-specific JSON parser with logging
 */
export function safeParseWiki(content?: string): WikiData {
  try {
    return JSON.parse(content || "{}");
  } catch {
    console.warn("[WikiUtils] Corrupted wiki JSON. Resetting.");
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/*                              NORMALIZATION                                  */
/* -------------------------------------------------------------------------- */

/**
 * Normalize usernames for storage
 */
export function normalizeUser(userName: string): string {
  return userName.toLowerCase().trim();
}

/**
 * Remove empty values and duplicates
 */
export function uniqueTruthyStrings(
  values: Array<string | undefined>
): string[] {
  return Array.from(
    new Set(values.map(v => v?.trim()).filter(Boolean))
  ) as string[];
}

/* -------------------------------------------------------------------------- */
/*                              VALIDATION                                     */
/* -------------------------------------------------------------------------- */

/**
 * Ensures a group name is safe to use
 */
export function assertValidGroup(group: string): void {
  if (!group || !group.trim()) {
    throw new Error("Group name cannot be empty.");
  }

  if (RESERVED_KEYS.has(group)) {
    throw new Error(`'${group}' is a reserved group name.`);
  }

  if (group.length > 12) {
    throw new Error("Group name exceeds maximum length (12).");
  }
}
