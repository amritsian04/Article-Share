const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all articles
router.get('/', authenticateToken, (req, res) => {
  try {
    const articles = req.db.prepare(`
      SELECT articles.*, users.username 
      FROM articles 
      JOIN users ON articles.user_id = users.id 
      ORDER BY articles.created_at DESC
    `).all();
    
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new article
router.post('/',
  authenticateToken,
  [
    body('url').trim().isURL().withMessage('Must be a valid URL'),
    body('title').optional().trim().escape()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url, title } = req.body;
    const userId = req.user.id;

    try {
      const result = req.db.prepare('INSERT INTO articles (url, title, user_id) VALUES (?, ?, ?)').run(url, title || url, userId);
      
      // Return the created article
      const article = req.db.prepare(`
        SELECT articles.*, users.username 
        FROM articles 
        JOIN users ON articles.user_id = users.id 
        WHERE articles.id = ?
      `).get(result.lastInsertRowid);
      
      res.status(201).json(article);
    } catch (error) {
      console.error('Error creating article:', error);
      res.status(500).json({ error: 'Error creating article' });
    }
  }
);

// Delete article
router.delete('/:id', authenticateToken, (req, res) => {
  const articleId = req.params.id;
  const userId = req.user.id;
  const isAdmin = req.user.isAdmin;

  try {
    // First check if article exists and get owner
    const article = req.db.prepare('SELECT user_id FROM articles WHERE id = ?').get(articleId);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Check if user owns the article or is admin
    if (article.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this article' });
    }

    // Delete the article
    req.db.prepare('DELETE FROM articles WHERE id = ?').run(articleId);
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Error deleting article' });
  }
});

module.exports = router;
