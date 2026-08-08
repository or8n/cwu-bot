const { EmbedBuilder } = require("discord.js");
const { COLORS, ORDER_TYPES, TYPE_LABELS } = require("../utils/constants");

function supportPanel(client) {
  return new EmbedBuilder()
    .setColor(COLORS.brand)
    .setAuthor({ name: "/GetCwu", iconURL: client.user.displayAvatarURL() })
    .setTitle("Open a Ticket")
    .setDescription("Before opening a ticket, please review the information below.")
    .addFields(
      {
        name: "`📄`  Legal & Resources",
        value:
          "**Terms of Service**\nRules that apply when using our products and services.\n\n" +
          "**Privacy Policy**\nHow customer information is handled and protected.\n\n" +
          "**Tutorials**\nGuides for common product and account questions.",
      },
      { name: "\u200B", value: "\u200B" },
      {
        name: "`📋`  General Rules",
        value:
          "> **1.** Select the correct category.\n" +
          "> **2.** Provide complete and accurate information.\n" +
          "> **3.** Do not repeatedly ping staff.\n" +
          "> **4.** Never post passwords or login codes.\n" +
          "> **5.** Completed tickets are considered resolved.",
      },
      { name: "\u200B", value: "\u200B" },
      {
        name: "`📦`  Order Related",
        value:
          "Use this category for order, payment, login, delivery, and replacement issues.\n\n" +
          "> Include the SellAuth invoice ID.\n" +
          "> Handle one order per ticket.\n" +
          "> Attach screenshots when useful.\n" +
          "> Never share delivered credentials publicly.",
      },
      { name: "\u200B", value: "\u200B" },
      {
        name: "`💬`  General Inquiry",
        value:
          "Use this for product questions, restocks, suggestions, partnerships, and other questions unrelated to an existing order.",
      }
    )
    .setFooter({ text: "/GetCwu Team", iconURL: client.user.displayAvatarURL() });
}

function ticketEmbed({
  client,
  ticketId,
  type,
  customer,
  orderId,
  issue,
  verification = null,
  status = "open",
  claimedBy = null,
  screenshotUrl = null,
}) {
  const now = Math.floor(Date.now() / 1000);
  const state = {
    open: ["`OPEN`", COLORS.open],
    claimed: [claimedBy ? `\`CLAIMED\` by <@${claimedBy}>` : "`CLAIMED`", COLORS.claimed],
    done: ["`DONE`", COLORS.done],
  }[status] || ["`OPEN`", COLORS.open];

  const embed = new EmbedBuilder()
    .setColor(state[1])
    .setAuthor({ name: "/GetCwu Support", iconURL: client.user.displayAvatarURL() })
    .setTitle(`${TYPE_LABELS[type] || "Support Ticket"} from @${customer.username}`)
    .setDescription(
      `${ORDER_TYPES.has(type) ? "**Order Related**" : "**General Inquiry**"}\n` +
        `Ticket ID: \`${ticketId}\``
    )
    .addFields(
      { name: "\u200B", value: "\u200B" },
      {
        name: "Customer Details",
        value: `> **Opened by:** ${customer}\n> **User ID:** \`${customer.id}\``,
      }
    );

  if (ORDER_TYPES.has(type)) {
    let orderDetails = `> **Order ID:** \`${orderId || "Not provided"}\``;

    if (!verification) {
      orderDetails += "\n> **Verification:** `FAILED OR UNAVAILABLE`";
    } else {
      const ownership =
        verification.ownerMatches === true
          ? "MATCHED"
          : verification.ownerMatches === false
            ? "MISMATCH"
            : "NO DISCORD ID ON ORDER";
      orderDetails +=
        `\n> **Order Status:** \`${verification.status.toUpperCase()}\`` +
        `\n> **Verification:** \`${verification.verified ? "VERIFIED" : "NOT VERIFIED"}\`` +
        `\n> **Discord Ownership:** \`${ownership}\`` +
        `\n> **Product:** ${verification.product}` +
        `\n> **Total:** ${verification.total}` +
        `\n> **Payment:** ${verification.payment}`;
    }

    embed.addFields(
      { name: "\u200B", value: "\u200B" },
      { name: "Order Details", value: orderDetails }
    );
  }

  embed.addFields(
    { name: "\u200B", value: "\u200B" },
    { name: "Customer Issue", value: `> ${issue.slice(0, 1000)}` },
    { name: "\u200B", value: "\u200B" },
    { name: "Status", value: state[0], inline: true },
    { name: "Opened At", value: `<t:${now}:f>`, inline: true },
    { name: "Last Updated", value: `<t:${now}:R>`, inline: true }
  );

  if (screenshotUrl) {
    embed.addFields({ name: "Attachment", value: "Customer screenshot shown below." });
    embed.setImage(screenshotUrl);
  }

  return embed
    .setFooter({ text: "/GetCwu Team", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

module.exports = { supportPanel, ticketEmbed };
