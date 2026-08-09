module.exports = {
  COLORS: {
    brand: 0x5865f2,
    open: 0x5865f2,
    claimed: 0xf59e0b,
    done: 0x22c55e,
    error: 0xef4444,
  },
  TYPE_LABELS: {
    order_issue: "Order Issue",
    login_issue: "Login Issue",
    replacement_request: "Replacement Request",
    payment_issue: "Payment Issue",
    website_issue: "Website Issue",
    product_question: "Product Question",
    restock_question: "Restock Question",
    partnership: "Partnership",
    suggestion: "Suggestion",
    other_question: "General Inquiry",
  },
  ORDER_TYPES: new Set([
    "order_issue",
    "login_issue",
    "replacement_request",
    "payment_issue",
  ]),
};
