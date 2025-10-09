// Simple test file to verify backend is working
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ 
    message: 'Audio Hub Auth API - Test Version', 
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
    service: 'Audio Hub Auth - Test',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/signup', (req, res) => {
  res.json({
    success: true,
    message: 'Test signup endpoint working',
    data: req.body
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Test login endpoint working',
    data: req.body
  });
});

app.listen(PORT, () => {
  console.log(`Audio Hub Auth Test server running on port ${PORT}`);
});
