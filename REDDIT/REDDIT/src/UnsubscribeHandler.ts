import { TriggerContext } from "@devvit/public-api";
import { CommentSubmit } from "@devvit/protos";
import { PingSettings, getValidatedSettings } from "./UIsetting.js";
import { removeSubscriberFromWiki } from "./WikiHandeling.js";

/**
 * Handles !unsubscribe <group> commands in comments.
 * Removes user from the group, sends confirmation comment and PM.
 */
export async function UnsubscribeHandler(event: CommentSubmit, context: TriggerContext): Promise<void> {
  const subredditName = event.subreddit?.name;
  const authorId = event.author?.id;
  const authorName = event.author?.name;
  const commentId = event.comment?.id;
  const commentBody = event.comment?.body;
  const lowerCaseComment = commentBody?.toLowerCase().trim() || "";

  if (!subredditName || !authorId || !authorName || !commentId || !commentBody) {
    console.error("[UnsubscriptionHandler] Missing required event data.");
    return;
  }

  let settings: PingSettings;
  try {
    settings = await getValidatedSettings(context);
  } catch (err) {
    console.error("[UnsubscriptionHandler] Failed to load settings:", err);
    return;
  }

  if (!settings.enablePingBot) {
    console.log("[UnsubscriptionHandler] Ping Bot is disabled. Skipping comment processing.");
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
    if (lowerCaseComment === `!unsubscribe ${group}`) {
      try {
        await removeSubscriberFromWiki(subredditName, authorName, group, context);
        await context.reddit.submitComment({id: commentId, text: `You have been unsubscribed from the ${group} group. \n if you rejoin then type '!subscribe <Group>' or check Ping Bot Post`, runAs: "APP"});
        await context.reddit.sendPrivateMessage({to: authorName, subject: "Unsubscription Confirmation", text: `You have been successfully unsubscribed from the '${group}' group in r/${subredditName}. If you wish to rejoin, please comment '!subscribe ${group}' or Check Ping Bot Post.`});
        console.log(`[UnsubscriptionHandler] User '${authorName}' unsubscribed from group '${group}' in subreddit '${subredditName}'.`);
      } catch (err) {
        console.error(`[UnsubscriptionHandler] Failed to unsubscribe '${authorName}' from group '${group}':`, err);
      }
      break; 
    }
  }
}
