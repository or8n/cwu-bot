const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { ORDER_TYPES, TYPE_LABELS } = require("../utils/constants");

function ticketButtons({ claimed = false, done = false } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_done")
      .setLabel(done ? "Completed" : "Mark as Done")
      .setStyle(ButtonStyle.Success)
      .setDisabled(done),
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel(claimed ? "Claimed" : "Claim Ticket")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(claimed || done),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

function orderMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_order_menu")
      .setPlaceholder("Select an order-related category")
      .addOptions(
        { label: "Order Issue", value: "order_issue", description: "Missing delivery, wrong item, or product issue" },
        { label: "Login Issue", value: "login_issue", description: "The supplied login is not working" },
        { label: "Replacement Request", value: "replacement_request", description: "Request help with a faulty product" },
        { label: "Payment Issue", value: "payment_issue", description: "Pending payment, checkout, or verification" },
        { label: "Website Issue", value: "website_issue", description: "Storefront, account, or checkout bug" }
      )
  );
}

function generalMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_general_menu")
      .setPlaceholder("Select a general inquiry category")
      .addOptions(
        { label: "Product Question", value: "product_question", description: "Ask about a listed product" },
        { label: "Restock Question", value: "restock_question", description: "Ask when a product may return" },
        { label: "Partnership", value: "partnership", description: "Business or collaboration request" },
        { label: "Suggestion", value: "suggestion", description: "Suggest an improvement or product" },
        { label: "Other Question", value: "other_question", description: "Anything not covered above" }
      )
  );
}

function ticketModal(type) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal:${type}`)
    .setTitle(`Create a Ticket | ${TYPE_LABELS[type] || "Support"}`);

  const rows = [];
  if (ORDER_TYPES.has(type)) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("order_id")
          .setLabel("SellAuth Invoice ID")
          .setPlaceholder("Paste the short or long invoice ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("issue")
        .setLabel("What do you need help with?")
        .setPlaceholder("Describe the issue clearly.")
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(5)
        .setMaxLength(1000)
        .setRequired(true)
    )
  );

  return modal.addComponents(...rows);
}

function reviewDmButtons(invoiceId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_start:${invoiceId}`)
      .setLabel("Leave a Review")
      .setStyle(ButtonStyle.Success)
  );
}

function reviewModal(invoiceId) {
  return new ModalBuilder()
    .setCustomId(`review_modal:${invoiceId}`)
    .setTitle("Leave a Verified Review")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("rating")
          .setLabel("Rating from 1 to 5")
          .setPlaceholder("5")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(1)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("comment")
          .setLabel("Your honest review")
          .setPlaceholder("Describe your experience with the product and delivery.")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(5)
          .setMaxLength(800)
          .setRequired(true)
      )
    );
}

function reviewProofButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("review_skip_proof")
      .setLabel("Post Without Screenshot")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("review_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
  );
}

module.exports = {
  ticketButtons,
  orderMenu,
  generalMenu,
  ticketModal,
  reviewDmButtons,
  reviewModal,
  reviewProofButtons,
};
