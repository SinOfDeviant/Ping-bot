import {
  Context,
  TriggerContext,
  WikiPagePermissionLevel,
} from "@devvit/public-api";
import { Wiki_Page_Title, BlackListed } from "./utils.js";

type WikiData = Record<string, string[]>;

function safeParseWiki(content?: string): WikiData {
  try {
    return JSON.parse(content || "{}");
  } catch {
    return {};
  }
}

const normalize = (u: string) => u.toLowerCase().trim();

export async function isBlacklisted(
  subreddit: string,
  user: string,
  context: Context | TriggerContext
): Promise<boolean> {
  const wiki = await context.reddit.getWikiPage(subreddit, Wiki_Page_Title);
  const data = safeParseWiki(wiki?.content);
  return (data[BlackListed] ?? []).includes(normalize(user));
}

export async function handleBlacklistMenu(
  event: any,
  context: Context
) {
  const subreddit = context.subredditName;
  const user = event.targetAuthor?.name;

  if (!subreddit || !user) return;

  if (await isBlacklisted(subreddit, user, context)) {
    context.ui.showToast(`u/${user} is already blacklisted.`);
    return;
  }

  const wiki = await context.reddit.getWikiPage(subreddit, Wiki_Page_Title);
  const data = safeParseWiki(wiki?.content);

  data[BlackListed] ??= [];
  data[BlackListed].push(normalize(user));

  await context.reddit.updateWikiPage({
    subredditName: subreddit,
    pageName: Wiki_Page_Title,
    content: JSON.stringify(data, null, 2),
    reason: `Blacklist u/${user}`,
    permissionLevel: WikiPagePermissionLevel.MODS_ONLY,
  } as any);

  context.ui.showToast(`u/${user} blacklisted.`);
}
