import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX } from 'react-icons/fi';
import './InquiryForm.css';

const InquiryForm = ({ inquiry, fields, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    inquiry_text: '',
    status: 'new',
    inquiry_date: new Date().toISOString().split('T')[0], // Default to today
    customFields: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCustomFields = async (inquiryId) => {
    if (!inquiryId) return;
    try {
      const response = await axios.get(`/api/inquiries/${inquiryId}`);
      const customFields = {};
      response.data.inquiry.customFields?.forEach(cf => {
        customFields[cf.field_id] = cf.field_value;
      });
      setFormData(prev => ({ ...prev, customFields }));
    } catch (error) {
      console.error('Failed to load custom fields:', error);
    }
  };

  useEffect(() => {
    if (inquiry) {
      // Format inquiry_date for date input (YYYY-MM-DD)
      let inquiryDate = '';
      if (inquiry.inquiry_date) {
        inquiryDate = inquiry.inquiry_date.split('T')[0]; // Extract date part if it's a datetime string
      } else if (inquiry.created_at) {
        inquiryDate = new Date(inquiry.created_at).toISOString().split('T')[0];
      } else {
        inquiryDate = new Date().toISOString().split('T')[0];
      }
      
      setFormData({
        client_name: inquiry.client_name || '',
        client_email: inquiry.client_email || '',
        client_phone: inquiry.client_phone || '',
        inquiry_text: inquiry.inquiry_text || '',
        status: inquiry.status || 'new',
        inquiry_date: inquiryDate,
        customFields: {}
      });
      loadCustomFields(inquiry.id);
    }
  }, [inquiry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const customFieldsArray = Object.entries(formData.customFields).map(([field_id, value]) => ({
        field_id: parseInt(field_id),
        value: value || ''
      }));

      if (inquiry) {
        await axios.put(`/api/inquiries/${inquiry.id}`, {
          ...formData,
          customFields: customFieldsArray
        });
      } else {
        await axios.post('/api/inquiries', {
          ...formData,
          customFields: customFieldsArray
        });
      }

      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save inquiry');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCustomFieldChange = (fieldId, value) => {
    setFormData({
      ...formData,
      customFields: {
        ...formData.customFields,
        [fieldId]: value
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{inquiry ? 'Edit Inquiry' : 'Add New Inquiry'}</h3>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Client Name *</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Client Email *</label>
              <input
                type="email"
                name="client_email"
                value={formData.client_email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Client Phone</label>
              <input
                type="tel"
                name="client_phone"
                value={formData.client_phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Inquiry Date *</label>
              <input
                type="date"
                name="inquiry_date"
                value={formData.inquiry_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="quoted">Quoted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Inquiry Text</label>
            <textarea
              name="inquiry_text"
              value={formData.inquiry_text}
              onChange={handleChange}
              rows="4"
            />
          </div>

          {fields.filter(f => f.is_active).map(field => {
            let fieldOptions = [];
            if (field.field_type === 'select' && field.field_options) {
              try {
                fieldOptions = typeof field.field_options === 'string' 
                  ? JSON.parse(field.field_options) 
                  : field.field_options;
              } catch (e) {
                fieldOptions = [];
              }
            }

            return (
              <div className="form-group" key={field.id}>
                <label>
                  {field.field_label}
                  {field.is_required ? ' *' : ''}
                </label>
                {field.field_type === 'textarea' ? (
                  <textarea
                    value={formData.customFields[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    required={field.is_required}
                    rows="3"
                  />
                ) : field.field_type === 'select' ? (
                  <select
                    value={formData.customFields[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    required={field.is_required}
                  >
                    <option value="">-- Select --</option>
                    {fieldOptions.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'date' ? 'date' : 'text'}
                    value={formData.customFields[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    required={field.is_required}
                  />
                )}
              </div>
            );
          })}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InquiryForm;

