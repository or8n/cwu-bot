const config = require("../config/config");
const pendingReviews = require("../data/pendingReviews");
const { addReview, hasInvoiceBeenReviewed } = require("./reviewStore");
const { verifyInvoice } = require("./sellauth");
const { reviewEmbed } = require("../embeds/reviewEmbeds");

async function prepareReview({ user, invoiceId, rating, comment }) {
  if (hasInvoiceBeenReviewed(invoiceId)) {
    throw new Error("This invoice already has a review.");
  }

  const verification = await verifyInvoice(invoiceId, user.id);
  if (!verification.completed) throw new Error("Only completed orders can be reviewed.");
  if (verification.ownerMatches === false) {
    throw new Error("This invoice belongs to another Discord account.");
  }

  const pending = {
    invoiceId,
    customerId: user.id,
    customerTag: user.tag,
    rating,
    comment,
    product: verification.product,
    total: verification.total,
    payment: verification.payment,
    createdAt: new Date().toISOString(),
  };
  pendingReviews.set(user.id, pending);
  return pending;
}

async function publishReview(client, user, screenshotUrl = null) {
  const pending = pendingReviews.get(user.id);
  if (!pending) throw new Error("No review is waiting for this account.");
  if (!config.reviewsChannelId) throw new Error("REVIEWS_CHANNEL_ID is missing in .env.");

  const review = addReview({ ...pending, screenshotUrl });
  const channel = await client.channels.fetch(config.reviewsChannelId).catch(() => null);
  if (!channel?.isTextBased()) throw new Error("Reviews channel could not be found.");

  await channel.send({ embeds: [reviewEmbed({ user, review })] });
  pendingReviews.remove(user.id);
  return review;
}

module.exports = { prepareReview, publishReview };
