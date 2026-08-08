const { Client, Events, GatewayIntentBits, Partials } = require("discord.js");
const config = require("./config/config");
const { registerCommands } = require("./commands/registerCommands");
const { handleInteraction } = require("./handlers/interactionCreate");
const { handleMessage } = require("./handlers/messageCreate");
const { isAiReady } = require("./services/ai");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  const guild = readyClient.guilds.cache.get(config.guildId);
  if (!guild) throw new Error("GUILD_ID does not match an accessible server.");
  await registerCommands(guild);
  console.log("GetCwu tickets, SellAuth, and reviews are ready.");
  console.log(`AI support: ${isAiReady() ? "READY" : "DISABLED"}`);
});

client.on(Events.InteractionCreate, (interaction) =>
  handleInteraction(client, interaction)
);
client.on(Events.MessageCreate, (message) => handleMessage(client, message));
client.on(Events.Error, console.error);
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(config.discordToken);
