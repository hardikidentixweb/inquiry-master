import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';
import { FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiSave } from 'react-icons/fi';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [fields, setFields] = useState([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldForm, setFieldForm] = useState({
    field_name: '',
    field_type: 'text',
    field_label: '',
    is_required: false,
    is_active: true,
    field_options: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }
    fetchFields();
  }, [user]);

  const fetchFields = async () => {
    try {
      const response = await axios.get('/api/fields');
      setFields(response.data.fields || []);
    } catch (error) {
      console.error('Failed to fetch fields:', error);
      setError('Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate dropdown options
    let validOptions = fieldForm.field_options || [];
    if (fieldForm.field_type === 'select') {
      validOptions = fieldForm.field_options.filter(opt => opt.trim() !== '');
      if (validOptions.length === 0) {
        setError('Please add at least one dropdown option');
        return;
      }
    }

    try {
      const submitData = {
        ...fieldForm,
        field_options: fieldForm.field_type === 'select' 
          ? JSON.stringify(validOptions) 
          : null
      };

      if (editingField) {
        await axios.put(`/api/fields/${editingField.id}`, submitData);
        setSuccess('Field updated successfully');
      } else {
        await axios.post('/api/fields', submitData);
        setSuccess('Field created successfully');
      }
      
      setShowFieldForm(false);
      setEditingField(null);
      setFieldForm({
        field_name: '',
        field_type: 'text',
        field_label: '',
        is_required: false,
        is_active: true,
        field_options: []
      });
      fetchFields();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save field');
    }
  };

  const handleEdit = (field) => {
    setEditingField(field);
    let fieldOptions = [];
    if (field.field_options) {
      try {
        fieldOptions = typeof field.field_options === 'string' 
          ? JSON.parse(field.field_options) 
          : field.field_options;
      } catch (e) {
        fieldOptions = [];
      }
    }
    setFieldForm({
      field_name: field.field_name,
      field_type: field.field_type,
      field_label: field.field_label,
      is_required: field.is_required,
      is_active: field.is_active,
      field_options: fieldOptions
    });
    setShowFieldForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this field? All associated values will be deleted.')) {
      return;
    }

    try {
      await axios.delete(`/api/fields/${id}`);
      setSuccess('Field deleted successfully');
      fetchFields();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete field');
    }
  };

  const toggleFieldActive = async (field) => {
    try {
      await axios.put(`/api/fields/${field.id}`, {
        is_active: !field.is_active
      });
      fetchFields();
    } catch (err) {
      setError('Failed to update field');
    }
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-container">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>Inquiry Master - Admin</h1>
        </div>
        <div className="nav-user">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/inquiries" className="nav-link">Inquiries</Link>
          <Link to="/settings" className="nav-link">Settings</Link>
        </div>
      </nav>

      <div className="admin-content">
        <div className="admin-header">
          <Link to="/dashboard" className="back-link">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <h2>Admin Dashboard</h2>
          <p>Manage custom fields and application settings</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="admin-section">
          <div className="section-header">
            <h3>Custom Fields Management</h3>
            <button
              onClick={() => {
                setShowFieldForm(true);
                setEditingField(null);
                setFieldForm({
                  field_name: '',
                  field_type: 'text',
                  field_label: '',
                  is_required: false,
                  is_active: true,
                  field_options: []
                });
              }}
              className="btn-primary"
            >
              <FiPlus /> Add Field
            </button>
          </div>

          {showFieldForm && (
            <div className="field-form-section">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  

                  <div className="form-group">
                    <label>Field Label (display) *</label>
                    <input
                      type="text"
                      value={fieldForm.field_label}
                      onChange={(e) => setFieldForm({ ...fieldForm, field_label: e.target.value })}
                      required
                      placeholder="e.g., Company Name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Field Name (internal) *</label>
                    <input
                      type="text"
                      value={fieldForm.field_name}
                      onChange={(e) => setFieldForm({ ...fieldForm, field_name: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                      required
                      disabled={!!editingField}
                      placeholder="e.g., company_name"
                    />
                    <small>No spaces, lowercase, underscores allowed</small>
                  </div>

                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Field Type *</label>
                    <select
                      value={fieldForm.field_type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setFieldForm({ 
                          ...fieldForm, 
                          field_type: newType,
                          field_options: newType === 'select' ? (fieldForm.field_options || []) : []
                        });
                      }}
                      required
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="date">Date</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Dropdown</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Options</label>
                    <div className="checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={fieldForm.is_required}
                          onChange={(e) => setFieldForm({ ...fieldForm, is_required: e.target.checked })}
                        />
                        Required field
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={fieldForm.is_active}
                          onChange={(e) => setFieldForm({ ...fieldForm, is_active: e.target.checked })}
                        />
                        Active (visible)
                      </label>
                    </div>
                  </div>
                </div>

                {fieldForm.field_type === 'select' && (
                  <div className="form-group">
                    <label>Dropdown Options *</label>
                    <small>Add options for the dropdown field</small>
                    {fieldForm.field_options.map((option, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...fieldForm.field_options];
                            newOptions[index] = e.target.value;
                            setFieldForm({ ...fieldForm, field_options: newOptions });
                          }}
                          placeholder="Option value"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = fieldForm.field_options.filter((_, i) => i !== index);
                            setFieldForm({ ...fieldForm, field_options: newOptions });
                          }}
                          className="btn-icon btn-danger"
                          title="Remove option"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFieldForm({
                          ...fieldForm,
                          field_options: [...fieldForm.field_options, '']
                        });
                      }}
                      className="btn-secondary"
                      style={{ marginTop: '8px' }}
                    >
                      <FiPlus /> Add Option
                    </button>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFieldForm(false);
                      setEditingField(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <FiSave /> {editingField ? 'Update' : 'Create'} Field
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="fields-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Field Label</th>
                  <th>Field Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      No custom fields yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  fields.map((field) => (
                    <tr key={field.id}>
                      <td>{field.field_label}</td>
                      <td>{field.field_name}</td>
                      <td>
                        <span className="badge">{field.field_type}</span>
                      </td>
                      <td>
                        {field.is_required ? (
                          <span className="badge badge-success">Yes</span>
                        ) : (
                          <span className="badge badge-secondary">No</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleFieldActive(field)}
                          className={`status-toggle ${field.is_active ? 'active' : 'inactive'}`}
                        >
                          {field.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(field)}
                            className="btn-icon"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(field.id)}
                            className="btn-icon btn-danger"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

