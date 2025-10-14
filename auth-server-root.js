const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

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

// Simple in-memory storage for testing
let users = {};

// Generate JWT token
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email, type: 'audio_hub' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  );
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Audio Hub Auth API', 
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/signup',
      'POST /api/auth/login', 
      'GET /api/auth/verify',
      'GET /api/health'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Audio Hub Auth',
    timestamp: new Date().toISOString()
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
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = users[decoded.email];

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

app.listen(PORT, () => {
  console.log(`Audio Hub Auth server running on port ${PORT}`);
});
