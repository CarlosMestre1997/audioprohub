const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://audiocleaner.site',
    'https://audiocleaner.onrender.com',
    'https://carlosmestre1997.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Data directory
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Load users from file
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save users to file
async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Load subscriptions from file
async function loadSubscriptions() {
  try {
    const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save subscriptions to file
async function saveSubscriptions(subscriptions) {
  await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
}

// Generate JWT token
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email, type: 'audio_hub' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  );
}

// Verify JWT token middleware
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Audio Hub Auth' });
});

// Root endpoint for Render.com
app.get('/', (req, res) => {
  res.json({ 
    message: 'Audio Hub Auth API', 
    status: 'running',
    endpoints: [
      'POST /api/auth/signup',
      'POST /api/auth/login', 
      'GET /api/auth/verify',
      'GET /api/auth/subscription'
    ]
  });
});

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const users = await loadUsers();
    
    if (users[email]) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2);

    users[email] = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      subscription: 'free'
    };

    await saveUsers(users);

    const token = generateToken(userId, email);

    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        name,
        email,
        subscription: 'free'
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await loadUsers();
    const user = users[email];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
app.get('/api/auth/verify', verifyToken, async (req, res) => {
  try {
    const users = await loadUsers();
    const user = users[req.user.email];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user subscription status
app.get('/api/auth/subscription', verifyToken, async (req, res) => {
  try {
    const users = await loadUsers();
    const user = users[req.user.email];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      subscription: user.subscription,
      userId: user.id
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subscription (for Stripe webhooks)
app.post('/api/auth/subscription', verifyToken, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!['free', 'premium'].includes(subscription)) {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }

    const users = await loadUsers();
    const user = users[req.user.email];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.subscription = subscription;
    await saveUsers(users);

    res.json({
      success: true,
      message: 'Subscription updated',
      subscription: user.subscription
    });

  } catch (error) {
    console.error('Subscription update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize data directory
ensureDataDir();

// Start server
app.listen(PORT, () => {
  console.log(`Audio Hub Auth server running on port ${PORT}`);
});
