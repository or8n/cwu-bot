const { GoogleGenAI } = require("@google/genai");

const MODEL =
  process.env.GEMINI_MODEL ||
  "gemini-3.6-flash";

const ESCALATION_WORDS = [
  "refund",
  "chargeback",
  "dispute",
  "scam",
  "fraud",
  "hacked",
  "stolen",
  "banned",
  "replacement",
  "replace",
  "payment issue",
  "cash app issue",
  "paypal issue",
  "bitcoin issue",
];

function isAiReady() {
  const enabled =
    String(process.env.AI_ENABLED || "")
      .trim()
      .toLowerCase() === "true";

  const hasKey = Boolean(
    String(process.env.GEMINI_API_KEY || "")
      .trim()
  );

  return enabled && hasKey;
}

function createClient() {
  const apiKey =
    String(process.env.GEMINI_API_KEY || "")
      .trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing from .env."
    );
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function needsHumanReview(text) {
  const normalized =
    String(text || "")
      .trim()
      .toLowerCase();

  return ESCALATION_WORDS.some((word) =>
    normalized.includes(word)
  );
}

function formatHistory(
  recentMessages = []
) {
  return recentMessages
    .slice(-10)
    .map((item) => {
      const author =
        item.author || "Unknown";

      const content =
        item.content || "";

      return `${author}: ${content}`;
    })
    .join("\n");
}

function getVerificationDetails(
  record = {}
) {
  const verification =
    record.verification || {};

  return {
    product:
      verification.product ||
      verification.productName ||
      record.product ||
      "Unknown",

    orderStatus:
      verification.status ||
      verification.orderStatus ||
      "Unknown",

    payment:
      verification.payment ||
      verification.paymentMethod ||
      "Unknown",

    completed:
      Boolean(
        verification.completed
      ),

    ownership:
      verification.ownership ||
      verification.discordOwnership ||
      (
        verification.ownerMatches === true
          ? "Matched"
          : verification.ownerMatches === false
            ? "Mismatch"
            : "Unknown"
      ),
  };
}

function clampConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(number)
    )
  );
}
function cleanHumanReply(text) {
  let reply = String(text || "").trim();

  // Remove emojis
  reply = reply.replace(
    /[\p{Extended_Pictographic}\uFE0F]/gu,
    ""
  );

  // Remove common robotic greetings/openings
  reply = reply.replace(
    /^(hi there|hey there|hello|hey|hi)[!,.:\s-]*/i,
    ""
  );

  reply = reply.replace(
    /^(thanks for reaching out|thank you for reaching out)[!,.:\s-]*/i,
    ""
  );

  // Remove excessive line breaks and spacing
  reply = reply.replace(/\s*\n+\s*/g, " ");

  // Collapse multiple spaces
  reply = reply.replace(/\s{2,}/g, " ");

  // Clean space before punctuation
  reply = reply.replace(/\s+([,.!?])/g, "$1");

  return reply.trim();
}
async function answerTicket({
  message,
  record,
  recentMessages = [],
  imageUrl = null,
}) {
  if (!isAiReady()) {
    return null;
  }

  const details =
    getVerificationDetails(record);

  const customerMessage =
    String(
      message?.content || ""
    ).trim();

  const keywordEscalation =
    needsHumanReview(
      customerMessage
    );

  const history =
    formatHistory(
      recentMessages
    );

  const prompt = `
You are the automated support assistant for /GetCwu, a digital-products marketplace.

YOUR JOB:
Help customers troubleshoot common product and login issues before a staff member joins.

STYLE:
- Write like a real person handling support through Discord, not like a chatbot or corporate customer-service agent.
- Use normal conversational English.
- Default to ONE compact paragraph.
- Do not put blank lines between sentences.
- Keep most replies between 1 and 4 sentences.
- Do not use greetings unless the conversation has just started and a greeting is actually necessary.
- Never start with "Hey there", "Hi there", "Hello", or "Thanks for reaching out".
- Do not use emojis in customer replies.
- Do not use exclamation marks unless genuinely necessary.
- Avoid overly formal wording such as "could you clarify", "if you're able to", "I understand your concern", "I apologize for the inconvenience", or "our staff team".
- Prefer simple wording such as "are you trying to", "send a screenshot if you can", "I'll flag this for staff", and "what happens when you try it?"
- Do not repeat the customer's problem back to them unnecessarily.
- Do not explain things the customer does not need to know.
- Ask only the most useful next question.
- Match the customer's situation while remaining professional.
- Never imitate the customer's slang, spelling mistakes, or profanity.
- If staff review is needed, say it naturally and briefly.
- If the customer asks for staff or an admin, reply naturally, for example: "Sure. I've flagged the ticket for a staff member to take a look. You can leave any additional details here while you wait."
- If a screenshot would help, say something like: "Send a screenshot of the error if you can so we can see exactly what's happening."
- Do not ask for an invoice ID because the bot already has it.
- Do not ask for the checkout email because the bot already verified the order.

BAD STYLE:
"Hey there! 👋 Since this product is a Fortnite NFA account, could you clarify where you are trying to enter the details? If you're able to attach a screenshot, that will also help our staff team review your issue much faster!"

GOOD STYLE:
"Got you. Are you trying to log into the Fortnite account directly through Epic Games or redeem it somewhere? Send a screenshot of the error if you can so we can see exactly what's happening."

IMPORTANT:
Return the customer-facing reply as plain text in one compact paragraph whenever possible. Do not add decorative spacing, headings, bullet points, or emojis.

SECURITY:
- Never ask for passwords.
- Never ask for login codes.
- Never ask for backup codes.
- Never ask for cookies, tokens, or private credentials.
- Never reveal email, IP, invoice, payment, or account details.

LIMITS:
- Do not approve refunds.
- Do not approve replacements.
- Do not approve warranty claims.
- Do not make chargeback decisions.
- Do not promise that staff will issue anything.
- Refunds, replacements, fraud, payment disputes, hacked accounts, bans, ownership mismatches, and chargebacks require human review.
- If uncertain, say that staff review is required.

TICKET INFORMATION:
Ticket type: ${record?.type || "Unknown"}
Product: ${details.product}
Order status: ${details.orderStatus}
Payment method: ${details.payment}
Completed purchase: ${details.completed ? "Yes" : "No"}
Discord ownership: ${details.ownership}
Screenshot attached: ${imageUrl ? "Yes" : "No"}

RECENT CONVERSATION:
${history || "No earlier conversation."}

LATEST CUSTOMER MESSAGE:
${
  customerMessage ||
  "The customer uploaded a screenshot without writing a message."
}

Return JSON with these exact fields:

answer:
A short customer-facing response.

issue:
A short issue label, usually 2 to 5 words.

confidence:
A whole number from 0 to 100.

status:
One of these or something similarly short:
- Collecting Information
- Awaiting Screenshot
- Awaiting Customer Reply
- Awaiting Staff Review
- Staff Handling

recommendation:
A short safe next step. Never promise a refund or replacement.

escalate:
true when staff review is required, otherwise false.
`.trim();

  const ai = createClient();

  const response =
    await ai.models.generateContent({
      model: MODEL,
      contents: prompt,

      config: {
        responseMimeType:
          "application/json",

        responseSchema: {
          type: "object",

          properties: {
            answer: {
              type: "string",
            },

            issue: {
              type: "string",
            },

            confidence: {
              type: "integer",
            },

            status: {
              type: "string",
            },

            recommendation: {
              type: "string",
            },

            escalate: {
              type: "boolean",
            },
          },

          required: [
            "answer",
            "issue",
            "confidence",
            "status",
            "recommendation",
            "escalate",
          ],
        },
      },
    });

  let parsed;

  try {
    parsed = JSON.parse(
      String(
        response?.text || ""
      )
    );
  } catch {
    throw new Error(
      "Gemini returned invalid JSON."
    );
  }

const answer = cleanHumanReply(
  parsed.answer
);
  return {
    answer,

    analysis: {
      issue:
        String(
          parsed.issue ||
          "Analyzing..."
        ).trim(),

      confidence:
        clampConfidence(
          parsed.confidence
        ),

      status:
        String(
          parsed.status ||
          "Collecting Information"
        ).trim(),

      recommendation:
        String(
          parsed.recommendation ||
          "Continue Troubleshooting"
        ).trim(),
    },

    escalate:
      Boolean(parsed.escalate) ||
      keywordEscalation,
  };
}

module.exports = {
  answerTicket,
  isAiReady,
};