const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

let db = {
  users: [],
  articles: [],
  nextUserId: 1,
  nextArticleId: 1
};

function loadDatabase() {
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    db = JSON.parse(data);
  } else {
    const adminPassword = 'admin';
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.users.push({
      id: db.nextUserId++,
      username: 'admin',
      password_hash: hash,
      is_admin: 1,
      created_at: new Date().toISOString()
    });
    saveDatabase();
    console.log('Admin user created successfully');
  }
}

function saveDatabase() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

async function initDatabase() {
  loadDatabase();
  return db;
}

function prepare(query) {
  return {
    get: function(...params) {
      if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE username')) {
        const username = params[0];
        return db.users.find(u => u.username === username) || null;
      }
      if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id')) {
        const id = params[0];
        return db.users.find(u => u.id === id) || null;
      }
      if (query.includes('SELECT') && query.includes('articles') && query.includes('WHERE id')) {
        const id = parseInt(params[0]);
        const article = db.articles.find(a => a.id === id);
        if (!article) return null;
        const user = db.users.find(u => u.id === article.user_id);
        return { ...article, username: user?.username };
      }
      if (query.includes('SELECT user_id') && query.includes('articles')) {
        const id = parseInt(params[0]);
        return db.articles.find(a => a.id === id) || null;
      }
      return null;
    },
    all: function(...params) {
      if (query.includes('SELECT articles.*, users.username')) {
        return db.articles.map(article => {
          const user = db.users.find(u => u.id === article.user_id);
          return { ...article, username: user?.username };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      return [];
    },
    run: function(...params) {
      if (query.includes('INSERT INTO users')) {
        const [username, password_hash] = params;
        const newUser = {
          id: db.nextUserId++,
          username,
          password_hash,
          is_admin: 0,
          created_at: new Date().toISOString()
        };
        db.users.push(newUser);
        saveDatabase();
        return { lastInsertRowid: newUser.id };
      }
      if (query.includes('INSERT INTO articles')) {
        const [url, title, user_id] = params;
        const newArticle = {
          id: db.nextArticleId++,
          url,
          title,
          user_id,
          created_at: new Date().toISOString()
        };
        db.articles.push(newArticle);
        saveDatabase();
        return { lastInsertRowid: newArticle.id };
      }
      if (query.includes('DELETE FROM articles')) {
        const id = parseInt(params[0]);
        db.articles = db.articles.filter(a => a.id !== id);
        saveDatabase();
        return {};
      }
      return {};
    }
  };
}

module.exports = { initDatabase, saveDatabase, prepare, DB_PATH };
