const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase, prepare } = require('./database');
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet()); 
app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100 
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Article Share API running');
});

initDatabase().then(() => {
  app.use((req, res, next) => {
    req.db = { prepare };
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/articles', articleRoutes);

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
