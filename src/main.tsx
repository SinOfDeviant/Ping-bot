import { Devvit, useState, TriggerContext } from "@devvit/public-api";
import { PingSettingsFields, getValidatedSettings, PingSettings } from "./UIsetting.js";
import { HandleAppInstall, HandleAppUpgrade } from "./InstallandUpgradeHandler.js";
import { SubscriptionHandler } from "./SubscriptionHandler.js";
import { UnsubscribeHandler } from "./UnsubscribeHandler.js";
import { handleBlacklistMenu } from "./blacklistHandler.js";
import { PingHandler } from "./PingHandler.js";
import {
  addSubscriberToWiki,
  removeSubscriberFromWiki,
  getSubscribersForGroups,
  getUserSubscriptions,
  getPingStatsForGroups,
} from "./WikiHandeling.js";

Devvit.configure({redditAPI: true})

// ========== Settings Definition ==========
Devvit.addSettings(PingSettingsFields);

// ========== Install and Upgrade Handlers ==========
Devvit.addTrigger({
  event: "AppInstall",
  onEvent: HandleAppInstall,
});

Devvit.addTrigger({
  event: "AppUpgrade",
  onEvent: HandleAppUpgrade,
});
Devvit.addTrigger({
  event: "CommentSubmit",
  onEvent: SubscriptionHandler,
});

Devvit.addTrigger({
  event: "CommentSubmit",
  onEvent: PingHandler,
});

Devvit.addTrigger({
  event: "CommentSubmit",
  onEvent: UnsubscribeHandler,
});

Devvit.addMenuItem({
  label: "Blacklist user from Ping Bot",
  description: "User will not be able to ping or receive pings",
  location: "comment",
  forUserType: "moderator",
  onPress: handleBlacklistMenu,
});   

const createPost = async (context: Devvit.Context | TriggerContext) => {
  const { reddit } = context;
  const subreddit = await reddit.getCurrentSubreddit();
  const post = await reddit.submitPost({
    title: "Ping Group Subscriptions",
    subredditName: subreddit.name,
    // The preview appears while the post loads
    preview: (
      <vstack height="100%" width="100%" alignment="middle center">
        <text size="large">Loading ping groups…</text>
      </vstack>
    ),
  });

  return post;
};

Devvit.addMenuItem({
  label: "Create Ping Bot subscription post",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_event, context) => {
    const { ui } = context;
    ui.showToast(
      "Submitting your Ping Group Subscriptions post - you'll be navigated there when it's ready."
    );

    const post = await createPost(context);

    ui.navigateTo(post);
  },
});

Devvit.addTrigger({
  events: ["AppInstall"],
  onEvent: async (event, context) => {
    await createPost(context);
  },
});

/**
 * Custom post type that displays all ping groups with subscription management UI.
 * Users can join/leave groups directly from the post.
 */
