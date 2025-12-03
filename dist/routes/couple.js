"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Service/src/routes/couple.ts
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * POST /api/couple/create
 * Create a new couple and generate invite code
 * Note: This provides an alternative flow to the pairing_codes in user.ts
 */
router.post('/create', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        // Use transaction for atomic operation
        const result = await (0, db_1.withTransaction)(async (client) => {
            // Check if user already has a couple
            const userCheck = await client.query('SELECT couple_id FROM users WHERE id = $1', [userId]);
            if (userCheck.rows[0]?.couple_id) {
                throw new Error('ALREADY_HAS_COUPLE');
            }
            // Generate unique invite code
            const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            // Create couple with this user as user1
            const coupleResult = await client.query(`INSERT INTO couples (invite_code, user1_id, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, invite_code, user1_id, created_at`, [inviteCode, userId]);
            const couple = coupleResult.rows[0];
            // Update user's couple_id
            await client.query('UPDATE users SET couple_id = $1, updated_at = NOW() WHERE id = $2', [couple.id, userId]);
            return couple;
        });
        res.json({
            success: true,
            data: {
                coupleId: result.id,
                inviteCode: result.invite_code,
                createdAt: result.created_at
            },
            message: 'Couple created successfully. Share the invite code with your partner!'
        });
    }
    catch (error) {
        console.error('[couple] Create couple error:', error);
        if (error.message === 'ALREADY_HAS_COUPLE') {
            return res.status(400).json({
                success: false,
                message: 'You are already part of a couple'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create couple'
        });
    }
});
/**
 * POST /api/couple/join
 * Join an existing couple using invite code
 */
router.post('/join', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { inviteCode } = req.body;
        if (!inviteCode || String(inviteCode).trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invite code is required'
            });
        }
        const code = String(inviteCode).trim().toUpperCase();
        // Use transaction for atomic operation
        const coupleId = await (0, db_1.withTransaction)(async (client) => {
            // Check if user already has a couple
            const userCheck = await client.query('SELECT couple_id FROM users WHERE id = $1', [userId]);
            if (userCheck.rows[0]?.couple_id) {
                throw new Error('ALREADY_HAS_COUPLE');
            }
            // Find couple by invite code
            const coupleResult = await client.query('SELECT id, user1_id, user2_id FROM couples WHERE invite_code = $1', [code]);
            if (coupleResult.rows.length === 0) {
                throw new Error('INVALID_INVITE_CODE');
            }
            const couple = coupleResult.rows[0];
            // Check if couple already has 2 users
            if (couple.user2_id) {
                throw new Error('COUPLE_FULL');
            }
            // Check if user is trying to join their own couple
            if (couple.user1_id === userId) {
                throw new Error('CANNOT_JOIN_OWN_COUPLE');
            }
            // Add user as user2
            await client.query('UPDATE couples SET user2_id = $1, updated_at = NOW() WHERE id = $2', [userId, couple.id]);
            // Update user's couple_id
            await client.query('UPDATE users SET couple_id = $1, updated_at = NOW() WHERE id = $2', [couple.id, userId]);
            return couple.id;
        });
        res.json({
            success: true,
            data: { coupleId },
            message: 'Successfully joined couple!'
        });
    }
    catch (error) {
        console.error('[couple] Join couple error:', error);
        // Handle specific error cases
        const errorMessages = {
            ALREADY_HAS_COUPLE: { status: 400, message: 'You are already part of a couple' },
            INVALID_INVITE_CODE: { status: 404, message: 'Invalid invite code' },
            COUPLE_FULL: { status: 400, message: 'This couple already has 2 members' },
            CANNOT_JOIN_OWN_COUPLE: { status: 400, message: 'You cannot join your own couple' }
        };
        const errorInfo = errorMessages[error.message];
        if (errorInfo) {
            return res.status(errorInfo.status).json({
                success: false,
                message: errorInfo.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to join couple'
        });
    }
});
/**
 * GET /api/couple/me
 * Get current user's couple information
 */
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        // Get user's couple
        const result = await (0, db_1.query)(`SELECT
        c.id, c.invite_code, c.user1_id, c.user2_id, c.created_at,
        u1.id as user1_id_val, u1.email as user1_email, u1.name as user1_name,
        u2.id as user2_id_val, u2.email as user2_email, u2.name as user2_name
       FROM couples c
       LEFT JOIN users u1 ON c.user1_id = u1.id
       LEFT JOIN users u2 ON c.user2_id = u2.id
       WHERE c.user1_id = $1 OR c.user2_id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'No couple found'
            });
        }
        const couple = result.rows[0];
        const isUser1 = couple.user1_id === userId;
        const partnerData = isUser1
            ? { id: couple.user2_id_val, email: couple.user2_email, name: couple.user2_name }
            : { id: couple.user1_id_val, email: couple.user1_email, name: couple.user1_name };
        res.json({
            success: true,
            data: {
                coupleId: couple.id,
                inviteCode: couple.invite_code,
                hasPartner: !!(couple.user1_id && couple.user2_id),
                partner: (couple.user1_id && couple.user2_id) ? partnerData : null,
                createdAt: couple.created_at
            }
        });
    }
    catch (error) {
        console.error('[couple] Get couple error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get couple information'
        });
    }
});
/**
 * DELETE /api/couple/leave
 * Leave current couple (disconnect from partner)
 */
router.delete('/leave', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        // Use transaction for atomic operation
        await (0, db_1.withTransaction)(async (client) => {
            // Get user's couple
            const coupleResult = await client.query('SELECT id, user1_id, user2_id FROM couples WHERE user1_id = $1 OR user2_id = $1', [userId]);
            if (coupleResult.rows.length === 0) {
                throw new Error('NO_COUPLE');
            }
            const couple = coupleResult.rows[0];
            // Update user's couple_id to NULL
            await client.query('UPDATE users SET couple_id = NULL, updated_at = NOW() WHERE id = $1', [userId]);
            // If user is user1 and user2 exists, promote user2 to user1
            if (couple.user1_id === userId && couple.user2_id) {
                await client.query('UPDATE couples SET user1_id = $1, user2_id = NULL, updated_at = NOW() WHERE id = $2', [couple.user2_id, couple.id]);
            }
            // If user is user2, just clear user2_id
            else if (couple.user2_id === userId) {
                await client.query('UPDATE couples SET user2_id = NULL, updated_at = NOW() WHERE id = $1', [couple.id]);
            }
            // If user1 leaving and no user2, delete the couple
            else {
                await client.query('DELETE FROM couples WHERE id = $1', [couple.id]);
            }
        });
        res.json({
            success: true,
            message: 'Successfully left couple'
        });
    }
    catch (error) {
        console.error('[couple] Leave couple error:', error);
        if (error.message === 'NO_COUPLE') {
            return res.status(404).json({
                success: false,
                message: 'You are not part of any couple'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to leave couple'
        });
    }
});
exports.default = router;
