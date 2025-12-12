import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import ArticleList from './components/ArticleList';
import ArticleForm from './components/ArticleForm';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [articles, setArticles] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
      fetchArticles();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        id: payload.id,
        username: payload.username,
        isAdmin: payload.isAdmin
      });
    } catch (err) {
      console.error('Error decoding token:', err);
      handleLogout();
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await axios.get('/api/articles');
      setArticles(response.data);
    } catch (err) {
      setError('Error fetching articles');
    }
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(userData);
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setArticles([]);
  };

  const handleArticleCreated = (newArticle) => {
    setArticles(prev => [newArticle, ...prev]);
  };

  const handleArticleDeleted = async (articleId) => {
    try {
      await axios.delete(`/api/articles/${articleId}`);
      setArticles(articles.filter(article => article.id !== articleId));
    } catch (err) {
      setError(err.response?.data?.error || 'Error deleting article');
    }
  };

  if (!token) {
    return (
      <div className="container">
        {showRegister ? (
          <Register 
            onRegister={handleLogin} 
            onToggle={() => setShowRegister(false)} 
          />
        ) : (
          <Login 
            onLogin={handleLogin} 
            onToggle={() => setShowRegister(true)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Article Share</h1>
        <div className="header-info">
          <div>
            Logged in as: <strong>{user?.username}</strong>
            {user?.isAdmin && <span> (Admin)</span>}
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <ArticleForm onArticleCreated={handleArticleCreated} />
      
      <ArticleList 
        articles={articles} 
        currentUserId={user?.id}
        isAdmin={user?.isAdmin}
        onDelete={handleArticleDeleted}
      />
    </div>
  );
}

export default App;