Devvit.addCustomPostType({
  name: "Ping Group Subscriptions",
  height: "tall",
  render: (context) => {
    const { reddit, ui } = context;

    type DataState = {
      error?: string;
      username?: string;
      subredditName?: string;
      groups?: string[];
      subscribersByGroup?: Record<string, string[]>;
      userGroups?: string[];
      pingStats?: Record<string, number>;
    };

    const [data] = useState(async (): Promise<DataState> => {
      try {
        const me = await reddit.getCurrentUser();
        const subreddit = await reddit.getCurrentSubreddit();

        if (!me) {
          return { error: "Unable to load user information. Please refresh the page." };
        }

        const username = (me as any).username || (me as any).name || "Unknown";

        let settings: PingSettings;
        try {
          if ('settings' in context && context.settings && typeof context.settings.getAll === 'function') {
            const rawSettings = await context.settings.getAll() as PingSettings;
            if (!rawSettings.enablePingBot && rawSettings.enableGroup1) {
              throw new Error("Cannot enable Group 1 when Ping Bot is disabled.");
            }
            settings = rawSettings;
          } else {
            settings = await getValidatedSettings(context as TriggerContext);
          }
        } catch (err) {
          return { error: `Failed to load bot settings: ${err instanceof Error ? err.message : String(err)}` };
        }

        const rawGroups = [
        settings.enableGroup1 ? settings.Group1 : undefined,
        settings.enableGroup2 ? settings.Group2 : undefined,
        settings.enableGroup3 ? settings.Group3 : undefined,
        settings.enableGroup4 ? settings.Group4 : undefined,
        settings.enableGroup5 ? settings.Group5 : undefined,
        settings.enableGroup6 ? settings.Group6 : undefined,
        settings.enableGroup7 ? settings.Group7 : undefined,
        settings.enableGroup8 ? settings.Group8 : undefined,
        settings.enableGroup9 ? settings.Group9 : undefined,
        settings.enableGroup10 ? settings.Group10 : undefined,
        settings.enableGroup11 ? settings.Group11 : undefined,
        settings.enableGroup12 ? settings.Group12 : undefined,
        ]
          .filter(Boolean)
          .map((g) => g!.toLowerCase().trim());

        const groups = Array.from(new Set(rawGroups));

        if (groups.length === 0) {
          return { username, groups: [], subscribersByGroup: {}, userGroups: [], pingStats: {} };
        }

        const [subscribersByGroup, userGroups, pingStats] = await Promise.all([
          getSubscribersForGroups(subreddit.name, groups, context as TriggerContext),
          getUserSubscriptions(
            subreddit.name,
            username,
            groups,
            context as TriggerContext
          ),
          getPingStatsForGroups(
            subreddit.name,
            groups,
            context as TriggerContext
          ),
        ]);

        return {
          username,
          subredditName: subreddit.name,
          groups,
          subscribersByGroup,
          userGroups,
          pingStats,
        };
      } catch (error) {
        return { error: `Error loading data: ${error instanceof Error ? error.message : String(error)}` };
      }
    });

    if (!data || typeof data !== 'object') {
      return (
        <vstack padding="large" gap="medium" alignment="center middle" height="100%">
          <text size="large" weight="bold">
            Ping Group Subscriptions
          </text>
          <text color="secondary">Loading ping groups...</text>
        </vstack>
      );
    }

    const dataState = data as DataState;

    if (dataState.error) {
      return (
        <vstack padding="medium" gap="small">
          <text size="large" weight="bold">
            Ping Group Subscriptions
          </text>
          <text color="error">{dataState.error}</text>
        </vstack>
      );
    }

    const { username, subredditName, groups, subscribersByGroup, userGroups, pingStats } = dataState;

    if (!username || !subredditName || !groups || !subscribersByGroup || !userGroups || !pingStats) {
      return (
        <vstack padding="medium" gap="small">
          <text size="large" weight="bold">
            Ping Group Subscriptions
          </text>
          <text>Loading data...</text>
        </vstack>
      );
    }

    const totalSubscriptions = userGroups.length;

    if (groups.length === 0) {
      return (
        <vstack padding="medium" gap="small">
          <text size="large" weight="bold">
            Ping Group Subscriptions
          </text>
          <text>{`u/${username}`}</text>
          <text>
            No ping groups are configured yet. A moderator can add them in the
            app settings.
          </text>
        </vstack>
      );
    }

    return (
      <vstack padding="medium" gap="medium" height="100%" width="100%">
        <vstack gap="small">
          <text size="large" weight="bold">
            Ping Group Subscriptions
          </text>
          <text size="small">{`/u/${username}`}</text>
          <text size="xsmall" color="secondary">
            {totalSubscriptions === 0
              ? "0 subscriptions"
              : `${totalSubscriptions} subscription${totalSubscriptions === 1 ? "" : "s"}`}
          </text>
        </vstack>

        <vstack gap="small">
          {groups.map((groupKey: string) => {
            const subscribers = subscribersByGroup[groupKey] || [];
            const isMember = subscribers.some(
              (u: string) => u.toLowerCase() === username.toLowerCase()
            );
            const displayName = groupKey.toUpperCase();
            const pingCount = pingStats[groupKey] ?? 0;
            const subscriberCount = subscribers.length;

            return (
              <hstack
                key={groupKey}
                alignment="middle"
                padding="small"
              >
                <vstack grow>
                  <text size="small" weight="bold">{displayName}</text>
                  <text size="xsmall" color="secondary">
                    {pingCount > 0
                      ? `${subscriberCount} subscribers   ${pingCount} recent pings`
                      : `${subscriberCount} subscribers`}
                  </text>
                </vstack>

                <button
                  appearance={isMember ? "secondary" : "primary"}
                  onPress={async () => {
                    try {
                      if (isMember) {
                        await removeSubscriberFromWiki(
                          subredditName,
                          username,
                          groupKey,
                          context as TriggerContext
                        );
                        ui.showToast(
                          `You left the ${displayName} ping group. Refresh to see updated counts.`
                        );
                      } else {
                        await addSubscriberToWiki(
                          subredditName,
                          username,
                          groupKey,
                          context as TriggerContext
                        );
                        ui.showToast(
                          `You joined the ${displayName} ping group. Refresh to see updated counts.`
                        );
                      }
                    } catch (err) {
                      ui.showToast("Something went wrong. Please try again.");
                    }
                  }}
                >
                  {isMember ? "Leave" : "Join"}
                </button>
              </hstack>
            );
          })}
        </vstack>

        <hstack alignment="start" padding="small">
          <text size="xsmall" color="secondary">
            {`${groups.length} Ping Group${groups.length === 1 ? "" : "s"}`}
          </text>
        </hstack>
      </vstack>
    );
  },
});


export default Devvit;