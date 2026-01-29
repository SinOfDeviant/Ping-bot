import { TriggerContext } from "@devvit/public-api";
import { CommentSubmit } from "@devvit/protos";
import { PingSettings, getValidatedSettings } from "./UIsetting.js";
import { isBlacklisted } from "./blacklistHandler.js";
import {
  getSubscribersFromGroup,
  incrementPingCount,
} from "./WikiHandeling.js";

/**
 * Handles !ping <group> commands in comments.
 * Validates subscription, sends pings, and updates stats.
 */
export async function PingHandler(
  event: CommentSubmit,
  context: TriggerContext
): Promise<void> {
  const subredditName = event.subreddit?.name;
  const authorName = event.author?.name;
  const commentId = event.comment?.id;
  const commentBody = event.comment?.body;
  const permalink = event.post?.permalink;

  if (!subredditName || !authorName || !commentId || !commentBody || !permalink) {
    console.error("[PingHandler] Missing required event data.");
    return;
  }

  const lowerCaseComment = commentBody.toLowerCase().trim();
  const normalizedAuthor = authorName.toLowerCase();
  const postLink = `https://www.reddit.com${permalink}`;

  /* ---------------------------------------------------------------------- */
  /*                               SETTINGS                                  */
  /* ---------------------------------------------------------------------- */

  let settings: PingSettings;
  try {
    settings = await getValidatedSettings(context);
  } catch (err) {
    console.error("[PingHandler] Failed to load settings:", err);
    return;
  }

  if (!settings.enablePingBot) return;

  /* ---------------------------------------------------------------------- */
  /*                             BLACKLIST CHECK                              */
  /* ---------------------------------------------------------------------- */

  if (await isBlacklisted(subredditName, authorName, context)) {
    console.log(`[PingHandler] Blacklisted user: ${authorName}`);
    return;
  }

  /* ---------------------------------------------------------------------- */
  /*                            GROUP MATCHING                                */
  /* ---------------------------------------------------------------------- */

  const groups = [
    settings.Group1,
    settings.Group2,
    settings.Group3,
    settings.Group4,
    settings.Group5,
    settings.Group6,
    settings.Group7,
    settings.Group8,
    settings.Group9,
    settings.Group10,
    settings.Group11,
    settings.Group12,
  ]
    .filter(Boolean)
    .map((g) => g!.toLowerCase().trim());

  for (const group of groups) {
    if (lowerCaseComment !== `!ping ${group}`) continue;

    try {
      const subscribers = await getSubscribersFromGroup(
        subredditName,
        group,
        context
      );

      if (subscribers.length === 0) {
        await context.reddit.submitComment({
          id: commentId,
          text: `No subscribers found in the **${group}** group.`,
          runAs: "APP",
        });
        return;
      }

      if (
        !subscribers.some(
          (u) => u.toLowerCase() === normalizedAuthor
        )
      ) {
        await context.reddit.submitComment({
          id: commentId,
          text: `You are not subscribed to **${group}**.\n\nSubscribe using \`!subscribe ${group}\` first.`,
          runAs: "APP",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /*                             SEND PING                               */
      /* ------------------------------------------------------------------ */

      const mentions = subscribers
        .filter((u) => u.toLowerCase() !== normalizedAuthor)
        .map((u) => `u/${u}`)
        .join(" ");

      const pingMessage =
        `**Ping Alert – ${group}**\n\n` +
        `Ping sent by u/${authorName} in r/${subredditName}\n\n` +
        `${postLink}\n\n` +
        mentions;

      await context.reddit.submitComment({
        id: commentId,
        text: pingMessage,
        runAs: "APP",
      });

      await incrementPingCount(subredditName, group, context);

      console.log(
        `[PingHandler] Ping sent by '${authorName}' to '${group}' (${subscribers.length} users)`
      );

      return;
    } catch (err) {
      console.error(
        `[PingHandler] Failed to process ping for '${group}':`,
        err
      );
      return;
    }
  }
}
