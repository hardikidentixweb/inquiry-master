const express = require('express');
const db = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get global preferences (field visibility) - Readable by all users, admin-controlled
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    // Get preferences from app_settings (global settings)
    const [settings] = await db.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'column_preferences'"
    );

    if (settings.length === 0) {
      // Return default preferences (all fields visible)
      const [fields] = await db.query('SELECT id FROM custom_fields WHERE is_active = 1');
      const defaultPrefs = {
        visibleFields: fields.map(f => f.id),
        fieldOrder: fields.map(f => f.id),
        standardColumns: {
          id: true,
          client_name: true,
          client_email: true,
          client_phone: true,
          status: true,
          created_at: true,
          actions: true
        }
      };
      return res.json({ preferences: defaultPrefs });
    }

    const preferences = JSON.parse(settings[0].setting_value || '{}');
    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Failed to fetch preferences', error: error.message });
  }
});

// Update global preferences (Admin only) - Controls what all users see
router.post('/preferences', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { visibleFields, fieldOrder, standardColumns } = req.body;

    const preferences = JSON.stringify({ visibleFields, fieldOrder, standardColumns });

    // Store in app_settings as global preference
    await db.query(
      "INSERT INTO app_settings (setting_key, setting_value) VALUES ('column_preferences', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [preferences, preferences]
    );

    res.json({ message: 'Preferences saved successfully. All users will see this configuration.' });
  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(500).json({ message: 'Failed to save preferences', error: error.message });
  }
});

// Get app settings (Admin only)
router.get('/app', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM app_settings');
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });
    res.json({ settings: settingsObj });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

// Update app settings (Admin only)
router.post('/app', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
});

module.exports = router;

