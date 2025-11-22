// Service/src/routes/user.ts
import { Router } from 'express';
import { query, withTransaction } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/user/profile
 * Get authenticated user's profile with partner info
 */
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // 查询 users、couples 以及 profiles
const result = await query(
  `SELECT u.id, u.email, u.name AS user_name, u.couple_id, u.created_at,
          p.name AS profile_name, p.date_of_birth, p.major, p.year, p.hobby,
          c.user1_id, c.user2_id
   FROM users u
   LEFT JOIN profiles p ON p.user_id = u.id
   LEFT JOIN couples c ON u.couple_id = c.id
   WHERE u.id = $1`,
  [userId]
);

if (result.rows.length === 0) {
  return res.status(404).json({ success: false, message: 'User not found' });
}

const user = result.rows[0];
const hasPartner = !!(user.couple_id && user.user1_id && user.user2_id);

// 获取 partner 信息
let partner = null;
if (hasPartner) {
  const partnerId = user.user1_id === userId ? user.user2_id : user.user1_id;
  const partnerResult = await query(
    'SELECT id, email, name FROM users WHERE id = $1',
    [partnerId]
  );
  if (partnerResult.rows.length > 0) {
    partner = {
      id: partnerResult.rows[0].id,
      email: partnerResult.rows[0].email,
      name: partnerResult.rows[0].name
    };
  }
}

res.json({
  success: true,
  data: {
    id: user.id,
    email: user.email,
    name: user.user_name,
    coupleId: user.couple_id,
    hasPartner,
    partner,
    createdAt: user.created_at,
    // 新增 profile 信息
    dateOfBirth: user.date_of_birth,
    major: user.major,
    year: user.year,
    hobby: user.hobby
  }
});
  } catch (error: any) {
    console.error('[user] Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

/**
 * PUT /api/user/profile
 * Update authenticated user's profile
 */
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    console.log('[user/profile] PUT request body:', JSON.stringify(req.body));
    console.log('[user/profile] PUT request headers:', JSON.stringify(req.headers));
    const { name } = req.body;

    console.log('[user/profile] PUT request - userId:', userId, 'name:', name, 'type:', typeof name);

    if (name !== undefined && name !== null && String(name).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty if provided'
      });
    }

    const trimmedName = name ? String(name).trim() : null;
    console.log('[user/profile] Updating with trimmedName:', trimmedName);

    const result = await query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, created_at',
      [trimmedName, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        createdAt: result.rows[0].created_at
      },
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('[user] Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * POST /api/user/partner/generate-code
 * Generate a pairing code for connecting with a partner
 */
router.post('/partner/generate-code', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    console.log('[user] POST /partner/generate-code - START - userId:', userId);

    // Check if user already has a partner
    console.log('[user] Checking if user has existing couple...');
    const userCheck = await query(
      'SELECT couple_id FROM users WHERE id = $1',
      [userId]
    );
    console.log('[user] User check result:', userCheck.rows);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userCheck.rows[0].couple_id) {
      return res.status(400).json({
        success: false,
        message: 'You already have a partner'
      });
    }

    // Delete any old unused codes for this user
    console.log('[user] Deleting old unused codes...');
    await query(
      'DELETE FROM pairing_codes WHERE user_id = $1 AND used = FALSE',
      [userId]
    );

    // Generate a 6-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log('[user] Generated code:', code, 'expires:', expiresAt);

    console.log('[user] Inserting pairing code into database...');
    await query(
      'INSERT INTO pairing_codes (code, user_id, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
      [code, userId, expiresAt]
    );

    console.log('[user] POST /partner/generate-code - SUCCESS - returning code');
    res.json({
      success: true,
      data: {
        code,
        expiresAt
      },
      message: 'Pairing code generated successfully. Share this code with your partner.'
    });
  } catch (error: any) {
    console.error('[user] Generate code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate pairing code'
    });
  }
});

/**
 * POST /api/user/partner/connect
 * Connect with a partner using their pairing code
 */
