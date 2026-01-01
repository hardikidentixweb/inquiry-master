const express = require('express');
const db = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all fields
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [fields] = await db.query(
      'SELECT * FROM custom_fields ORDER BY display_order ASC'
    );
    res.json({ fields });
  } catch (error) {
    console.error('Get fields error:', error);
    res.status(500).json({ message: 'Failed to fetch fields', error: error.message });
  }
});

// Create field (Admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { field_name, field_type, field_label, is_required = false, is_active = true, field_options } = req.body;

    if (!field_name || !field_type || !field_label) {
      return res.status(400).json({ message: 'Field name, type, and label are required' });
    }

    // Validate dropdown options
    if (field_type === 'select' && !field_options) {
      return res.status(400).json({ message: 'Dropdown options are required for select field type' });
    }

    // Get max display order
    const [maxOrder] = await db.query('SELECT MAX(display_order) as max_order FROM custom_fields');
    const displayOrder = (maxOrder[0]?.max_order || 0) + 1;

    const [result] = await db.query(
      'INSERT INTO custom_fields (field_name, field_type, field_label, is_required, is_active, display_order, field_options) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [field_name, field_type, field_label, is_required, is_active, displayOrder, field_options || null]
    );

    res.status(201).json({ message: 'Field created successfully', id: result.insertId });
  } catch (error) {
    console.error('Create field error:', error);
    res.status(500).json({ message: 'Failed to create field', error: error.message });
  }
});

// Update field (Admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { field_name, field_type, field_label, is_required, is_active, display_order, field_options } = req.body;

    // Validate dropdown options if field type is select
    if (field_type === 'select' && field_options === null) {
      return res.status(400).json({ message: 'Dropdown options are required for select field type' });
    }

    const updateFields = [];
    const params = [];

    if (field_name !== undefined) {
      updateFields.push('field_name = ?');
      params.push(field_name);
    }
    if (field_type !== undefined) {
      updateFields.push('field_type = ?');
      params.push(field_type);
    }
    if (field_label !== undefined) {
      updateFields.push('field_label = ?');
      params.push(field_label);
    }
    if (is_required !== undefined) {
      updateFields.push('is_required = ?');
      params.push(is_required);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }
    if (display_order !== undefined) {
      updateFields.push('display_order = ?');
      params.push(display_order);
    }
    if (field_options !== undefined) {
      updateFields.push('field_options = ?');
      params.push(field_options);
    }

    params.push(id);

    await db.query(
      `UPDATE custom_fields SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Field updated successfully' });
  } catch (error) {
    console.error('Update field error:', error);
    res.status(500).json({ message: 'Failed to update field', error: error.message });
  }
});

// Delete field (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete field values
    await db.query('DELETE FROM inquiry_field_values WHERE field_id = ?', [id]);
    
    // Delete field
    await db.query('DELETE FROM custom_fields WHERE id = ?', [id]);

    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Delete field error:', error);
    res.status(500).json({ message: 'Failed to delete field', error: error.message });
  }
});

// Update field order (Admin only)
router.post('/reorder', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { fieldOrders } = req.body; // Array of {id, display_order}

    if (!Array.isArray(fieldOrders)) {
      return res.status(400).json({ message: 'Field orders must be an array' });
    }

    for (const field of fieldOrders) {
      await db.query(
        'UPDATE custom_fields SET display_order = ? WHERE id = ?',
        [field.display_order, field.id]
      );
    }

    res.json({ message: 'Field order updated successfully' });
  } catch (error) {
    console.error('Reorder fields error:', error);
    res.status(500).json({ message: 'Failed to reorder fields', error: error.message });
  }
});

module.exports = router;

