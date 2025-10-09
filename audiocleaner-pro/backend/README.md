# AudioCleanerPro Backend

Node.js/Express backend for limiting audio downloads and handling Stripe subscriptions.

## Setup
1. Run `npm install` to install dependencies.
2. Replace `YOUR_STRIPE_SECRET_KEY` and `YOUR_STRIPE_PRICE_ID` in `server.js` with your Stripe account details.
3. Start the server with `npm start`.

## Endpoints
- `GET /download`: Download audio file (limit 3 per user).
- `POST /subscribe`: Create Stripe subscription session.
