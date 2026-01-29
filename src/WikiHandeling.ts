import { TriggerContext, WikiPagePermissionLevel } from "@devvit/public-api";
import { Wiki_Page_Title, safeParseWiki, assertValidGroup, PING_STATS_KEY } from "./utils.js";


/* -------------------------------------------------------------------------- */
/*                         WIKI PAGE INITIALIZATION                            */
/* -------------------------------------------------------------------------- */

export async function getOrCreateWikiPage(
  subredditName: string,
  context: TriggerContext,
  defaultContent: string
) {
  try {
    return await context.reddit.getWikiPage(
      subredditName,
      Wiki_Page_Title
    );
  } catch (error: any) {
    if (
      error?.details?.includes("PAGE_NOT_CREATED") ||
      error?.message?.includes("404") ||
      error?.message?.includes("Not Found")
    ) {
      console.log(
        `[WikiHandler] Creating wiki page '${Wiki_Page_Title}'.`
      );

      await context.reddit.createWikiPage({
        subredditName,
        page: Wiki_Page_Title,
        content: defaultContent,
        reason: "Initialize ping bot storage",
      });

      await context.reddit.updateWikiPageSettings({
        subredditName,
        page: Wiki_Page_Title,
        listed: false,
        permLevel: WikiPagePermissionLevel.MODS_ONLY,
      });

      return await context.reddit.getWikiPage(
        subredditName,
        Wiki_Page_Title
      );
    }

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                          SUBSCRIPTION MANAGEMENT                            */
/* -------------------------------------------------------------------------- */

export async function addSubscriberToWiki(
  subredditName: string,
  username: string,
  group: string,
  context: TriggerContext
): Promise<void> {
  try {
    assertValidGroup(group);

    const normalizedUser = username.toLowerCase();
    const wikiPage = await getOrCreateWikiPage(subredditName, context, "{}");
    const wikiData = safeParseWiki(wikiPage.content);

    if (!Array.isArray(wikiData[group])) {
      wikiData[group] = [];
    }

    const subs = wikiData[group] as string[];

    if (subs.includes(normalizedUser)) {
      console.log(
        `[WikiHandler] '${username}' already subscribed to '${group}'.`
      );
      return;
    }

    subs.push(normalizedUser);

    await context.reddit.updateWikiPage({
      subredditName,
      pageName: Wiki_Page_Title,
      content: JSON.stringify(wikiData, null, 2),
      reason: `Add ${username} to ${group}`,
      permissionLevel: WikiPagePermissionLevel.MODS_ONLY,
    } as any);
  } catch (error) {
    console.error(
      `[WikiHandler] Failed to add '${username}' to '${group}':`,
      error
    );
  }
}

export async function removeSubscriberFromWiki(
  subredditName: string,
  username: string,
  group: string,
  context: TriggerContext
): Promise<void> {
  try {
    assertValidGroup(group);

    const normalizedUser = username.toLowerCase();
    const wikiPage = await getOrCreateWikiPage(subredditName, context, "{}");
    const wikiData = safeParseWiki(wikiPage.content);

    const subs = wikiData[group];
    if (!Array.isArray(subs)) {
      console.warn(
        `[WikiHandler] Group '${group}' does not exist.`
      );
      return;
    }

    const index = subs.indexOf(normalizedUser);
    if (index === -1) {
      console.log(
        `[WikiHandler] '${username}' not subscribed to '${group}'.`
      );
      return;
    }

    subs.splice(index, 1);

    await context.reddit.updateWikiPage({
      subredditName,
      pageName: Wiki_Page_Title,
      content: JSON.stringify(wikiData, null, 2),
      reason: `Remove ${username} from ${group}`,
      permissionLevel: WikiPagePermissionLevel.MODS_ONLY,
    } as any);
  } catch (error) {
    console.error(
      `[WikiHandler] Failed to remove '${username}' from '${group}':`,
      error
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              QUERY FUNCTIONS                                */
/* -------------------------------------------------------------------------- */

export async function getSubscribersFromGroup(
  subredditName: string,
  group: string,
  context: TriggerContext
): Promise<string[]> {
  try {
    assertValidGroup(group);

    const wikiPage = await getOrCreateWikiPage(subredditName, context, "{}");
    const wikiData = safeParseWiki(wikiPage.content);
    const subs = wikiData[group];

    return Array.isArray(subs) ? subs : [];
  } catch (error) {
    console.error(
      `[WikiHandler] Failed to fetch subscribers for '${group}':`,
      error
    );
    return [];
  }
}

export async function getSubscribersForGroups(
  subredditName: string,
  groups: string[],
  context: TriggerContext
): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  if (groups.length === 0) return result;

  try {
    const wikiPage = await getOrCreateWikiPage(subredditName, context, "{}");
    const wikiData = safeParseWiki(wikiPage.content);

    for (const group of groups) {
      result[group] = Array.isArray(wikiData[group])
        ? (wikiData[group] as string[])
        : [];
    }
  } catch (error) {
    console.error(
      "[WikiHandler] Failed to fetch subscribers for groups:",
      error
    );
    for (const group of groups) result[group] = [];
  }

  return result;
}

export async function getUserSubscriptions(
  subredditName: string,
  username: string,
  groups: string[],
  context: TriggerContext
): Promise<string[]> {
  const normalizedUser = username.toLowerCase();
  const subscribersByGroup = await getSubscribersForGroups(
    subredditName,
    groups,
    context
  );

  return groups.filter((group) =>
    (subscribersByGroup[group] || []).includes(normalizedUser)
  );
}

/* -------------------------------------------------------------------------- */
/*                               PING STATISTICS                               */
/* -------------------------------------------------------------------------- */

export async function incrementPingCount(
  subredditName: string,
  group: string,
  context: TriggerContext
): Promise<void> {
  try {
    assertValidGroup(group);

    const wikiPage = await getOrCreateWikiPage(subredditName, context, "{}");
    const wikiData = safeParseWiki(wikiPage.content);

    if (!wikiData[PING_STATS_KEY]) {
      wikiData[PING_STATS_KEY] = {};
    }

    const stats = wikiData[PING_STATS_KEY] as Record<string, number>;
    stats[group] = typeof stats[group] === "number" ? stats[group] + 1 : 1;

    await context.reddit.updateWikiPage({
      subredditName,
      pageName: Wiki_Page_Title,
      content: JSON.stringify(wikiData, null, 2),
      reason: `Increment ping count for '${group}'`,
      permissionLevel: WikiPagePermissionLevel.MODS_ONLY,
    } as any);
  } catch (error) {
    console.error(
      `[WikiHandler] Failed to increment ping count for '${group}':`,
      error
    );
  }
}

export async function getPingStatsForGroups(
  subredditName: string,
  groups: string[],
  context: TriggerContext
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (groups.length === 0) return result;

  try {
    const wikiPage = await getOrCreateWikiPage(subredditName, context, "{}");
    const wikiData = safeParseWiki(wikiPage.content);
    const stats = wikiData[PING_STATS_KEY] as Record<string, number> | undefined;

    for (const group of groups) {
      result[group] = typeof stats?.[group] === "number" ? stats[group] : 0;
    }
  } catch (error) {
    console.error(
      "[WikiHandler] Failed to fetch ping stats:",
      error
    );
    for (const group of groups) result[group] = 0;
  }

  return result;
}
