const express = require('express');
const XLSX = require('xlsx');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// Export inquiries as Excel
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { status, startDate, endDate, format = 'xlsx' } = req.query;
    
    let query = 'SELECT * FROM inquiries WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC';

    const [inquiries] = await db.query(query, params);
    
    // Get custom fields
    const [fields] = await db.query('SELECT * FROM custom_fields WHERE is_active = 1 ORDER BY display_order');

    // Prepare data for export
    const exportData = await Promise.all(inquiries.map(async (inquiry) => {
      const row = {
        'ID': inquiry.id,
        'Client Name': inquiry.client_name,
        'Client Email': inquiry.client_email,
        'Client Phone': inquiry.client_phone || '',
        'Inquiry Text': inquiry.inquiry_text || '',
        'Status': inquiry.status,
        'Created At': moment(inquiry.created_at).format('YYYY-MM-DD HH:mm:ss'),
        'Updated At': moment(inquiry.updated_at).format('YYYY-MM-DD HH:mm:ss')
      };

      // Add custom fields
      const [fieldValues] = await db.query(
        'SELECT * FROM inquiry_field_values WHERE inquiry_id = ?',
        [inquiry.id]
      );

      fields.forEach(field => {
        const fieldValue = fieldValues.find(fv => fv.field_id === field.id);
        row[field.field_label] = fieldValue ? fieldValue.field_value : '';
      });

      return row;
    }));

    if (format === 'csv') {
      // Generate CSV
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=inquiries_${moment().format('YYYY-MM-DD')}.csv`);
      res.send(csv);
    } else {
      // Generate Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inquiries');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=inquiries_${moment().format('YYYY-MM-DD')}.xlsx`);
      res.send(buffer);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export data', error: error.message });
  }
});

// Get report statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE DATE(created_at) >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE DATE(created_at) <= ?';
      params.push(endDate);
    }

    // Status-wise counts
    const [statusCounts] = await db.query(
      `SELECT status, COUNT(*) as count FROM inquiries ${dateFilter} GROUP BY status`,
      params
    );

    // Total count
    const [total] = await db.query(
      `SELECT COUNT(*) as total FROM inquiries ${dateFilter}`,
      params
    );

    // Date-wise counts
    const [dateCounts] = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM inquiries ${dateFilter} GROUP BY DATE(created_at) ORDER BY date DESC`,
      params
    );

    res.json({
      total: total[0].total,
      statusCounts,
      dateCounts
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
});

module.exports = router;

