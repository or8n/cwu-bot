require("dotenv").config();

const required = [
  "DISCORD_TOKEN",
  "GUILD_ID",
  "STAFF_ROLE_ID",
  "TICKET_CATEGORY_ID",
  "TICKET_PANEL_CHANNEL_ID",
  "SELLAUTH_SHOP_ID",
  "SELLAUTH_API_KEY",
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

module.exports = {
  discordToken: process.env.DISCORD_TOKEN,
  guildId: process.env.GUILD_ID,
  staffRoleId: process.env.STAFF_ROLE_ID,
  ticketCategoryId: process.env.TICKET_CATEGORY_ID,
  ticketPanelChannelId: process.env.TICKET_PANEL_CHANNEL_ID,
  reviewsChannelId: process.env.REVIEWS_CHANNEL_ID || null,
  sellAuthShopId: process.env.SELLAUTH_SHOP_ID,
  sellAuthApiKey: process.env.SELLAUTH_API_KEY,
  openAiApiKey: process.env.OPENAI_API_KEY || null,
  openAiModel: process.env.OPENAI_MODEL || "gpt-5",
  aiEnabled: String(process.env.AI_ENABLED || "false").toLowerCase() === "true",
};
