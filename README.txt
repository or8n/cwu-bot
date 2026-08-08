GETCWU BOT V2.1.1 — SELLAuth + REVIEWS + OPTIONAL AI

SETUP
1. Copy your real .env into this folder.
2. Make sure REVIEWS_CHANNEL_ID is filled in.
3. Keep AI_ENABLED=false until you have an OpenAI API key.
4. Open a terminal in this folder.
5. Run: npm install
6. Run: node index.js

TEST ORDER
- /ping
- /ticketpanel
- Open a ticket with a completed SellAuth invoice.
- Click Mark as Done.
- The customer should receive a DM with Leave a Review.
- Submit rating/comment, then post with or without a screenshot.

AI
To enable later, set:
AI_ENABLED=true
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5-mini

SECURITY
Never share your .env, Discord token, SellAuth key, or OpenAI key.
