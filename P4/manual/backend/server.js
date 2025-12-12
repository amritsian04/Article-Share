const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase, prepare } = require('./database');
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: 'http://localhost:3000', // React app
  credentials: true
}));

// Rate limiting to prevent brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database and start server
initDatabase().then(() => {
  // Make db helper available to routes
  app.use((req, res, next) => {
    req.db = { prepare };
    next();
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/articles', articleRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
