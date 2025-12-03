"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Service/src/routes/prayer-items.ts
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
// GET /api/prayer-items - Get all prayer items for the user
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        // Get user's partnership
        const partnershipResult = await (0, db_1.query)(`SELECT id FROM partnerships
       WHERE (user1_id = $1 OR user2_id = $1) AND is_active = TRUE
       LIMIT 1`, [userId]);
        const partnershipId = partnershipResult.rows[0]?.id || null;
        // Get prayer items (both personal and shared)
        const result = await (0, db_1.query)(`SELECT
        pi.*,
        u.email as added_by_email
      FROM prayer_items pi
      LEFT JOIN users u ON pi.added_by_user_id = u.id
      WHERE pi.added_by_user_id = $1
         OR pi.partnership_id = $2
      ORDER BY pi.created_at DESC`, [userId, partnershipId]);
        const prayerItems = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            category: 'Other', // Can be added to schema later
            priority: 'medium', // Can be added to schema later
            dateAdded: row.created_at,
            isAnswered: row.is_answered,
            answeredDate: row.answered_at,
            addedBy: row.added_by_email,
        }));
        res.json(prayerItems);
    }
    catch (error) {
        console.error('Get prayer items error:', error);
        res.status(500).json({ error: 'Failed to fetch prayer items' });
    }
});
// POST /api/prayer-items - Create new prayer item
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { title, description, category, priority } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        // Get user's partnership (if any)
        const partnershipResult = await (0, db_1.query)(`SELECT id FROM partnerships
       WHERE (user1_id = $1 OR user2_id = $1) AND is_active = TRUE
       LIMIT 1`, [userId]);
        const partnershipId = partnershipResult.rows[0]?.id || null;
        // Insert prayer item
        const result = await (0, db_1.query)(`INSERT INTO prayer_items
        (partnership_id, added_by_user_id, title, description, is_answered)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING *`, [partnershipId, userId, title, description || null]);
        const prayerItem = result.rows[0];
        res.json({
            id: prayerItem.id,
            title: prayerItem.title,
            description: prayerItem.description,
            category: category || 'Other',
            priority: priority || 'medium',
            dateAdded: prayerItem.created_at,
            isAnswered: false,
        });
    }
    catch (error) {
        console.error('Create prayer item error:', error);
        res.status(500).json({ error: 'Failed to create prayer item' });
    }
});
// PUT /api/prayer-items/:id - Update prayer item
router.put('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const itemId = parseInt(req.params.id);
        const { title, description, isAnswered } = req.body;
        // Verify user owns this prayer item
        const checkResult = await (0, db_1.query)('SELECT id FROM prayer_items WHERE id = $1 AND added_by_user_id = $2', [itemId, userId]);
        if (!checkResult.rows.length) {
            return res.status(404).json({ error: 'Prayer item not found or unauthorized' });
        }
        // Update prayer item
        const result = await (0, db_1.query)(`UPDATE prayer_items
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           is_answered = COALESCE($3, is_answered),
           answered_at = CASE WHEN $3 = TRUE AND is_answered = FALSE
                              THEN CURRENT_TIMESTAMP
                              ELSE answered_at
                         END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`, [title, description, isAnswered, itemId]);
        const prayerItem = result.rows[0];
        res.json({
            id: prayerItem.id,
            title: prayerItem.title,
            description: prayerItem.description,
            dateAdded: prayerItem.created_at,
            isAnswered: prayerItem.is_answered,
            answeredDate: prayerItem.answered_at,
        });
    }
    catch (error) {
        console.error('Update prayer item error:', error);
        res.status(500).json({ error: 'Failed to update prayer item' });
    }
});
// PUT /api/prayer-items/:id/answer - Mark prayer as answered
router.put('/:id/answer', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const itemId = parseInt(req.params.id);
        // Verify user owns this prayer item or it's shared
        const checkResult = await (0, db_1.query)(`SELECT pi.id FROM prayer_items pi
       LEFT JOIN partnerships p ON pi.partnership_id = p.id
       WHERE pi.id = $1
         AND (pi.added_by_user_id = $2
              OR (p.user1_id = $2 OR p.user2_id = $2))`, [itemId, userId]);
        if (!checkResult.rows.length) {
            return res.status(404).json({ error: 'Prayer item not found or unauthorized' });
        }
        // Mark as answered
        const result = await (0, db_1.query)(`UPDATE prayer_items
       SET is_answered = TRUE,
           answered_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`, [itemId]);
        const prayerItem = result.rows[0];
        res.json({
            id: prayerItem.id,
            title: prayerItem.title,
            description: prayerItem.description,
            dateAdded: prayerItem.created_at,
            isAnswered: prayerItem.is_answered,
            answeredDate: prayerItem.answered_at,
        });
    }
    catch (error) {
        console.error('Answer prayer item error:', error);
        res.status(500).json({ error: 'Failed to mark as answered' });
    }
});
// DELETE /api/prayer-items/:id - Delete prayer item
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const itemId = parseInt(req.params.id);
        // Verify user owns this prayer item
        const checkResult = await (0, db_1.query)('SELECT id FROM prayer_items WHERE id = $1 AND added_by_user_id = $2', [itemId, userId]);
        if (!checkResult.rows.length) {
            return res.status(404).json({ error: 'Prayer item not found or unauthorized' });
        }
        // Delete prayer item
        await (0, db_1.query)('DELETE FROM prayer_items WHERE id = $1', [itemId]);
        res.json({ message: 'Prayer item deleted successfully' });
    }
    catch (error) {
        console.error('Delete prayer item error:', error);
        res.status(500).json({ error: 'Failed to delete prayer item' });
    }
});
exports.default = router;
