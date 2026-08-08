const { ChannelType } = require("discord.js");

const config = require("../config/config");
const ticketStore = require("../data/ticketStore");
const pendingReviews = require("../data/pendingReviews");
const aiState = require("../data/aiState");

const { parseTopic } = require("../utils/ticketUtils");
const { ticketEmbed } = require("../embeds/ticketEmbeds");
const { ticketButtons } = require("./components");

const { publishReview } = require("../services/reviews");
const {
  answerTicket,
  isAiReady,
} = require("../services/ai");


// ======================================================
// REVIEW SCREENSHOT DM
// ======================================================

async function handleReviewDm(client, message) {
  if (message.guild || message.author.bot) {
    return false;
  }

  const pending =
    pendingReviews.get(message.author.id);

  if (!pending) {
    return false;
  }

  const image = message.attachments.find(
    (file) =>
      (file.contentType || "")
        .startsWith("image/")
  );

  if (!image) {
    await message.reply(
      "Please upload one image, or use the **Post Without Screenshot** button."
    );

    return true;
  }

  try {
    await publishReview(
      client,
      message.author,
      image.url
    );

    await message.reply(
      "Your verified review was posted. Thank you."
    );
  } catch (error) {
    await message.reply(
      `Review could not be posted: ${error.message}`
    );
  }

  return true;
}


// ======================================================
// ADD CUSTOMER SCREENSHOT TO TICKET
// ======================================================

async function updateTicketScreenshot(
  client,
  message,
  record
) {
  const image = message.attachments.find(
    (file) =>
      (file.contentType || "")
        .startsWith("image/")
  );

  if (!image) {
    return null;
  }

  // Keep the first screenshot on the ticket panel.
  if (!record.screenshotUrl) {
    record.screenshotUrl = image.url;

    ticketStore.set(
      message.channel.id,
      record
    );

    const starter =
      await message.channel.messages
        .fetch(record.messageId)
        .catch(() => null);

    if (starter) {
      const customer =
        await client.users.fetch(
          record.ownerId
        );

      await starter.edit({
        embeds: [
          ticketEmbed({
            client,
            customer,
            ...record,
          }),
        ],

        components: [
          ticketButtons({
            claimed:
              Boolean(record.claimedBy),

            done:
              record.status === "done",
          }),
        ],
      });
    }
  }

  await message.react("✅").catch(() => {});

  return image.url;
}


// ======================================================
// RECENT CONVERSATION MEMORY
// ======================================================

async function collectRecentMessages(
  channel
) {
  const fetched =
    await channel.messages
      .fetch({
        limit: 12,
      })
      .catch(() => null);

  if (!fetched) {
    return [];
  }

  return [...fetched.values()]
    .reverse()

    .filter(
      (item) =>
        item.content?.trim()
    )

    .map((item) => ({
      author:
        item.author.bot
          ? "GetCwu Assistant"
          : item.author.username,

      content:
        item.content,
    }));
}


// ======================================================
// CLEAN AI RESPONSE
// ======================================================

function cleanAiReply(text) {
  let reply =
    String(text || "").trim();

  // Remove emojis from the AI-generated answer.
  reply = reply.replace(
    /[\p{Extended_Pictographic}\uFE0F]/gu,
    ""
  );

  // Remove common chatbot greetings.
  reply = reply.replace(
    /^(hi there|hey there|hello there|hello|hey|hi)[!,.:\s-]*/i,
    ""
  );

  // Sometimes Gemini puts another greeting phrase
  // immediately after the first one.
  reply = reply.replace(
    /^(thanks|thank you)\s+for\s+reaching\s+out[!,.:\s-]*/i,
    ""
  );

  // Also catch "Thanks for reaching out" after
  // a greeting was already removed.
  reply = reply.replace(
    /^(thanks|thank you)\s+for\s+reaching\s+out[!,.:\s-]*/i,
    ""
  );

  // Turn all paragraphs/newlines into normal spaces.
  reply = reply.replace(
    /\s*\n+\s*/g,
    " "
  );

  // Remove repeated spaces.
  reply = reply.replace(
    /\s{2,}/g,
    " "
  );

  // Remove spaces before punctuation.
  reply = reply.replace(
    /\s+([,.!?])/g,
    "$1"
  );

  return reply.trim();
}


// ======================================================
// AI SUPPORT
// ======================================================

async function handleAiReply(
  message,
  record,
  imageUrl
) {
 if (
  !isAiReady() ||
  record.status === "done" ||
  record.claimedBy
) {
  return;
}

  if (
    !message.content?.trim() &&
    !imageUrl
  ) {
    return;
  }

  const state =
    aiState.get(
      message.channel.id
    );

  if (state.inFlight) {
    return;
  }

  if (
    state.lastMessageId ===
    message.id
  ) {
    return;
  }

  aiState.set(
    message.channel.id,
    {
      ...state,

      inFlight: true,

      lastMessageId:
        message.id,
    }
  );

  try {
    await message.channel
      .sendTyping();

    const recentMessages =
      await collectRecentMessages(
        message.channel
      );

    const result =
      await answerTicket({
        message,
        record,
        recentMessages,
        imageUrl,
      });

    if (!result) {
      return;
    }
// Check again in case staff claimed the ticket
// while the AI was generating its response.
const latestRecord = ticketStore.get(
  message.channel.id
);

if (
  !latestRecord ||
  latestRecord.status === "done" ||
  latestRecord.claimedBy
) {
  return;
}
    const finalAnswer =
      cleanAiReply(
        result.answer
      );

    if (finalAnswer) {
      await message.reply({
        content:
          `${finalAnswer}\n` +
          `-# 🤖 Generated by /GetCwu AI`,

        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    // Human review escalation.
    if (
      result.escalate &&
      !record.staffEscalated
    ) {
      record.staffEscalated =
        true;

      ticketStore.set(
        message.channel.id,
        record
      );

      await message.channel.send({
        content:
          `<@&${config.staffRoleId}> ` +
          `This issue needs human review.`,

        allowedMentions: {
          roles: [
            config.staffRoleId,
          ],
        },
      });
    }
  } catch (error) {
    console.error(
      "AI support error:",
      error.message
    );
  } finally {
    const latest =
      aiState.get(
        message.channel.id
      );

    aiState.set(
      message.channel.id,
      {
        ...latest,
        inFlight: false,
      }
    );
  }
}


// ======================================================
// MAIN MESSAGE HANDLER
// ======================================================

async function handleMessage(
  client,
  message
) {
  try {
    // Review screenshot DMs.
    if (
      await handleReviewDm(
        client,
        message
      )
    ) {
      return;
    }

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }

    if (
      message.channel.type !==
      ChannelType.GuildText
    ) {
      return;
    }

    const topic =
      parseTopic(
        message.channel
      );

    // Only respond to the customer who owns the ticket.
    if (
      !topic.ticket ||
      message.author.id !==
        topic.owner
    ) {
      return;
    }

    const record =
      ticketStore.get(
        message.channel.id
      );

    if (!record) {
      return;
    }

    const imageUrl =
      await updateTicketScreenshot(
        client,
        message,
        record
      );

    await handleAiReply(
      message,
      record,
      imageUrl
    );
  } catch (error) {
    console.error(
      "Message handler error:",
      error
    );
  }
}


module.exports = {
  handleMessage,
};