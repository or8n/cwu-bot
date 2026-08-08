const { EmbedBuilder } = require("discord.js");
const { COLORS } = require("../utils/constants");

function resolvedDmEmbed({ ticketType, staffUser, lastMessage }) {
  return new EmbedBuilder()
    .setColor(COLORS.done)
    .setTitle("Your Ticket Has Been Resolved")
    .setDescription(
      `Your **${ticketType || "support"}** ticket was marked as done by ${staffUser}.\n\n` +
      `**Last support message**\n> ${lastMessage || "Your issue has been marked as resolved."}\n\n` +
      "If you still need help, open a new ticket. Resolved tickets are not reviewed again."
    )
    .setFooter({ text: "/GetCwu Team" })
    .setTimestamp();
}

function warrantyNoticeEmbed() {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("Important — Warranty Notice")
    .setDescription(
      "To activate your account warranty, submit a verified review using the button below.\n" +
      "Reviews must be linked to a completed SellAuth purchase."
    )
    .addFields({
      name: "Required format",
      value: "> Choose a 1–5 rating.\n> Write an honest comment.\n> Add purchase proof when available.",
    })
    .setFooter({ text: "/GetCwu Team" });
}

function reviewEmbed({ user, review }) {
  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
  const embed = new EmbedBuilder()
    .setColor(COLORS.done)
    .setTitle(`Vouch — @${user.username}`)
    .setDescription(`Order: \`${review.invoiceId}\``)
    .addFields(
      {
        name: "Order Details",
        value:
          `> **Status:** \`PAID\`\n` +
          `> **Total:** ${review.total}\n` +
          `> **Payment:** ${review.payment}\n` +
          `> **Warranty:** \`GRANTED\``,
      },
      { name: "Product", value: `> ${review.product}` },
      { name: "Rating", value: `> ${stars}` },
      { name: "Comment", value: `> ${review.comment}` }
    )
    .setFooter({ text: `/GetCwu Team • Reviewed by @${user.username}` })
    .setTimestamp(new Date(review.createdAt));

  if (review.screenshotUrl) {
    embed.addFields({ name: "Screenshot", value: "Purchase proof attached below." });
    embed.setImage(review.screenshotUrl);
  }

  return embed;
}

module.exports = { resolvedDmEmbed, warrantyNoticeEmbed, reviewEmbed };
