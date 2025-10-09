# Audio Hub Suite

A comprehensive suite of professional audio tools with centralized authentication and subscription management.

## 🏗️ Architecture

```
AudioHubSuite/
├── landing/           # Central landing page & auth hub
├── audiocleaner-pro/  # AudioCleaner Pro application
├── samplx/           # SamplX application (coming soon)
└── shared/           # Shared components & utilities
```

## 🚀 Services

### Landing Page (`/landing`)
- **Purpose**: Central authentication hub and landing page
- **Tech**: HTML, CSS, JavaScript, Express.js backend
- **Features**: User registration, login, subscription management, app launcher

### AudioCleaner Pro (`/audiocleaner-pro`)
- **Purpose**: Audio cleaning and enhancement tool
- **Tech**: HTML, CSS, JavaScript, Web Audio API
- **Features**: Real-time audio processing, noise reduction, MP3 export

### SamplX (`/samplx`)
- **Purpose**: Audio slicing and sample editing tool
- **Status**: Coming soon
- **Features**: Audio slicing, individual sample editing, tempo controls

## 🔐 Authentication

- **JWT-based authentication** across all services
- **Centralized user management** through landing page
- **Subscription tiers**: Free (3 downloads) vs Premium (unlimited)
- **Cross-service token verification**

## 🛠️ Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Running Locally

1. **Start Landing Page Auth Backend:**
   ```bash
   cd landing/backend
   npm install
   npm start
   ```

2. **Start AudioCleaner Pro Backend:**
   ```bash
   cd audiocleaner-pro/backend
   npm install
   npm start
   ```

3. **Open Landing Page:**
   - Open `landing/index.html` in browser
   - Sign up/login to get authentication token

4. **Access AudioCleaner Pro:**
   - Click "Try AudioCleaner Pro" from landing page
   - Or visit `audiocleaner-pro/index.html` directly

## 🌐 Production URLs

- **Landing Page**: `https://audio-hub.com` (to be deployed)
- **AudioCleaner Pro**: `https://audiocleaner.site`
- **SamplX**: `https://samplx.com` (coming soon)

## 📋 Features

### Free Tier
- ✅ Basic audio cleaning
- ✅ 3 downloads per 24 hours
- ✅ Standard quality export
- ✅ Real-time preview

### Premium Tier
- ✅ All free features
- ✅ Unlimited downloads
- ✅ Advanced processing features
- ✅ Priority support
- ✅ Access to all apps in suite

## 🔧 Configuration

### Environment Variables

**Landing Backend (`/landing/backend/.env`):**
```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key
```

**AudioCleaner Backend (`/audiocleaner-pro/backend/.env`):**
```env
PORT=3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📦 Deployment

Each service can be deployed independently:

- **Landing Page**: Static hosting (GitHub Pages, Netlify, Vercel)
- **Auth Backend**: Node.js hosting (Render, Railway, Heroku)
- **AudioCleaner Pro**: GitHub Pages + Render backend
- **SamplX**: TBD

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across all services
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Audio Hub Suite** - Professional audio tools for creators and professionals.
