const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "reviews.json");

function ensureFile() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf8");
}

function readReviews() {
  ensureFile();
  try {
    const value = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("Could not read reviews.json:", error.message);
    return [];
  }
}

function saveReviews(reviews) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(reviews, null, 2), "utf8");
}

function normalizeInvoiceId(value) {
  return String(value || "").trim().toLowerCase();
}

function hasInvoiceBeenReviewed(invoiceId) {
  const id = normalizeInvoiceId(invoiceId);
  return readReviews().some((review) => normalizeInvoiceId(review.invoiceId) === id);
}

function addReview(review) {
  if (!review?.invoiceId) throw new Error("Invoice ID is required.");
  if (hasInvoiceBeenReviewed(review.invoiceId)) {
    throw new Error("This invoice already has a review.");
  }

  const reviews = readReviews();
  const saved = {
    id: review.id || `RV-${Date.now()}`,
    invoiceId: String(review.invoiceId).trim(),
    customerId: String(review.customerId),
    customerTag: review.customerTag || null,
    rating: Math.max(1, Math.min(5, Number(review.rating) || 5)),
    comment: String(review.comment || "").trim(),
    product: review.product || "Unknown product",
    total: review.total || "Not available",
    payment: review.payment || "Not available",
    screenshotUrl: review.screenshotUrl || null,
    createdAt: review.createdAt || new Date().toISOString(),
  };

  reviews.push(saved);
  saveReviews(reviews);
  return saved;
}

module.exports = { addReview, hasInvoiceBeenReviewed, readReviews };