router.post('/partner/connect', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { partnerCode } = req.body;

    if (!partnerCode || String(partnerCode).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Partner code is required'
      });
    }

    const code = String(partnerCode).trim().toUpperCase();

    // Use transaction for atomic multi-step operation
    const result = await withTransaction(async (client) => {
      // Check if current user already has a partner
      const userCheck = await client.query(
        'SELECT couple_id FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
      }

      if (userCheck.rows[0].couple_id) {
        throw new Error('ALREADY_HAS_PARTNER');
      }

      // Find and validate the pairing code
      const codeResult = await client.query(
        'SELECT user_id, expires_at, used FROM pairing_codes WHERE code = $1',
        [code]
      );

      if (codeResult.rows.length === 0) {
        throw new Error('INVALID_CODE');
      }

      const codeData = codeResult.rows[0];

      if (codeData.used) {
        throw new Error('CODE_ALREADY_USED');
      }

      if (new Date(codeData.expires_at) < new Date()) {
        throw new Error('CODE_EXPIRED');
      }

      if (codeData.user_id === userId) {
        throw new Error('CANNOT_PAIR_WITH_SELF');
      }

      // Check if code owner already has a partner (race condition check)
      const codeOwnerCheck = await client.query(
        'SELECT couple_id FROM users WHERE id = $1',
        [codeData.user_id]
      );

      if (codeOwnerCheck.rows[0]?.couple_id) {
        throw new Error('CODE_OWNER_HAS_PARTNER');
      }

      // Create couple
      const coupleResult = await client.query(
        'INSERT INTO couples (user1_id, user2_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id',
        [codeData.user_id, userId]
      );

      const coupleId = coupleResult.rows[0].id;

      // Update both users with couple_id
      await client.query(
        'UPDATE users SET couple_id = $1, updated_at = NOW() WHERE id IN ($2, $3)',
        [coupleId, codeData.user_id, userId]
      );

      // Mark code as used
      await client.query(
        'UPDATE pairing_codes SET used = TRUE WHERE code = $1',
        [code]
      );

      return { coupleId, partnerId: codeData.user_id };
    });

    // Get partner details
    const partnerResult = await query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [result.partnerId]
    );

    res.json({
      success: true,
      data: {
        coupleId: result.coupleId,
        partner: partnerResult.rows[0]
      },
      message: 'Successfully connected with your partner!'
    });
  } catch (error: any) {
    console.error('[user] Connect partner error:', error);

    // Handle specific error cases
    const errorMessages: Record<string, { status: number; message: string }> = {
      USER_NOT_FOUND: { status: 404, message: 'User not found' },
      ALREADY_HAS_PARTNER: { status: 400, message: 'You already have a partner' },
      INVALID_CODE: { status: 404, message: 'Invalid pairing code' },
      CODE_ALREADY_USED: { status: 400, message: 'This code has already been used' },
      CODE_EXPIRED: { status: 400, message: 'This code has expired' },
      CANNOT_PAIR_WITH_SELF: { status: 400, message: 'You cannot connect with yourself' },
      CODE_OWNER_HAS_PARTNER: { status: 400, message: 'The code owner already has a partner' }
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
      message: 'Failed to connect with partner'
    });
  }
});

/**
 * GET /api/user/partner
 * Get current partner information
 */
router.get('/partner', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    console.log('[user] GET /partner - userId:', userId, 'type:', typeof userId);

    const result = await query(
      `SELECT u.couple_id, c.user1_id, c.user2_id, c.created_at,
              p.id as partner_id, p.email as partner_email, p.name as partner_name
       FROM users u
       LEFT JOIN couples c ON u.couple_id = c.id
       LEFT JOIN users p ON (c.user1_id = p.id AND c.user2_id = u.id)
                         OR (c.user2_id = p.id AND c.user1_id = u.id)
       WHERE u.id = $1`,
      [userId]
    );

    console.log('[user] GET /partner - query result rows:', result.rows.length);

    if (result.rows.length === 0 || !result.rows[0].couple_id) {
      console.log('[user] GET /partner - No partner found');
      return res.json({
        success: true,
        data: null,
        message: 'No partner connected'
      });
    }

    const data = result.rows[0];
    console.log('[user] GET /partner - Found partner, couple_id:', data.couple_id);

    res.json({
      success: true,
      data: {
        coupleId: data.couple_id,
        hasPartner: !!data.partner_id,
        partner: data.partner_id ? {
          id: data.partner_id,
          email: data.partner_email,
          name: data.partner_name
        } : null,
        connectedAt: data.created_at
      }
    });
  } catch (error: any) {
    console.error('[user] Get partner error:', error);
    console.error('[user] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get partner information'
    });
  }
});

/**
 * DELETE /api/user/partner/unmatch
 * Disconnect from partner (delete couple relationship)
 */
router.delete('/partner/unmatch', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Use transaction for atomic operation
    await withTransaction(async (client) => {
      // Get user's couple_id
      const userResult = await client.query(
        'SELECT couple_id FROM users WHERE id = $1',
        [userId]
      );

      const coupleId = userResult.rows[0]?.couple_id;
      if (!coupleId) {
        throw new Error('NO_COUPLE');
      }

      // Set couple_id to NULL for both users
      await client.query(
        'UPDATE users SET couple_id = NULL, updated_at = NOW() WHERE couple_id = $1',
        [coupleId]
      );

      // Delete the couple (this will cascade delete related data)
      await client.query(
        'DELETE FROM couples WHERE id = $1',
        [coupleId]
      );
    });

    res.json({
      success: true,
      message: 'Successfully disconnected from partner'
    });
  } catch (error: any) {
    console.error('[user] Unmatch error:', error);

    if (error.message === 'NO_COUPLE') {
      return res.status(404).json({
        success: false,
        message: 'No partner to disconnect from'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to disconnect from partner'
    });
  }
});

export default router;
