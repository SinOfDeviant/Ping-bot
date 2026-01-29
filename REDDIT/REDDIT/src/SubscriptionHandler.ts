import { TriggerContext } from "@devvit/public-api";
import { CommentSubmit } from "@devvit/protos";
import { PingSettings, getValidatedSettings } from "./UIsetting.js";
import { addSubscriberToWiki } from "./WikiHandeling.js";

/**
 * Handles !subscribe <group> commands in comments.
 * Adds user to the group, sends confirmation comment and PM.
 */
export async function SubscriptionHandler(event: CommentSubmit, context: TriggerContext): Promise<void> {
  const subredditName = event.subreddit?.name;
  const authorId = event.author?.id;
  const authorName = event.author?.name;
  const commentId = event.comment?.id;
  const commentBody = event.comment?.body;
  const lowerCaseComment = commentBody?.toLowerCase().trim() || "";

  if (!subredditName || !authorId || !authorName || !commentId || !commentBody) {
    console.error("[SubscriptionHandler] Missing required event data.");
    return;
  }

  let settings: PingSettings;
  try {
    settings = await getValidatedSettings(context);
  } catch (err) {
    console.error("[SubscriptionHandler] Failed to load settings:", err);
    return;
  }

  if (!settings.enablePingBot) {
    console.log("[SubscriptionHandler] Ping Bot is disabled. Skipping comment processing.");
    return;
  }

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
    .map((g) => g.toLowerCase().trim());

  for (const group of groups) {
    if (lowerCaseComment === `!subscribe ${group}`) {
      try {
        await addSubscriberToWiki(subredditName, authorName, group, context);

        await context.reddit.submitComment({
          id: commentId,
          text: `You have been successfully subscribed to the **${group}** group! 🎉\n\nTo unsubscribe, comment \`!unsubscribe ${group}\` or check the Ping Bot Post.`,
          runAs: "APP",
        });

        await context.reddit.sendPrivateMessage({
          to: authorName,
          subject: "Subscription Confirmation",
          text: `Hi u/${authorName},\nYou have been successfully subscribed to the **${group}** group in r/${subredditName}.\n\nTo leave, simply comment \`!unsubscribe ${group}\` or check the Ping Bot Post.`,
        });

        console.log(`[SubscriptionHandler] User '${authorName}' subscribed to group '${group}' in subreddit '${subredditName}'.`);
      } catch (err) {
        console.error(`[SubscriptionHandler] Failed to subscribe '${authorName}' to group '${group}':`, err);
      }
      break; // Stop after first valid match
    }
  }
}
