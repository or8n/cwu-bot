const { PermissionFlagsBits } = require("discord.js");
const config = require("../config/config");

function createTicketId() {
  return `GC-${Date.now().toString().slice(-8)}`;
}

function cleanChannelName(username) {
  return username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "customer";
}

function isStaff(member) {
  return Boolean(
    member &&
      (member.permissions.has(PermissionFlagsBits.Administrator) ||
        member.roles.cache.has(config.staffRoleId))
  );
}

function parseTopic(channel) {
  const result = {};
  for (const section of (channel.topic || "").split(" | ")) {
    const [key, ...value] = section.split(":");
    if (key && value.length) result[key] = value.join(":");
  }
  return result;
}

function buildTopic(data) {
  return [
    `owner:${data.ownerId}`,
    `ticket:${data.ticketId}`,
    `type:${data.type}`,
    `status:${data.status}`,
    `claimed:${data.claimedBy || "none"}`,
    `message:${data.messageId || "none"}`,
  ].join(" | ");
}

module.exports = {
  createTicketId,
  cleanChannelName,
  isStaff,
  parseTopic,
  buildTopic,
};
