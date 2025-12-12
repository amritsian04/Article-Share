import React, { useState } from 'react';
import axios from 'axios';

function ArticleForm({ onArticleCreated }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/articles', {
        url,
        title: title || url
      });

      onArticleCreated(response.data);
      setUrl('');
      setTitle('');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Error posting article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="article-form">
      <h2>Post New Article</h2>
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Article URL:</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Title (optional):</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Posting...' : 'Post Article'}
        </button>
      </form>
    </div>
  );
}

export default ArticleForm;
