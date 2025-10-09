require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs').promises;
const path = require('path');
const app = express();
const crypto = require('crypto');
const PORT = process.env.PORT || 3000;

// File path for storing download counts and email index
const DOWNLOADS_FILE = path.join(__dirname, 'data', 'downloads.json');
const EMAIL_INDEX_FILE = path.join(__dirname, 'data', 'email_index.json');

// Function to load download counts from file
async function loadDownloadCounts() {
    try {
        const data = await fs.readFile(DOWNLOADS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is invalid, return empty object
        return {};
    }
}

// Function to save download counts to file
async function saveDownloadCounts(counts) {
    await fs.writeFile(DOWNLOADS_FILE, JSON.stringify(counts, null, 2));
}

// Email index helpers: map emailHash -> userId
async function loadEmailIndex() {
  try {
    const data = await fs.readFile(EMAIL_INDEX_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

async function saveEmailIndex(index) {
  await fs.writeFile(EMAIL_INDEX_FILE, JSON.stringify(index, null, 2));
}

function hashEmail(email) {
  return crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');
}

// Enable CORS with proper configuration
app.use(cors({
  origin: [
    'https://audiocleaner.site',
    'https://audiocleaner.onrender.com',
    'http://127.0.0.1:5500', 
    'http://localhost:3000',
    'http://localhost:5500'
  ],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept'],
  optionsSuccessStatus: 200
}));


app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..'))); // Serve files from parent directory

// Simple test endpoint
app.get('/test', async (req, res) => {
    try {
        const downloadCounts = await loadDownloadCounts();
        res.json({
            message: 'Backend is working! 👋',
            time: new Date().toLocaleString(),
            downloads_tracked: Object.keys(downloadCounts).length,
            all_counts: downloadCounts
        });
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug endpoint to check current user state
app.get('/api/debug-user', async (req, res) => {
    try {
        const userId = req.cookies.userId || Math.random().toString(36).substring(2);
        const downloadCounts = await loadDownloadCounts();
        const isPro = await isUserPro(userId);
        
        res.json({
            userId: userId,
            currentCount: downloadCounts[userId] || 0,
            remainingDownloads: Math.max(0, 3 - (downloadCounts[userId] || 0)),
            isPro: isPro,
            allCounts: downloadCounts
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug endpoint with POST support for userId in body
app.post('/api/debug-user', async (req, res) => {
    try {
        const userId = req.body.userId || req.cookies.userId || Math.random().toString(36).substring(2);
        const downloadCounts = await loadDownloadCounts();
        const isPro = await isUserPro(userId);
        
        res.json({
            userId: userId,
            currentCount: downloadCounts[userId] || 0,
            remainingDownloads: Math.max(0, 3 - (downloadCounts[userId] || 0)),
            isPro: isPro,
            allCounts: downloadCounts,
            requestBody: req.body,
            cookies: req.cookies
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// (Removed duplicate early endpoints for /api/check-download and /api/track-download)

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, plan } = req.body;
    const userId = req.cookies.userId || Math.random().toString(36).substring(2);
    
    console.log(`Creating checkout session for user ${userId}, plan: ${plan}`);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
      client_reference_id: userId, // Link payment to your user
      metadata: {
        userId: userId,
        plan: plan
      }
    });
    
    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle successful payment
app.get('/success', async (req, res) => {
  const { session_id } = req.query;
  
  if (!session_id) {
    return res.redirect('/?error=no_session');
  }
  
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      const userId = session.client_reference_id;
      
      // Determine customer email from session
      let customerEmail = session.customer_details && session.customer_details.email ? session.customer_details.email : null;
      if (!customerEmail && session.customer) {
        try {
          const customer = await stripe.customers.retrieve(session.customer);
          customerEmail = customer && customer.email ? customer.email : null;
        } catch (e) {
          console.warn('Could not retrieve Stripe customer email:', e.message);
        }
      }

      // Mark user as pro subscriber
      await markUserAsPro(userId, session.metadata.plan, session.id, customerEmail, session.customer || null);
      
      // Redirect to success page with success message
      res.redirect('/?success=subscription_activated');
    } else {
      res.redirect('/?error=payment_failed');
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
    res.redirect('/?error=session_error');
  }
});

// Cancel page
app.get('/cancel', (req, res) => {
  res.redirect('/?cancelled=true');
});

// Function to mark user as pro (add this helper function)
async function markUserAsPro(userId, plan, sessionId, email, stripeCustomerId) {
  try {
    const proUsersFile = path.join(__dirname, 'data', 'pro_users.json');
    
    let proUsers = {};
    try {
      const data = await fs.readFile(proUsersFile, 'utf8');
      proUsers = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start with empty object
    }
    
    const now = new Date();
    const expiryDate = new Date();
    
    // Set expiry based on plan
    if (plan === 'monthly') {
      expiryDate.setMonth(now.getMonth() + 1);
    } else if (plan === 'yearly') {
      expiryDate.setFullYear(now.getFullYear() + 1);
    } else {
      // Default to 1 month if plan is unknown
      expiryDate.setMonth(now.getMonth() + 1);
    }
    
    proUsers[userId] = {
      plan: plan,
      subscriptionStart: now.toISOString(),
      subscriptionEnd: expiryDate.toISOString(),
      stripeSessionId: sessionId,
      email: email || null,
      emailHash: email ? hashEmail(email) : null,
      stripeCustomerId: stripeCustomerId || null
    };
    
    await fs.writeFile(proUsersFile, JSON.stringify(proUsers, null, 2));
    console.log(`User ${userId} upgraded to ${plan} plan`);

    // Update email index for cross-device restore
    if (email) {
      const index = await loadEmailIndex();
      index[hashEmail(email)] = userId;
      await saveEmailIndex(index);
    }
    
  } catch (error) {
    console.error('Error marking user as pro:', error);
  }
}

// Check if user is pro subscriber
async function isUserPro(userId) {
  try {
    const proUsersFile = path.join(__dirname, 'data', 'pro_users.json');
    const data = await fs.readFile(proUsersFile, 'utf8');
    const proUsers = JSON.parse(data);
    
    if (proUsers[userId]) {
      const subscription = proUsers[userId];
      const now = new Date();
      const expiryDate = new Date(subscription.subscriptionEnd);
      
      // Check if subscription is still valid
      return now < expiryDate;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// Update your download check endpoint to include pro status
app.post('/api/check-download', async (req, res) => {
  try {
    console.log('Checking download count...');
    console.log('Request body:', req.body);
    const userId = req.body.userId || req.cookies.userId || Math.random().toString(36).substring(2);
    // Only set cookie if we don't have userId in body (for same-domain requests)
    if (!req.body.userId) {
        res.cookie('userId', userId, { 
          maxAge: 31536000000, // 1 year
          httpOnly: false,
          secure: true, // Use secure cookies for HTTPS
          sameSite: 'none' // Allow cross-domain cookies
        });
    }
    console.log(`Check download - User ID: ${userId}`);
    
    // Check if user is pro subscriber
    const isPro = await isUserPro(userId);
    
    if (isPro) {
      return res.json({
        canDownload: true,
        downloads: 'unlimited',
        remainingDownloads: 'unlimited',
        isPro: true
      });
    }
    
    const downloadCounts = await loadDownloadCounts();
    const currentCount = downloadCounts[userId] || 0;
    
    console.log(`User ${userId} has downloaded ${currentCount} times`);
    
    res.json({
      canDownload: currentCount < 3,
      downloads: currentCount,
      remainingDownloads: Math.max(0, 3 - currentCount),
      isPro: false
    });
  } catch (error) {
    console.error('Error checking download count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update your track download endpoint for pro users
app.post('/api/track-download', async (req, res) => {
  try {
    console.log('Tracking download...');
    console.log('Request body:', req.body);
    console.log('Request cookies:', req.cookies);
    const userId = req.body.userId || req.cookies.userId || Math.random().toString(36).substring(2);
    // Only set cookie if we don't have userId in body (for same-domain requests)
    if (!req.body.userId) {
        res.cookie('userId', userId, { 
          maxAge: 31536000000, // 1 year
          httpOnly: false,
          secure: true, // Use secure cookies for HTTPS
          sameSite: 'none' // Allow cross-domain cookies
        });
    }
    console.log(`Track download - User ID: ${userId}`);

    // Check if user is pro subscriber
    const isPro = await isUserPro(userId);
    
    if (isPro) {
      return res.json({ 
        success: true,
        downloads: 'unlimited',
        remainingDownloads: 'unlimited',
        isPro: true
      });
    }

    const downloadCounts = await loadDownloadCounts();
    console.log(`Current download counts:`, downloadCounts);
    console.log(`User ${userId} current count: ${downloadCounts[userId] || 0}`);
    
    if (!downloadCounts[userId]) {
      downloadCounts[userId] = 0;
    }

    if (downloadCounts[userId] >= 3) {
      console.log(`User ${userId} has reached download limit`);
      return res.status(403).json({ 
        success: false,
        message: 'Download limit reached. Please subscribe for unlimited downloads!',
        showUpgradeModal: true
      });
    }

    downloadCounts[userId]++;
    await saveDownloadCounts(downloadCounts);
    console.log(`User ${userId} download count increased to ${downloadCounts[userId]}`);

    const remaining = Math.max(0, 3 - downloadCounts[userId]);
    console.log(`User ${userId} remaining downloads: ${remaining}`);
    
    res.json({ 
      success: true,
      downloads: downloadCounts[userId],
      remainingDownloads: remaining,
      isPro: false,
      showUpgradeModal: remaining <= 1 // Show modal when 1 or 0 remaining
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin stats endpoint
app.get('/api/admin/stats', async (req, res) => {
  try {
    const downloadCounts = await loadDownloadCounts();
    const totalUsers = Object.keys(downloadCounts).length;
    const totalDownloads = Object.values(downloadCounts).reduce((sum, count) => sum + count, 0);
    const usersAtLimit = Object.values(downloadCounts).filter(count => count >= 3).length;

    res.json({
      totalUsers,
      totalDownloads,
      usersAtLimit,
      users: downloadCounts
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lightweight email login to restore Pro across devices
app.post('/api/auth/login-email', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const index = await loadEmailIndex();
    const userId = index[hashEmail(email)];
    if (!userId) {
      return res.status(404).json({ success: false, message: 'No subscription found for this email' });
    }
    // Set cookie and respond with current status
    res.cookie('userId', userId, { maxAge: 31536000000 });
    const pro = await isUserPro(userId);
    res.json({ success: true, isPro: pro });
  } catch (error) {
    console.error('Email login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
