import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '', tags: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/prompts`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: updatedPrompts })
      });

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: updatedPrompts })
      });

      if (response.ok) {
        setPrompts(updatedPrompts);
        setSelectedPrompt(null);
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewPrompt({ title: '', content: '', tags: '' });
  };

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
            <span className="count">{filtered.length}</span>
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
                onClick={() => setSelectedPrompt(prompt.id)}
              >
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
    </div>
  );
}