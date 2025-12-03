"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Service/src/routes/partnerships.ts
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
        req.userEmail = payload.email;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
// Helper function to generate random 6-character code
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
// GET /api/partnerships/my-code - Get or generate user's connection code
router.get('/my-code', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        // Check if user already has a code in the database
        // We'll store codes in a separate table or use email-based codes
        // For simplicity, generate a deterministic code based on user ID
        const code = `U${userId.toString().padStart(5, '0')}`;
        res.json({ code });
    }
    catch (error) {
        console.error('Get my code error:', error);
        res.status(500).json({ error: 'Failed to get connection code' });
    }
});
// POST /api/partnerships/regenerate-code - Generate new connection code
router.post('/regenerate-code', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        // For now, use user ID-based code
        // In future, could store random codes in a codes table
        const code = `U${userId.toString().padStart(5, '0')}`;
        res.json({ code });
    }
    catch (error) {
        console.error('Regenerate code error:', error);
        res.status(500).json({ error: 'Failed to regenerate code' });
    }
});
// POST /api/partnerships/connect - Connect with partner using their code
router.post('/connect', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { code } = req.body;
        if (!code || code.length < 4) {
            return res.status(400).json({ error: 'Invalid code' });
        }
        // Extract partner ID from code (format: U00001)
        const partnerIdStr = code.substring(1);
        const partnerId = parseInt(partnerIdStr);
        if (isNaN(partnerId) || partnerId === userId) {
            return res.status(400).json({ error: 'Invalid code or cannot connect with yourself' });
        }
        // Verify partner exists
        const partnerResult = await (0, db_1.query)('SELECT id, email FROM users WHERE id = $1', [partnerId]);
        if (!partnerResult.rows.length) {
            return res.status(404).json({ error: 'Partner not found' });
        }
        // Check if user already has an active partnership
        const existingPartnership = await (0, db_1.query)(`SELECT id FROM partnerships
       WHERE (user1_id = $1 OR user2_id = $1)
       AND is_active = TRUE`, [userId]);
        if (existingPartnership.rows.length > 0) {
            return res.status(400).json({ error: 'You already have an active partnership' });
        }
        // Check if partner already has an active partnership
        const partnerExisting = await (0, db_1.query)(`SELECT id FROM partnerships
       WHERE (user1_id = $1 OR user2_id = $1)
       AND is_active = TRUE`, [partnerId]);
        if (partnerExisting.rows.length > 0) {
            return res.status(400).json({ error: 'Partner already has an active partnership' });
        }
        // Create partnership (always user1_id < user2_id for consistency)
        const [user1, user2] = userId < partnerId ? [userId, partnerId] : [partnerId, userId];
        const result = await (0, db_1.query)(`INSERT INTO partnerships (user1_id, user2_id, is_active)
       VALUES ($1, $2, TRUE)
       RETURNING *`, [user1, user2]);
        const partnership = result.rows[0];
        const partnerEmail = partnerResult.rows[0].email;
        res.json({
            message: 'Connected successfully',
            partnership: {
                id: partnership.id,
                partnerId: partnerId,
                partnerEmail: partnerEmail,
                connectedAt: partnership.connected_at,
            },
        });
    }
    catch (error) {
        console.error('Connect partnership error:', error);
        res.status(500).json({ error: 'Failed to connect with partner' });
    }
});
// GET /api/partnerships/status - Get current partnership status
router.get('/status', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        // Get active partnership
        const result = await (0, db_1.query)(`SELECT
        p.*,
        CASE
          WHEN p.user1_id = $1 THEN u2.email
          ELSE u1.email
        END as partner_email,
        CASE
          WHEN p.user1_id = $1 THEN p.user2_id
          ELSE p.user1_id
        END as partner_id
      FROM partnerships p
      LEFT JOIN users u1 ON p.user1_id = u1.id
      LEFT JOIN users u2 ON p.user2_id = u2.id
      WHERE (p.user1_id = $1 OR p.user2_id = $1)
      AND p.is_active = TRUE
      LIMIT 1`, [userId]);
        if (result.rows.length === 0) {
            return res.json({
                isConnected: false,
                partnership: null,
            });
        }
        const partnership = result.rows[0];
        const partnerCode = `U${partnership.partner_id.toString().padStart(5, '0')}`;
        res.json({
            isConnected: true,
            partnership: {
                id: partnership.id,
                partnerId: partnership.partner_id,
                partnerEmail: partnership.partner_email,
                partnerCode: partnerCode,
                connectedAt: partnership.connected_at,
            },
        });
    }
    catch (error) {
        console.error('Get partnership status error:', error);
        res.status(500).json({ error: 'Failed to get partnership status' });
    }
});
// POST /api/partnerships/disconnect - Disconnect from current partner
router.post('/disconnect', authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        // Find active partnership
        const partnershipResult = await (0, db_1.query)(`SELECT id FROM partnerships
       WHERE (user1_id = $1 OR user2_id = $1)
       AND is_active = TRUE
       LIMIT 1`, [userId]);
        if (partnershipResult.rows.length === 0) {
            return res.status(404).json({ error: 'No active partnership found' });
        }
        const partnershipId = partnershipResult.rows[0].id;
        // Mark partnership as inactive
        await (0, db_1.query)(`UPDATE partnerships
       SET is_active = FALSE,
           unmatched_at = CURRENT_TIMESTAMP
       WHERE id = $1`, [partnershipId]);
        res.json({ message: 'Successfully disconnected from partner' });
    }
    catch (error) {
        console.error('Disconnect partnership error:', error);
        res.status(500).json({ error: 'Failed to disconnect from partner' });
    }
});
exports.default = router;
