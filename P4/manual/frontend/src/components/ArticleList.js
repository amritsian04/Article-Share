import React from 'react';

function ArticleList({ articles, currentUserId, isAdmin, onDelete }) {
  const canDelete = (article) => {
    return article.user_id === currentUserId || isAdmin;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="article-list">
      <h2>Shared Articles</h2>
      {articles.length === 0 ? (
        <p style={{ color: '#7f8c8d', marginTop: '20px' }}>
          No articles posted yet. Be the first to share!
        </p>
      ) : (
        articles.map((article) => (
          <div key={article.id} className="article-item">
            <div className="article-info">
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="article-url"
              >
                {article.title || article.url}
              </a>
              <div className="article-meta">
                Posted by <strong>{article.username}</strong> on {formatDate(article.created_at)}
              </div>
            </div>
            {canDelete(article) && (
              <button 
                className="delete-btn"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this article?')) {
                    onDelete(article.id);
                  }
                }}
              >
                Delete
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default ArticleList;
