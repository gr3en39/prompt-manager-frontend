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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Fetch prompts on load
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewPrompt({ title: '', content: '', tags: '' });
  };

  // Filter logic
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
      <header className="header">
        <h1>🤖 AI Prompt Manager</h1>
        <p>Store, search, and manage your AI prompts with version control</p>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="container">
        {/* Form Section */}
        <div className="form-section">
          <h2>{editingId ? 'Edit Prompt' : 'Add New Prompt'}</h2>
          <input
            type="text"
            placeholder="Prompt Title"
            value={newPrompt.title}
            onChange={e => setNewPrompt({ ...newPrompt, title: e.target.value })}
            className="input"
          />
          <textarea
            placeholder="Prompt Content"
            value={newPrompt.content}
            onChange={e => setNewPrompt({ ...newPrompt, content: e.target.value })}
            className="textarea"
            rows="6"
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={newPrompt.tags}
            onChange={e => setNewPrompt({ ...newPrompt, tags: e.target.value })}
            className="input"
          />
          <div className="button-group">
            <button onClick={savePrompt} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : editingId ? 'Update Prompt' : 'Add Prompt'}
            </button>
            {editingId && (
              <button onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 Search prompts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input search-input"
          />
          {allTags.length > 0 && (
            <div className="tags-filter">
              <button
                className={!selectedTag ? 'tag-btn active' : 'tag-btn'}
                onClick={() => setSelectedTag('')}
              >
                All Tags
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
        </div>

        {/* Prompts List */}
        <div className="prompts-section">
          <h2>{filtered.length} Prompt(s)</h2>
          {loading && <p>Loading...</p>}
          {!loading && filtered.length === 0 && <p>No prompts found.</p>}
          {filtered.map(prompt => (
            <div key={prompt.id} className="prompt-card">
              <div className="prompt-header">
                <h3>{prompt.title}</h3>
                <div className="prompt-actions">
                  <button onClick={() => copyToClipboard(prompt.content)} className="btn-copy">
                    📋 Copy
                  </button>
                  <button onClick={() => startEdit(prompt)} className="btn-edit">
                    ✏️ Edit
                  </button>
                  <button onClick={() => deletePrompt(prompt.id)} className="btn-delete">
                    🗑️ Delete
                  </button>
                </div>
              </div>
              <p className="prompt-content">{prompt.content}</p>
              {prompt.tags.length > 0 && (
                <div className="prompt-tags">
                  {prompt.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}