# AudioCleaner Pro - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create Environment File
Create `backend/.env` with your Stripe test keys:
```env
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_test_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_stripe_test_publishable_key
PORT=3000
```

### 3. Start the Backend
```bash
cd backend
npm run dev
```

### 4. Open the App
Open `index.html` in your browser or serve it via a local server.

## Getting Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_`)
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Add them to `backend/.env`

## Update Price IDs

In `backend/public/js/download-handler.js`, update the `priceMap`:
```javascript
const priceMap = {
    monthly: 'price_your_monthly_test_price_id',
    yearly: 'price_your_yearly_test_price_id'
};
```

## Test Payment

Use Stripe test card: `4242 4242 4242 4242`

## Troubleshooting

- **"Cannot find module"**: Run `cd backend && npm install`
- **"Stripe key not found"**: Check your `backend/.env` file
- **Port in use**: Change `PORT=3001` in `.env` or kill process on port 3000
