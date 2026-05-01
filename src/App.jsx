import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '', tags: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [swipeOpen, setSwipeOpen] = useState(null);
  const swipeRef = useRef({});

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const SESSION_KEY = 'promptManagerAuth';
  const SESSION_EXPIRY_DAYS = 2;

  // Check if user is already authenticated
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
        // Store auth with expiry
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
    setNewPrompt({ title: '', content: '', tags: '' });
    setSelectedPrompt(null);
    setEditingId(null);
  };

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchPrompts();
    }
  }, []);

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
        setNewPrompt({ title: '', content: '', tags: '' });
        setEditingId(null);
        setError('');
        setSelectedPrompt(null);
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

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        setPrompts(updatedPrompts);
        setSelectedPrompt(null);
        setSwipeOpen(null);
      }
    } catch (err) {
      setError('Failed to delete prompt');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert('Copied to clipboard!');
  };

  const startEdit = (prompt) => {
    setEditingId(prompt.id);
    setNewPrompt({
      title: prompt.title,
      content: prompt.content,
      tags: prompt.tags.join(', ')
    });
    setSelectedPrompt(prompt.id);
    setSwipeOpen(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewPrompt({ title: '', content: '', tags: '' });
  };

  const handleSwipeStart = (id, e) => {
    swipeRef.current[id] = { startX: e.touches[0].clientX };
  };

  const handleSwipeEnd = (id, e) => {
    if (!swipeRef.current[id]) return;

    const endX = e.changedTouches[0].clientX;
    const startX = swipeRef.current[id].startX;
    const diff = startX - endX;

    if (diff > 50) {
      setSwipeOpen(id);
      setSelectedPrompt(id);
    } else if (diff < -50) {
      setSwipeOpen(null);
    }

    swipeRef.current[id] = null;
  };

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🤖 Prompt Manager</h1>
          <p>Enter your password to continue</p>

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
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="session-info">Session expires in 2 days</p>
        </div>
      </div>
    );
  }

  // MAIN APP
  const allTags = [...new Set(prompts.flatMap(p => p.tags))];
  const filtered = prompts.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || p.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="app">
      <div className="container">
        {/* LEFT SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h1>Prompts</h1>
            <button onClick={handleLogout} className="logout-btn" title="Logout">
              ⏻
            </button>
          </div>

          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />

          {allTags.length > 0 && (
            <div className="tags-filter">
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
            {loading && <p className="loading">Loading...</p>}
            {!loading && filtered.length === 0 && <p className="empty">No prompts</p>}
            {filtered.map(prompt => (
              <div
                key={prompt.id}
                className={`prompt-item ${selectedPrompt === prompt.id ? 'active' : ''}`}
                onTouchStart={(e) => handleSwipeStart(prompt.id, e)}
                onTouchEnd={(e) => handleSwipeEnd(prompt.id, e)}
                onClick={() => {
                  setSelectedPrompt(prompt.id);
                  setSwipeOpen(null);
                }}
              >
                <div className="prompt-item-content">
                  <div className="prompt-item-title">{prompt.title}</div>
                  <div className="prompt-item-preview">{prompt.content.substring(0, 50)}...</div>
                  {prompt.tags.length > 0 && (
                    <div className="prompt-item-tags">
                      {prompt.tags.map(tag => (
                        <span key={tag} className="small-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                {swipeOpen === prompt.id && (
                  <div className="prompt-item-swipe">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(prompt); }} className="swipe-btn edit-btn">View</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="main-panel">
          {error && <div className="error-banner">{error}</div>}

          {selectedPrompt || editingId ? (
            <div className="editor">
              <div className="editor-header">
                <h2>{editingId ? 'Edit Prompt' : 'View Prompt'}</h2>
                {selectedPrompt && !editingId && (
                  <button onClick={() => startEdit(prompts.find(p => p.id === selectedPrompt))} className="btn-edit-header">
                    Edit
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Title"
                value={newPrompt.title}
                onChange={e => setNewPrompt({ ...newPrompt, title: e.target.value })}
                className="editor-input title-input"
              />

              <textarea
                placeholder="Content"
                value={newPrompt.content}
                onChange={e => setNewPrompt({ ...newPrompt, content: e.target.value })}
                className="editor-textarea"
                rows="10"
              />

              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={newPrompt.tags}
                onChange={e => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                className="editor-input tags-input"
              />

              {editingId && (
                <div className="editor-actions">
                  <button onClick={savePrompt} disabled={loading} className="btn-save">
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={cancelEdit} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              )}

              {selectedPrompt && !editingId && (
                <div className="viewer-actions">
                  <button onClick={() => copyToClipboard(prompts.find(p => p.id === selectedPrompt).content)} className="btn-copy">
                    Copy
                  </button>
                  <button onClick={() => deletePrompt(selectedPrompt)} className="btn-delete">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="new-prompt-form">
              <h2>Create New Prompt</h2>
              <input
                type="text"
                placeholder="Title"
                value={newPrompt.title}
                onChange={e => setNewPrompt({ ...newPrompt, title: e.target.value })}
                className="editor-input title-input"
              />

              <textarea
                placeholder="Content"
                value={newPrompt.content}
                onChange={e => setNewPrompt({ ...newPrompt, content: e.target.value })}
                className="editor-textarea"
                rows="10"
              />

              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={newPrompt.tags}
                onChange={e => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                className="editor-input tags-input"
              />

              <button onClick={savePrompt} disabled={loading} className="btn-save">
                {loading ? 'Saving...' : 'Create Prompt'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING BUTTON */}
      <button
        className="floating-btn"
        onClick={() => {
          setSelectedPrompt(null);
          setSwipeOpen(null);
          setNewPrompt({ title: '', content: '', tags: '' });
          setEditingId(null);
        }}
        title="New prompt"
      >
        +
      </button>
    </div>
  );
}