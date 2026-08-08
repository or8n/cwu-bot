const {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const config = require("../config/config");
const ticketStore = require("../data/ticketStore");
const pendingReviews = require("../data/pendingReviews");
const { ORDER_TYPES, COLORS, TYPE_LABELS } = require("../utils/constants");
const {
  buildTopic,
  cleanChannelName,
  createTicketId,
  isStaff,
  parseTopic,
} = require("../utils/ticketUtils");
const { verifyInvoice } = require("../services/sellauth");
const { prepareReview, publishReview } = require("../services/reviews");
const { isAiReady } = require("../services/ai");
const { supportPanel, ticketEmbed } = require("../embeds/ticketEmbeds");
const { resolvedDmEmbed, warrantyNoticeEmbed } = require("../embeds/reviewEmbeds");
const {
  generalMenu,
  orderMenu,
  ticketButtons,
  ticketModal,
  reviewDmButtons,
  reviewModal,
  reviewProofButtons,
} = require("./components");

async function getStarterMessage(channel) {
  const topic = parseTopic(channel);
  if (!topic.message || topic.message === "none") return null;
  return channel.messages.fetch(topic.message).catch(() => null);
}

async function getLastSupportMessage(channel, customerId) {
  const messages = await channel.messages.fetch({ limit: 30 }).catch(() => null);
  if (!messages) return null;
  const found = messages.find(
    (message) =>
      !message.author.bot &&
      message.author.id !== customerId &&
      message.content?.trim()
  );
  return found?.content?.slice(0, 500) || null;
}

async function handleInteraction(client, interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "ping") {
        const sent = await interaction.reply({ content: "Checking...", fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(
          `**GetCwu System Status**\n\n` +
            `Bot: \`ONLINE\`\nLatency: \`${latency}ms\`\n` +
            `Ticket system: \`ONLINE\`\nSellAuth: \`CONNECTED\`\n` +
            `Reviews: \`${config.reviewsChannelId ? "CONNECTED" : "NOT CONFIGURED"}\`\n` +
            `AI: \`${isAiReady() ? "CONNECTED" : "NOT CONNECTED"}\``
        );
        return;
      }

      if (interaction.commandName === "ticketpanel") {
        const channel = await interaction.guild.channels
          .fetch(config.ticketPanelChannelId)
          .catch(() => null);
        if (!channel?.isTextBased()) {
          await interaction.reply({
            content: "Ticket panel channel not found.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await channel.send({
          embeds: [supportPanel(client)],
          components: [orderMenu(), generalMenu()],
        });
        await interaction.reply({
          content: `Ticket panel posted in ${channel}.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith("review_start:")) {
      const invoiceId = interaction.customId.slice("review_start:".length);
      await interaction.showModal(reviewModal(invoiceId));
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("review_modal:")) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const invoiceId = interaction.customId.slice("review_modal:".length);
      const rating = Number(interaction.fields.getTextInputValue("rating").trim());
      const comment = interaction.fields.getTextInputValue("comment").trim();

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        await interaction.editReply("Rating must be a whole number from 1 to 5.");
        return;
      }

      try {
        await prepareReview({ user: interaction.user, invoiceId, rating, comment });
        await interaction.editReply({
          content:
            "Your review is ready. Upload one screenshot in this DM for purchase proof, " +
            "or use the button below to post without a screenshot.",
          components: [reviewProofButtons()],
        });
      } catch (error) {
        await interaction.editReply(`Review could not be prepared: ${error.message}`);
      }
      return;
    }

    if (interaction.isButton() && interaction.customId === "review_skip_proof") {
      await interaction.deferUpdate();
      try {
        await publishReview(client, interaction.user, null);
        await interaction.editReply({ content: "Your verified review was posted. Thank you.", components: [] });
      } catch (error) {
        await interaction.editReply({ content: `Review could not be posted: ${error.message}`, components: [] });
      }
      return;
    }

    if (interaction.isButton() && interaction.customId === "review_cancel") {
      pendingReviews.remove(interaction.user.id);
      await interaction.update({ content: "Review cancelled.", components: [] });
      return;
    }

    if (
      interaction.isStringSelectMenu() &&
      ["ticket_order_menu", "ticket_general_menu"].includes(interaction.customId)
    ) {
      await interaction.showModal(ticketModal(interaction.values[0]));
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal:")) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const type = interaction.customId.split(":")[1];
      const customer = interaction.user;
      const guild = interaction.guild;
      const issue = interaction.fields.getTextInputValue("issue").trim();
      const orderId = ORDER_TYPES.has(type)
        ? interaction.fields.getTextInputValue("order_id").trim()
        : null;

      const existing = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          channel.topic?.includes(`owner:${customer.id}`) &&
          !channel.topic?.includes("status:done")
      );
      if (existing) {
        await interaction.editReply(`You already have an open ticket: ${existing}`);
        return;
      }

      let verification = null;
      if (orderId) {
        try {
          verification = await verifyInvoice(orderId, customer.id);
        } catch (error) {
          console.error("SellAuth verification failed:", error.message);
        }
      }

      const parent = await guild.channels.fetch(config.ticketCategoryId).catch(() => null);
      if (!parent || parent.type !== ChannelType.GuildCategory) {
        await interaction.editReply("Ticket category not found.");
        return;
      }

      const ticketId = createTicketId();
      const channel = await guild.channels.create({
        name: `${type.replaceAll("_", "-")}-${cleanChannelName(customer.username)}`,
        type: ChannelType.GuildText,
        parent: parent.id,
        topic: buildTopic({
          ownerId: customer.id,
          ticketId,
          type,
          status: "open",
          claimedBy: null,
          messageId: null,
        }),
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: customer.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
          {
            id: config.staffRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageMessages,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
        ],
      });

      const record = {
        ticketId,
        ownerId: customer.id,
        type,
        orderId,
        issue,
        verification,
        status: "open",
        claimedBy: null,
        screenshotUrl: null,
        messageId: null,
        staffEscalated: false,
      };

      const starter = await channel.send({
        content: `${customer} <@&${config.staffRoleId}>`,
        embeds: [ticketEmbed({ client, customer, ...record })],
        components: [ticketButtons()],
        allowedMentions: { users: [customer.id], roles: [config.staffRoleId] },
      });

      record.messageId = starter.id;
      ticketStore.set(channel.id, record);
      await channel.setTopic(buildTopic(record));
      await interaction.editReply(`Your ticket has been created: ${channel}`);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("ticket_")) {
      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) return;
      if (!isStaff(interaction.member)) {
        await interaction.reply({
          content: "Only staff can use this button.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const record = ticketStore.get(channel.id);
      if (!record) {
        await interaction.reply({
          content: "This ticket was created before the latest bot restart. Please close it manually or reopen it.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const customer = await client.users.fetch(record.ownerId);

      if (interaction.customId === "ticket_claim") {
        if (record.claimedBy && record.claimedBy !== interaction.user.id) {
          await interaction.reply({
            content: `Already claimed by <@${record.claimedBy}>.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (interaction.customId === "ticket_done") {
  await interaction.deferUpdate();

  record.status = "done";
  record.claimedBy ||= interaction.user.id;

  ticketStore.set(channel.id, record);

  await channel.setTopic(
    buildTopic(record)
  );

  await channel.permissionOverwrites.edit(
    record.ownerId,
    {
      SendMessages: false,
    }
  );

  await interaction.message.edit({
    embeds: [
      ticketEmbed({
        client,
        customer,
        ...record,
      }),
    ],
    components: [
      ticketButtons({
        claimed: true,
        done: true,
      }),
    ],
  });

  const lastMessage =
    await getLastSupportMessage(
      channel,
      record.ownerId
    );

  const canReview = Boolean(
    record.orderId &&
    record.verification?.completed &&
    config.reviewsChannelId
  );

  try {
    await customer.send({
      embeds: [
        resolvedDmEmbed({
          ticketType:
            TYPE_LABELS[record.type] ||
            "support",

          staffUser:
            interaction.user,

          lastMessage,
        }),

        ...(canReview
          ? [warrantyNoticeEmbed()]
          : []),
      ],

      components:
        canReview
          ? [
              reviewDmButtons(
                record.orderId
              ),
            ]
          : [],
    });
  } catch (error) {
    console.warn(
      `Could not DM ${customer.tag}:`,
      error.message
    );
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.done)
        .setTitle(
          "Ticket Marked as Done"
        )
        .setDescription(
          `${interaction.user} marked this ticket as resolved.\n` +
          "The customer was sent a resolution DM when their privacy settings allowed it."
        )
        .setTimestamp(),
    ],
  });

  return;
}
      }

      if (interaction.customId === "ticket_done") {
await interaction.deferUpdate();
        record.status = "done";
        record.claimedBy ||= interaction.user.id;
        ticketStore.set(channel.id, record);
        await channel.setTopic(buildTopic(record));
        await channel.permissionOverwrites.edit(record.ownerId, { SendMessages: false });
      await interaction.message.edit({

  embeds: [ticketEmbed({ client, customer, ...record })],
  components: [ticketButtons({ claimed: true, done: true })],
});
        const lastMessage = await getLastSupportMessage(channel, record.ownerId);
        const canReview = Boolean(
          record.orderId &&
          record.verification?.completed &&
          config.reviewsChannelId
        );

        try {
          await customer.send({
            embeds: [
              resolvedDmEmbed({
                ticketType: TYPE_LABELS[record.type] || "support",
                staffUser: interaction.user,
                lastMessage,
              }),
              ...(canReview ? [warrantyNoticeEmbed()] : []),
            ],
            components: canReview ? [reviewDmButtons(record.orderId)] : [],
          });
        } catch (error) {
          console.warn(`Could not DM ${customer.tag}:`, error.message);
        }

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.done)
              .setTitle("Ticket Marked as Done")
              .setDescription(
                `${interaction.user} marked this ticket as resolved.\n` +
                "The customer was sent a resolution DM when their privacy settings allowed it."
              )
              .setTimestamp(),
          ],
        });
        return;
      }

      if (interaction.customId === "ticket_close") {
        await interaction.reply({ content: "Closing this ticket in 10 seconds." });
        ticketStore.remove(channel.id);
        setTimeout(
          () => channel.delete(`Closed by ${interaction.user.tag}`).catch(console.error),
          10000
        );
      }
    }
  } catch (error) {
    console.error("Interaction error:", error);
    if (interaction.isRepliable()) {
      const message = {
        content: "Something went wrong. Please notify staff.",
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message).catch(() => {});
      } else {
        await interaction.reply(message).catch(() => {});
      }
    }
  }
}

module.exports = { handleInteraction };
