// Local proxy server for testing subdomain setup
// This simulates the nginx reverse proxy locally

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve frontend static files
app.use(express.static('.'));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  logLevel: 'debug'
}));

// Proxy success/cancel routes to backend
app.use(['/success', '/cancel', '/admin'], createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  logLevel: 'debug'
}));

// Serve index.html for all other routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Local proxy server running on http://localhost:${PORT}`);
  console.log(`📁 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API proxy: http://localhost:${PORT}/api -> http://localhost:3001`);
  console.log('');
  console.log('📝 Make sure your backend is running on port 3001:');
  console.log('   cd backend && PORT=3001 npm run dev');
});
