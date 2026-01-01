const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all inquiries with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, startDate, endDate, search } = req.query;
    let query = 'SELECT * FROM inquiries WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND DATE(COALESCE(inquiry_date, created_at)) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(COALESCE(inquiry_date, created_at)) <= ?';
      params.push(endDate);
    }

    if (search) {
      query += ' AND (client_name LIKE ? OR client_email LIKE ? OR inquiry_text LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY COALESCE(inquiry_date, created_at) DESC';

    const [inquiries] = await db.query(query, params);
    
    // Get dynamic fields
    const [fields] = await db.query('SELECT * FROM custom_fields WHERE is_active = 1 ORDER BY display_order');

    // Get custom field values for all inquiries
    const inquiryIds = inquiries.map(i => i.id);
    if (inquiryIds.length > 0) {
      const placeholders = inquiryIds.map(() => '?').join(',');
      const [fieldValues] = await db.query(
        `SELECT * FROM inquiry_field_values WHERE inquiry_id IN (${placeholders})`,
        inquiryIds
      );

      // Map field values to inquiries
      inquiries.forEach(inquiry => {
        inquiry.customFieldValues = {};
        fieldValues
          .filter(fv => fv.inquiry_id === inquiry.id)
          .forEach(fv => {
            inquiry.customFieldValues[fv.field_id] = fv.field_value;
          });
      });
    }

    res.json({ inquiries: inquiries, fields: fields });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries', error: error.message });
  }
});

// Get single inquiry
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [inquiries] = await db.query('SELECT * FROM inquiries WHERE id = ?', [id]);

    if (inquiries.length === 0) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    const inquiry = inquiries[0];
    
    // Get custom field values
    const [fieldValues] = await db.query(
      'SELECT * FROM inquiry_field_values WHERE inquiry_id = ?',
      [id]
    );

    inquiry.customFields = fieldValues;

    res.json({ inquiry });
  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({ message: 'Failed to fetch inquiry', error: error.message });
  }
});

// Create inquiry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { client_name, client_email, client_phone, inquiry_text, status = 'new', inquiry_date, customFields } = req.body;

    if (!client_name || !client_email) {
      return res.status(400).json({ message: 'Client name and email are required' });
    }

    // Use provided inquiry_date or default to today's date
    const inquiryDate = inquiry_date || new Date().toISOString().split('T')[0];

    const [result] = await db.query(
      'INSERT INTO inquiries (client_name, client_email, client_phone, inquiry_text, status, inquiry_date) VALUES (?, ?, ?, ?, ?, ?)',
      [client_name, client_email, client_phone || null, inquiry_text || null, status, inquiryDate]
    );

    const inquiryId = result.insertId;

    // Save custom field values
    if (customFields && Array.isArray(customFields)) {
      for (const field of customFields) {
        if (field.field_id && field.value) {
          await db.query(
            'INSERT INTO inquiry_field_values (inquiry_id, field_id, field_value) VALUES (?, ?, ?)',
            [inquiryId, field.field_id, field.value]
          );
        }
      }
    }

    res.status(201).json({ message: 'Inquiry created successfully', id: inquiryId });
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({ message: 'Failed to create inquiry', error: error.message });
  }
});

// Update inquiry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { client_name, client_email, client_phone, inquiry_text, status, inquiry_date, customFields } = req.body;

    await db.query(
      'UPDATE inquiries SET client_name = ?, client_email = ?, client_phone = ?, inquiry_text = ?, status = ?, inquiry_date = ? WHERE id = ?',
      [client_name, client_email, client_phone || null, inquiry_text || null, status, inquiry_date || null, id]
    );

    // Update custom field values
    if (customFields && Array.isArray(customFields)) {
      // Delete existing values
      await db.query('DELETE FROM inquiry_field_values WHERE inquiry_id = ?', [id]);
      
      // Insert new values
      for (const field of customFields) {
        if (field.field_id && field.value !== undefined) {
          await db.query(
            'INSERT INTO inquiry_field_values (inquiry_id, field_id, field_value) VALUES (?, ?, ?)',
            [id, field.field_id, field.value]
          );
        }
      }
    }

    res.json({ message: 'Inquiry updated successfully' });
  } catch (error) {
    console.error('Update inquiry error:', error);
    res.status(500).json({ message: 'Failed to update inquiry', error: error.message });
  }
});

// Delete inquiry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete field values first
    await db.query('DELETE FROM inquiry_field_values WHERE inquiry_id = ?', [id]);
    
    // Delete inquiry
    await db.query('DELETE FROM inquiries WHERE id = ?', [id]);

    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ message: 'Failed to delete inquiry', error: error.message });
  }
});

module.exports = router;

