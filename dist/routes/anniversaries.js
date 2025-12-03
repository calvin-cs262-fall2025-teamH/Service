"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Service/src/routes/anniversaries.ts
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
// Middleware to verify JWT token
const authenticate = (req, res, next) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!token)
            return res.status(401).json({ error: 'No token provided' });
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = payload.id;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
// GET /api/anniversaries - Get all anniversaries for the user
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        // Get user's partnership
        const partnershipResult = await (0, db_1.query)(`SELECT id FROM partnerships
       WHERE (user1_id = $1 OR user2_id = $1) AND is_active = TRUE
       LIMIT 1`, [userId]);
        const partnershipId = partnershipResult.rows[0]?.id || null;
        // Get anniversaries (both personal and shared)
        const result = await (0, db_1.query)(`SELECT
        a.*,
        u.email as partner_email
      FROM anniversaries a
      LEFT JOIN partnerships p ON a.partnership_id = p.id
      LEFT JOIN users u ON (
        CASE
          WHEN p.user1_id = $1 THEN p.user2_id
          WHEN p.user2_id = $1 THEN p.user1_id
          ELSE NULL
        END
      ) = u.id
      WHERE a.added_by_user_id = $1
         OR a.partnership_id = $2
      ORDER BY a.start_date ASC`, [userId, partnershipId]);
        // Transform database fields to match frontend expectations
        const anniversaries = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            anniversary_date: row.start_date, // Map start_date to anniversary_date
            repeat_yearly: row.recurrence_type === 'yearly',
            reminder_days_before: 7, // Default, can be added to schema later
            notes: row.description,
            partner_email: row.partner_email,
        }));
        res.json(anniversaries);
    }
    catch (error) {
        console.error('Get anniversaries error:', error);
        res.status(500).json({ error: 'Failed to fetch anniversaries' });
    }
});
// POST /api/anniversaries - Create new anniversary
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { title, anniversary_date, repeat_yearly, reminder_days_before, notes } = req.body;
        if (!title || !anniversary_date) {
            return res.status(400).json({ error: 'Title and date are required' });
        }
        // Get user's partnership (if any)
        const partnershipResult = await (0, db_1.query)(`SELECT id FROM partnerships
       WHERE (user1_id = $1 OR user2_id = $1) AND is_active = TRUE
       LIMIT 1`, [userId]);
        const partnershipId = partnershipResult.rows[0]?.id || null;
        // Insert anniversary
        const result = await (0, db_1.query)(`INSERT INTO anniversaries
        (partnership_id, added_by_user_id, title, description, start_date, recurrence_type, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [
            partnershipId,
            userId,
            title,
            notes || null,
            anniversary_date,
            repeat_yearly ? 'yearly' : 'none',
            '❤️'
        ]);
        const anniversary = result.rows[0];
        // Transform to match frontend format
        res.json({
            id: anniversary.id,
            title: anniversary.title,
            anniversary_date: anniversary.start_date,
            repeat_yearly: anniversary.recurrence_type === 'yearly',
            reminder_days_before: reminder_days_before || 7,
            notes: anniversary.description,
        });
    }
    catch (error) {
        console.error('Create anniversary error:', error);
        res.status(500).json({ error: 'Failed to create anniversary' });
    }
});
// PUT /api/anniversaries/:id - Update anniversary
router.put('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const anniversaryId = parseInt(req.params.id);
        const { title, anniversary_date, repeat_yearly, reminder_days_before, notes } = req.body;
        // Verify user owns this anniversary
        const checkResult = await (0, db_1.query)('SELECT id FROM anniversaries WHERE id = $1 AND added_by_user_id = $2', [anniversaryId, userId]);
        if (!checkResult.rows.length) {
            return res.status(404).json({ error: 'Anniversary not found or unauthorized' });
        }
        // Update anniversary
        const result = await (0, db_1.query)(`UPDATE anniversaries
       SET title = $1,
           description = $2,
           start_date = $3,
           recurrence_type = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`, [
            title,
            notes || null,
            anniversary_date,
            repeat_yearly ? 'yearly' : 'none',
            anniversaryId
        ]);
        const anniversary = result.rows[0];
        res.json({
            id: anniversary.id,
            title: anniversary.title,
            anniversary_date: anniversary.start_date,
            repeat_yearly: anniversary.recurrence_type === 'yearly',
            reminder_days_before: reminder_days_before || 7,
            notes: anniversary.description,
        });
    }
    catch (error) {
        console.error('Update anniversary error:', error);
        res.status(500).json({ error: 'Failed to update anniversary' });
    }
});
// DELETE /api/anniversaries/:id - Delete anniversary
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const anniversaryId = parseInt(req.params.id);
        // Verify user owns this anniversary
        const checkResult = await (0, db_1.query)('SELECT id FROM anniversaries WHERE id = $1 AND added_by_user_id = $2', [anniversaryId, userId]);
        if (!checkResult.rows.length) {
            return res.status(404).json({ error: 'Anniversary not found or unauthorized' });
        }
        // Delete anniversary
        await (0, db_1.query)('DELETE FROM anniversaries WHERE id = $1', [anniversaryId]);
        res.json({ message: 'Anniversary deleted successfully' });
    }
    catch (error) {
        console.error('Delete anniversary error:', error);
        res.status(500).json({ error: 'Failed to delete anniversary' });
    }
});
exports.default = router;
