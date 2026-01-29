import { TriggerContext, WikiPagePermissionLevel } from "@devvit/public-api";
import { AppInstall, AppUpgrade } from "@devvit/protos";
import { PingSettings, getValidatedSettings } from "./UIsetting.js";
import { Wiki_Page_Title, BlackListed, safeParse, uniqueTruthyStrings } from "./utils.js";
import { getOrCreateWikiPage } from "./WikiHandeling.js";

/* -------------------------------------------------------------------------- */
/*                             APP INSTALL HANDLER                             */
/* -------------------------------------------------------------------------- */

export async function HandleAppInstall(
  event: AppInstall,
  context: TriggerContext
): Promise<void> {
  const subredditName = event.subreddit?.name;
  if (!subredditName) {
    console.error("[PingBot:Install] Missing subreddit name.");
    return;
  }

  let settings: PingSettings;
  try {
    settings = await getValidatedSettings(context);
  } catch (error) {
    console.error("[PingBot:Install] Settings validation failed:", error);
    return;
  }

  const groups = uniqueTruthyStrings([
    settings.Group1, settings.Group2, settings.Group3, settings.Group4,
    settings.Group5, settings.Group6, settings.Group7, settings.Group8,
    settings.Group9, settings.Group10, settings.Group11, settings.Group12,
  ]);

  const initialData: Record<string, any> = {};

  for (const group of groups) {
    initialData[group] = [];
  }

  initialData[BlackListed] = [];

  const newContent = JSON.stringify(initialData, null, 2);

  try {
    const wikiPage = await getOrCreateWikiPage(
      subredditName,
      context,
      newContent
    );

    const existingData = safeParse(wikiPage.content);

    const needsUpdate =
      JSON.stringify(existingData) !== JSON.stringify(initialData);

    if (needsUpdate) {
      await context.reddit.updateWikiPage({
        subredditName,
        pageName: Wiki_Page_Title,
        content: newContent,
        reason: "Initialize Ping Bot data structure",
        permissionLevel: WikiPagePermissionLevel.MODS_ONLY,
      } as any);

      console.log("[PingBot:Install] Wiki initialized/updated.");
    } else {
      console.log("[PingBot:Install] Wiki already initialized.");
    }
  } catch (error) {
    console.error("[PingBot:Install] Wiki initialization failed:", error);
  }
}

/* -------------------------------------------------------------------------- */
/*                             APP UPGRADE HANDLER                             */
/* -------------------------------------------------------------------------- */

export async function HandleAppUpgrade(
  event: AppUpgrade,
  context: TriggerContext
): Promise<void> {
  const subredditName = event.subreddit?.name;
  if (!subredditName) {
    console.error("[PingBot:Upgrade] Missing subreddit name.");
    return;
  }

  let settings: PingSettings;
  try {
    settings = await getValidatedSettings(context);
  } catch (error) {
    console.error("[PingBot:Upgrade] Settings validation failed:", error);
    return;
  }

  try {
    const wikiPage = await getOrCreateWikiPage(
      subredditName,
      context,
      "{}"
    );

    const data = safeParse(wikiPage.content);

    const groups = uniqueTruthyStrings([
      settings.Group1, settings.Group2, settings.Group3, settings.Group4,
      settings.Group5, settings.Group6, settings.Group7, settings.Group8,
      settings.Group9, settings.Group10, settings.Group11, settings.Group12,
    ]);

    let mutated = false;

    for (const group of groups) {
      if (!Array.isArray(data[group])) {
        data[group] = [];
        mutated = true;
        console.log(`[PingBot:Upgrade] Added missing group '${group}'.`);
      }
    }

    if (!Array.isArray(data[BlackListed])) {
      data[BlackListed] = [];
      mutated = true;
      console.log("[PingBot:Upgrade] Added missing blacklist.");
    }

    if (mutated) {
      await context.reddit.updateWikiPage({
        subredditName,
        pageName: Wiki_Page_Title,
        content: JSON.stringify(data, null, 2),
        reason: "Upgrade Ping Bot wiki structure",
        permissionLevel: WikiPagePermissionLevel.MODS_ONLY,
      } as any);

      console.log("[PingBot:Upgrade] Wiki upgraded successfully.");
    } else {
      console.log("[PingBot:Upgrade] Wiki already up-to-date.");
    }
  } catch (error) {
    console.error("[PingBot:Upgrade] Wiki upgrade failed:", error);
  }
}
