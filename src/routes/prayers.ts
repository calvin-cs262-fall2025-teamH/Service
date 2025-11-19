// Service/src/routes/prayers.ts
import { Router } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Helper function to get and validate user's couple_id
 */
async function getUserCoupleId(userId: number): Promise<number | null> {
  const result = await query(
    'SELECT couple_id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.couple_id || null;
}

/**
 * POST /api/prayers
 * Create a new prayer item
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    if (String(title).trim().length === 0 || String(content).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title and content cannot be empty'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({
        success: false,
        message: 'You must be part of a couple to create prayer items'
      });
    }

    // Create prayer item
    const result = await query(
      `INSERT INTO prayer_items (couple_id, title, content, is_answered, created_at, updated_at)
       VALUES ($1, $2, $3, FALSE, NOW(), NOW())
       RETURNING id, couple_id, title, content, is_answered, answered_at, created_at, updated_at`,
      [coupleId, title.trim(), content.trim()]
    );

    const prayer = result.rows[0];

    res.json({
      success: true,
      data: {
        id: prayer.id,
        coupleId: prayer.couple_id,
        title: prayer.title,
        content: prayer.content,
        isAnswered: prayer.is_answered,
        answeredAt: prayer.answered_at,
        createdAt: prayer.created_at,
        updatedAt: prayer.updated_at
      },
      message: 'Prayer item created successfully'
    });
  } catch (error: any) {
    console.error('[prayers] Create error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create prayer item'
    });
  }
});

/**
 * GET /api/prayers
 * Get all prayer items for the user's couple
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    console.log('[prayers] Request from userId:', userId);

    const coupleId = await getUserCoupleId(userId);
    console.log('[prayers] User coupleId:', coupleId);
    if (!coupleId) {
      console.log('[prayers] No couple found, returning empty array');
      return res.json({
        success: true,
        data: [],
        message: 'No couple found'
      });
    }

    // Get all prayer items
    const result = await query(
      `SELECT id, couple_id, title, content, is_answered, answered_at, created_at, updated_at
       FROM prayer_items
       WHERE couple_id = $1
       ORDER BY is_answered ASC, created_at DESC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        coupleId: row.couple_id,
        title: row.title,
        content: row.content,
        isAnswered: row.is_answered,
        answeredAt: row.answered_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error: any) {
    console.error('[prayers] Get all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prayer items'
    });
  }
});

/**
 * GET /api/prayers/:id
 * Get a specific prayer item
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const prayerId = parseInt(req.params.id);

    if (isNaN(prayerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prayer ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Get prayer item with permission check
    const result = await query(
      `SELECT id, couple_id, title, content, is_answered, answered_at, created_at, updated_at
       FROM prayer_items
       WHERE id = $1 AND couple_id = $2`,
      [prayerId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prayer item not found'
      });
    }

    const prayer = result.rows[0];

    res.json({
      success: true,
      data: {
        id: prayer.id,
        coupleId: prayer.couple_id,
        title: prayer.title,
        content: prayer.content,
        isAnswered: prayer.is_answered,
        answeredAt: prayer.answered_at,
        createdAt: prayer.created_at,
        updatedAt: prayer.updated_at
      }
    });
  } catch (error: any) {
    console.error('[prayers] Get one error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prayer item'
    });
  }
});

/**
 * PUT /api/prayers/:id
 * Update a prayer item's title and/or content
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const prayerId = parseInt(req.params.id);
    const { title, content } = req.body;

    if (isNaN(prayerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prayer ID'
      });
    }

    // Validate that at least one field is provided
    if (!title && !content) {
      return res.status(400).json({
        success: false,
        message: 'At least one of title or content must be provided'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Update prayer item with permission check
    const result = await query(
      `UPDATE prayer_items
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           updated_at = NOW()
       WHERE id = $3 AND couple_id = $4
       RETURNING id, couple_id, title, content, is_answered, answered_at, created_at, updated_at`,
      [title, content, prayerId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prayer item not found'
      });
    }

    const prayer = result.rows[0];

    res.json({
      success: true,
      data: {
        id: prayer.id,
        coupleId: prayer.couple_id,
        title: prayer.title,
        content: prayer.content,
        isAnswered: prayer.is_answered,
        answeredAt: prayer.answered_at,
        createdAt: prayer.created_at,
        updatedAt: prayer.updated_at
      },
      message: 'Prayer item updated successfully'
    });
  } catch (error: any) {
    console.error('[prayers] Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prayer item'
    });
  }
});

/**
 * PUT /api/prayers/:id/toggle-answered
 * Toggle the answered status of a prayer item
 */
router.put('/:id/toggle-answered', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const prayerId = parseInt(req.params.id);

    if (isNaN(prayerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prayer ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Get current state
    const currentResult = await query(
      'SELECT is_answered FROM prayer_items WHERE id = $1 AND couple_id = $2',
      [prayerId, coupleId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prayer item not found'
      });
    }

    const currentAnswered = currentResult.rows[0].is_answered;
    const newAnswered = !currentAnswered;

    // Toggle answered status
    const result = await query(
      `UPDATE prayer_items
       SET is_answered = $1,
           answered_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $2 AND couple_id = $3
       RETURNING id, couple_id, title, content, is_answered, answered_at, created_at, updated_at`,
      [newAnswered, prayerId, coupleId]
    );

    const prayer = result.rows[0];

    res.json({
      success: true,
      data: {
        id: prayer.id,
        coupleId: prayer.couple_id,
        title: prayer.title,
        content: prayer.content,
        isAnswered: prayer.is_answered,
        answeredAt: prayer.answered_at,
        createdAt: prayer.created_at,
        updatedAt: prayer.updated_at
      },
      message: `Prayer marked as ${newAnswered ? 'answered' : 'unanswered'}`
    });
  } catch (error: any) {
    console.error('[prayers] Toggle answered error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle prayer status'
    });
  }
});

/**
 * DELETE /api/prayers/:id
 * Delete a prayer item
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const prayerId = parseInt(req.params.id);

    if (isNaN(prayerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prayer ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Delete prayer item with permission check
    const result = await query(
      'DELETE FROM prayer_items WHERE id = $1 AND couple_id = $2 RETURNING id',
      [prayerId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prayer item not found'
      });
    }

    res.json({
      success: true,
      message: 'Prayer item deleted successfully'
    });
  } catch (error: any) {
    console.error('[prayers] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prayer item'
    });
  }
});

export default router;
