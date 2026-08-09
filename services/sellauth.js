const config = require("../config/config");

const API_BASE = "https://api.sellauth.com/v1";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.sellAuthApiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `SellAuth request failed (${response.status})`
    );
  }

  return data;
}

async function getInvoice(invoiceId) {
  const cleaned = String(invoiceId || "").trim().replace(/^#/, "");
  if (!cleaned) throw new Error("Invoice ID is required.");

  return request(
    `/shops/${config.sellAuthShopId}/invoices/${encodeURIComponent(cleaned)}`
  );
}

function unwrapInvoice(raw) {
  return raw?.data || raw?.invoice || raw;
}

function invoiceSummary(raw) {
  const invoice = unwrapInvoice(raw) || {};
  const products = invoice.products || invoice.items || invoice.lines || [];
  const firstProduct = Array.isArray(products) ? products[0] : null;

  return {
    raw: invoice,
    id: String(invoice.id || invoice.unique_id || invoice.invoice_id || "Unknown"),
    status: String(invoice.status || "unknown").toLowerCase(),
    product:
      firstProduct?.product?.name ||
      firstProduct?.name ||
      invoice.product?.name ||
      invoice.product_name ||
      "Not available",
    total: invoice.total_display || invoice.total || invoice.price || "Not available",
    payment:
      invoice.payment_method?.name ||
      invoice.payment_method ||
      invoice.gateway?.name ||
      "Not available",
    discordId: String(
      invoice.discord_id ||
        invoice.discord?.id ||
        invoice.customer?.discord_id ||
        invoice.customer?.discord?.id ||
        ""
    ) || null,
  };
}

async function verifyInvoice(invoiceId, discordUserId) {
  const summary = invoiceSummary(await getInvoice(invoiceId));
  const completed = summary.status === "completed";
  const ownerMatches = summary.discordId
    ? summary.discordId === String(discordUserId)
    : null;

  return {
    ...summary,
    completed,
    ownerMatches,
    verified: completed && ownerMatches !== false,
  };
}

module.exports = { request, getInvoice, verifyInvoice, invoiceSummary };
