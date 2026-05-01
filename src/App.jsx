import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // App state
  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '', tags: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const SESSION_KEY = 'promptManagerAuth';
  const SESSION_EXPIRY_DAYS = 2;

  // Check auth on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem(SESSION_KEY);
    if (storedAuth) {
      const { password: savedPassword, timestamp } = JSON.parse(storedAuth);
      const expiryTime = timestamp + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (Date.now() < expiryTime) {
        setIsAuthenticated(true);
        setPassword(savedPassword);
        fetchPrompts(savedPassword);
        return;
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  // AUTHENTICATION
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          password,
          timestamp: Date.now()
        }));
        setIsAuthenticated(true);
        fetchPrompts(password);
      } else {
        setLoginError('Invalid password');
      }
    } catch (err) {
      setLoginError('Failed to connect to server');
      console.error(err);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setPassword('');
    setPrompts([]);
    resetForm();
  };

  // PROMPTS API
  const fetchPrompts = async (pwd = password) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/prompts`, {
        headers: { 'Authorization': `Bearer ${pwd}` }
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data = await response.json();
      setPrompts(data.prompts);
      setError('');
    } catch (err) {
      setError('Failed to load prompts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async () => {
    if (!newPrompt.title.trim() || !newPrompt.content.trim()) {
      setError('Title and content required');
      return;
    }

    try {
      setLoading(true);
      const tagArray = newPrompt.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      const updatedPrompts = editingId
        ? prompts.map(p =>
            p.id === editingId
              ? { ...p, title: newPrompt.title, content: newPrompt.content, tags: tagArray }
              : p
          )
        : [
            ...prompts,
            {
              id: Math.max(...prompts.map(p => p.id), 0) + 1,
              title: newPrompt.title,
              content: newPrompt.content,
              tags: tagArray
            }
          ];

      const response = await fetch(`${API_URL}/api/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ prompts: updatedPrompts })
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        setPrompts(updatedPrompts);
        resetForm();
        setError('');
      }
    } catch (err) {
      setError('Failed to save prompt');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deletePrompt = async (id) => {
    if (!confirm('Delete this prompt?')) return;

    try {
      setLoading(true);
      const updatedPrompts = prompts.filter(p => p.id !== id);
      const response = await fetch(`${API_URL}/api/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ prompts: updatedPrompts })
      });

      if (response.ok) {
        setPrompts(updatedPrompts);
        resetForm();
      }
    } catch (err) {
      setError('Failed to delete prompt');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert('Copied!');
  };

  const resetForm = () => {
    setNewPrompt({ title: '', content: '', tags: '' });
    setEditingId(null);
    setSelectedPromptId(null);
  };

  const startEdit = (prompt) => {
    setSelectedPromptId(prompt.id);
    setEditingId(prompt.id);
    setNewPrompt({
      title: prompt.title,
      content: prompt.content,
      tags: prompt.tags.join(', ')
    });
  };

  const cancelEdit = () => {
    resetForm();
  };

  // FILTERING
  const allTags = [...new Set(prompts.flatMap(p => p.tags))];
  const filtered = prompts.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || p.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  // ============================================
  // RENDER LOGIN
  // ============================================
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🤖 Prompt Manager</h1>
          <p>Enter your password</p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="login-input"
              autoFocus
            />

            {loginError && <div className="login-error">{loginError}</div>}

            <button type="submit" disabled={loginLoading} className="login-btn">
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER MAIN APP
  // ============================================
  return (
    <div className={`app-container ${selectedPromptId ? 'has-selection' : ''}`}>
      {/* SIDEBAR (Desktop) / TOP (Mobile) */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Prompts</h1>
          <div className="sidebar-actions">
            <button
              onClick={() => resetForm()}
              className="icon-btn new-btn"
              title="New prompt"
            >
              ⊕
            </button>
            <button
              onClick={handleLogout}
              className="icon-btn logout-btn"
              title="Logout"
            >
              ⏻
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-box"
        />

        {allTags.length > 0 && (
          <div className="tag-buttons">
            <button
              className={!selectedTag ? 'tag-btn active' : 'tag-btn'}
              onClick={() => setSelectedTag('')}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={selectedTag === tag ? 'tag-btn active' : 'tag-btn'}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="prompts-list">
          {loading && <p className="status-text">Loading...</p>}
          {!loading && filtered.length === 0 && (
            <p className="status-text">No prompts found</p>
          )}
          {filtered.map(prompt => (
            <div
              key={prompt.id}
              className={`prompt-item ${selectedPromptId === prompt.id ? 'active' : ''}`}
              onClick={() => startEdit(prompt)}
            >
              <div className="prompt-item-title">{prompt.title}</div>
              <div className="prompt-item-preview">
                {prompt.content.substring(0, 40)}...
              </div>
              {prompt.tags.length > 0 && (
                <div className="prompt-tags">
                  {prompt.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="tag-badge">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {error && <div className="error-box">{error}</div>}

        {selectedPromptId && selectedPrompt ? (
          // VIEW/EDIT MODE
          <div className="form-container">
            <div className="form-header">
              <button onClick={() => resetForm()} className="back-btn">← Back</button>
              <h2>{editingId ? 'Edit Prompt' : 'View Prompt'}</h2>
            </div>

            <input
              type="text"
              placeholder="Title"
              value={newPrompt.title}
              onChange={e => setNewPrompt({ ...newPrompt, title: e.target.value })}
              className="form-input"
              disabled={!editingId}
            />

            <textarea
              placeholder="Content"
              value={newPrompt.content}
              onChange={e => setNewPrompt({ ...newPrompt, content: e.target.value })}
              className="form-textarea"
              disabled={!editingId}
            />

            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={newPrompt.tags}
              onChange={e => setNewPrompt({ ...newPrompt, tags: e.target.value })}
              className="form-input"
              disabled={!editingId}
            />

            <div className="button-group">
              {editingId ? (
                <>
                  <button
                    onClick={savePrompt}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={cancelEdit} className="btn btn-secondary">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingId(selectedPromptId)}
                    className="btn btn-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => copyToClipboard(selectedPrompt.content)}
                    className="btn btn-secondary"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => deletePrompt(selectedPromptId)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          // CREATE MODE
          <div className="form-container">
            <h2>Create New Prompt</h2>

            <input
              type="text"
              placeholder="Title"
              value={newPrompt.title}
              onChange={e => setNewPrompt({ ...newPrompt, title: e.target.value })}
              className="form-input"
            />

            <textarea
              placeholder="Content"
              value={newPrompt.content}
              onChange={e => setNewPrompt({ ...newPrompt, content: e.target.value })}
              className="form-textarea"
            />

            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={newPrompt.tags}
              onChange={e => setNewPrompt({ ...newPrompt, tags: e.target.value })}
              className="form-input"
            />

            <button
              onClick={savePrompt}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Creating...' : 'Create Prompt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}