import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Settings.css';
import { FiArrowLeft } from 'react-icons/fi';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    visibleFields: [],
    fieldOrder: [],
    standardColumns: {
      id: true,
      client_name: true,
      client_email: true,
      client_phone: true,
      status: true,
      created_at: true,
      actions: true
    }
  });
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchFields();
    loadPreferences();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await axios.get('/api/fields');
      setFields(response.data.fields || []);
      
      // Initialize preferences if empty
      if (preferences.visibleFields.length === 0) {
        const allFieldIds = response.data.fields.map(f => f.id);
        setPreferences(prev => ({
          ...prev,
          visibleFields: allFieldIds,
          fieldOrder: allFieldIds
        }));
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await axios.get('/api/settings/preferences');
      if (response.data.preferences) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      await axios.post('/api/settings/preferences', preferences);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      alert('Failed to save preferences');
    }
  };

  const toggleFieldVisibility = (fieldId) => {
    const newVisibleFields = preferences.visibleFields.includes(fieldId)
      ? preferences.visibleFields.filter(id => id !== fieldId)
      : [...preferences.visibleFields, fieldId];
    
    setPreferences({
      ...preferences,
      visibleFields: newVisibleFields
    });
  };

  const moveField = (fieldId, direction) => {
    const currentIndex = preferences.fieldOrder.indexOf(fieldId);
    if (currentIndex === -1) return;

    const newOrder = [...preferences.fieldOrder];
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= newOrder.length) return;

    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    setPreferences({
      ...preferences,
      fieldOrder: newOrder
    });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(preferences.fieldOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPreferences({
      ...preferences,
      fieldOrder: items
    });
  };

  // Redirect non-admin users
  if (user?.role !== 'admin') {
    return (
      <div className="settings-container">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>Inquiry Master</h1>
          </div>
        </nav>
        <div className="settings-content">
          <div className="error-message">
            <h2>Access Denied</h2>
            <p>Only administrators can access settings. Please contact your admin.</p>
            <button onClick={() => navigate('/dashboard')} className="back-link btn-primary" style={{marginTop: '20px'}}>
              <FiArrowLeft /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  const sortedFields = fields.sort((a, b) => {
    const aIndex = preferences.fieldOrder.indexOf(a.id);
    const bIndex = preferences.fieldOrder.indexOf(b.id);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="settings-container">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>Inquiry Master</h1>
        </div>
        <div className="nav-user">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/inquiries" className="nav-link">Inquiries</Link>
        </div>
      </nav>

      <div className="settings-content">
        <div className="settings-header">
          <Link to="/dashboard" className="back-link">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <div className="settings-header-content">
            <h2>Settings (Admin Only)</h2>
            <p>Configure column visibility and field order for all users</p>
            <div className="admin-notice">
              <strong>Note:</strong> Changes here will apply to all users in the system.
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Field Visibility & Order</h3>
          <p className="section-description">
            Configure which columns are visible and in what order they appear in the inquiries list.
          </p>

          {saved && (
            <div className="success-message">
              Preferences saved successfully!
            </div>
          )}

          <div className="columns-section">
            <h4>Standard Columns</h4>
            <div className="standard-columns-grid">
              {[
                { key: 'id', label: 'ID' },
                { key: 'client_name', label: 'Client Name' },
                { key: 'client_email', label: 'Email' },
                { key: 'client_phone', label: 'Phone' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Created Date' },
                { key: 'actions', label: 'Actions' }
              ].map(col => (
                <div key={col.key} className="column-setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.standardColumns?.[col.key] !== false}
                      onChange={(e) => {
                        setPreferences({
                          ...preferences,
                          standardColumns: {
                            ...preferences.standardColumns,
                            [col.key]: e.target.checked
                          }
                        });
                      }}
                    />
                    <span>{col.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="columns-section">
            <h4>Custom Fields (Drag to reorder or use buttons)</h4>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="fields-settings">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="fields-list-settings">
                    {sortedFields.map((field, index) => {
                      const isVisible = preferences.visibleFields.includes(field.id);
                      return (
                        <Draggable key={field.id} draggableId={field.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`field-setting-item ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <div {...provided.dragHandleProps} className="drag-handle">☰</div>
                              <div className="field-info">
                                <span className="field-label">{field.field_label}</span>
                                <span className="field-type">{field.field_type}</span>
                              </div>
                              <div className="field-actions">
                                <button
                                  onClick={() => moveField(field.id, 'up')}
                                  disabled={index === 0}
                                  className="btn-icon"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => moveField(field.id, 'down')}
                                  disabled={index === sortedFields.length - 1}
                                  className="btn-icon"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  onClick={() => toggleFieldVisibility(field.id)}
                                  className={`toggle-btn ${isVisible ? 'visible' : ''}`}
                                  title={isVisible ? 'Hide field' : 'Show field'}
                                >
                                  {isVisible ? '👁️' : '🚫'}
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            {fields.length === 0 && (
              <div className="no-custom-fields">
                <p>No custom fields yet. {user?.role === 'admin' && (
                  <Link to="/admin">Create custom fields in Admin Dashboard</Link>
                )}</p>
              </div>
            )}
          </div>

          <button onClick={savePreferences} className="btn-primary save-btn">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

