// Single source of truth for community topics. Stored in DB as the English value.
// "Other" is handled in-form as a free-text fallback (any value not in this list).
export const COMMUNITY_TOPIC_VALUES = [
  "Game Development",
  "Game Programming",
  "Game Art",
  "Game Design",
] as const;

export type CommunityTopic = (typeof COMMUNITY_TOPIC_VALUES)[number];

export const COMMUNITY_TOPIC_I18N_KEYS: Record<string, string> = {
  "Game Development": "topicGameDevelopment",
  "Game Programming": "topicGameProgramming",
  "Game Art": "topicGameArt",
  "Game Design": "topicGameDesign",
};
