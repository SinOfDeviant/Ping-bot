import { SettingsFormField, TriggerContext } from "@devvit/public-api";

const RESERVED_GROUP_NAMES = new Set(["__pingStats"]);
const MAX_GROUPS = 12;

/* -------------------------------------------------------------------------- */
/*                                SETTINGS TYPE                                */
/* -------------------------------------------------------------------------- */

export type PingSettings = {
  enablePingBot: boolean;

  enableGroup1: boolean; Group1: string;
  enableGroup2: boolean; Group2: string;
  enableGroup3: boolean; Group3: string;
  enableGroup4: boolean; Group4: string;
  enableGroup5: boolean; Group5: string;
  enableGroup6: boolean; Group6: string;
  enableGroup7: boolean; Group7: string;
  enableGroup8: boolean; Group8: string;
  enableGroup9: boolean; Group9: string;
  enableGroup10: boolean; Group10: string;
  enableGroup11: boolean; Group11: string;
  enableGroup12: boolean; Group12: string;
};

/* -------------------------------------------------------------------------- */
/*                             VALIDATION HELPERS                              */
/* -------------------------------------------------------------------------- */

function textFieldIsUnderLimit(
  input: { value: string | undefined },
  maxLength: number
): string | undefined {
  const text = input.value?.trim();
  if (text && text.length > maxLength) {
    return `Text too long: ${text.length}/${maxLength}`;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/*                         SETTINGS VALIDATION LOGIC                            */
/* -------------------------------------------------------------------------- */

export async function getValidatedSettings(
  context: TriggerContext
): Promise<PingSettings> {
  const settings = await context.settings.getAll() as PingSettings;

  for (let i = 1; i <= MAX_GROUPS; i++) {
    const enableKey = `enableGroup${i}` as keyof PingSettings;
    const nameKey = `Group${i}` as keyof PingSettings;

    const enabled = settings[enableKey] as boolean;
    const name = typeof settings[nameKey] === 'string' ? settings[nameKey].trim() : undefined;

    if (!settings.enablePingBot && enabled) {
      throw new Error(`Cannot enable Group ${i} when Ping Bot is disabled.`);
    }

    if (enabled && !name) {
      throw new Error(`Group ${i} is enabled but has no name.`);
    }

    if (name && RESERVED_GROUP_NAMES.has(name)) {
      throw new Error(`'${name}' is a reserved group name.`);
    }
  }

  return settings;
}

/* -------------------------------------------------------------------------- */
/*                              SETTINGS FIELDS                                */
/* -------------------------------------------------------------------------- */

export const PingSettingsFields: SettingsFormField[] = [
  {
    type: "group",
    label: "Ping Bot Configuration",
    helpText: "Enable and name your ping groups (max 12).",
    fields: [
      {
        type: "boolean",
        name: "enablePingBot",
        label: "Enable Ping Bot",
        defaultValue: true,
      },

      ...Array.from({ length: MAX_GROUPS }, (_, i) => {
        const n = i + 1;
        return [
          {
            type: "boolean" as const,
            name: `enableGroup${n}`,
            label: `Enable Group ${n}`,
            defaultValue: false,
          } as const,
          {
            type: "string" as const,
            name: `Group${n}`,
            label: `Name Group ${n}`,
            defaultValue: "",
            onValidate: (input: { value: string | undefined }): string | undefined =>
              textFieldIsUnderLimit(input, 12),
          } as const,
        ];
      }).flat(),
    ],
  },
];
