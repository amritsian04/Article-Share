const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./articles.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (!row) {
        const hashedPassword = bcrypt.hashSync('admin', 10);
        db.run(
          'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
          ['admin', hashedPassword, 1],
          (err) => {
            if (err) {
              console.error('Error creating admin:', err);
            } else {
              console.log('Admin user created');
            }
          }
        );
      }
    });
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}


app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (row) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign(
          { id: this.lastID, username, isAdmin: false },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          token,
          user: { id: this.lastID, username, isAdmin: false }
        });
      }
    );
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin === 1 },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, isAdmin: user.is_admin === 1 }
    });
  });
});

app.get('/api/articles', authenticateToken, (req, res) => {
  db.all('SELECT * FROM articles ORDER BY created_at DESC', [], (err, articles) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching articles' });
    }
    res.json(articles);
  });
});

app.post('/api/articles', authenticateToken, (req, res) => {
  const { url, title } = req.body;
  const userId = req.user.id;
  const username = req.user.username;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const urlPattern = /^https?:\/\/.+/;
  if (!urlPattern.test(url)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  db.run(
    'INSERT INTO articles (url, title, user_id, username) VALUES (?, ?, ?, ?)',
    [url, title || url, userId, username],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating article' });
      }

      db.get('SELECT * FROM articles WHERE id = ?', [this.lastID], (err, article) => {
        if (err) {
          return res.status(500).json({ error: 'Error retrieving article' });
        }
        res.status(201).json(article);
      });
    }
  );
});

app.delete('/api/articles/:id', authenticateToken, (req, res) => {
  const articleId = req.params.id;
  const userId = req.user.id;
  const isAdmin = req.user.isAdmin;

  db.get('SELECT * FROM articles WHERE id = ?', [articleId], (err, article) => {
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (article.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run('DELETE FROM articles WHERE id = ?', [articleId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting article' });
      }
      res.json({ message: 'Article deleted' });
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
