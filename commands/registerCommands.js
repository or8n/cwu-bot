const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

async function registerCommands(guild) {
  await guild.commands.set([
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Check whether the GetCwu bot is online."),
    new SlashCommandBuilder()
      .setName("ticketpanel")
      .setDescription("Post the GetCwu ticket panel.")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  ]);
}

module.exports = { registerCommands };
