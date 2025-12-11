import { Router } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

async function getUserCoupleId(userId: number): Promise<number | null> {
  const result = await query(
    'SELECT couple_id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.couple_id || null;
}

// GET /api/devotionals
// Get all devotional plans with completion status for the current couple
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const category = (req.query.category as string) || 'couple'; // Default to 'couple'

    if (!coupleId) {
      return res.status(400).json({
        success: false,
        message: 'You must be part of a couple to view devotionals'
      });
    }

    // Fetch plans and join with progress
    const result = await query(`
      SELECT
        dp.*,
        CASE WHEN cdp.completed_at IS NOT NULL THEN true ELSE false END as is_completed,
        cdp.completed_at
      FROM devotional_plans dp
      LEFT JOIN couple_devotional_progress cdp
        ON dp.id = cdp.plan_id AND cdp.couple_id = $1
      WHERE dp.category = $2
      ORDER BY dp.day_number ASC
    `, [coupleId, category]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching devotionals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/devotionals/custom
// Create or update a custom reading plan
router.post('/custom', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start_book, start_chapter, chapters_per_day } = req.body;

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({ success: false, message: 'No couple found' });
    }

    // Upsert custom plan
    await query(`
      INSERT INTO custom_reading_plans (couple_id, start_book, start_chapter, chapters_per_day)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (couple_id)
      DO UPDATE SET
        start_book = EXCLUDED.start_book,
        start_chapter = EXCLUDED.start_chapter,
        chapters_per_day = EXCLUDED.chapters_per_day,
        days_completed = 0 -- Reset progress on new plan
    `, [coupleId, start_book, start_chapter, chapters_per_day]);

    res.json({ success: true, message: 'Custom plan saved' });
  } catch (error) {
    console.error('Error saving custom plan:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/devotionals/:id/toggle
// Toggle completion status of a devotional plan
router.post('/:id/toggle', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const planId = parseInt(req.params.id);

    if (isNaN(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid plan ID' });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({
        success: false,
        message: 'You must be part of a couple to update devotionals'
      });
    }

    // Check if already completed
    const checkResult = await query(
      'SELECT * FROM couple_devotional_progress WHERE couple_id = $1 AND plan_id = $2',
      [coupleId, planId]
    );

    let isCompleted = false;

    if (checkResult.rows.length > 0) {
      // Already completed, so uncheck (delete)
      await query(
        'DELETE FROM couple_devotional_progress WHERE couple_id = $1 AND plan_id = $2',
        [coupleId, planId]
      );
      isCompleted = false;
    } else {
      // Not completed, so check (insert)
      await query(
        'INSERT INTO couple_devotional_progress (couple_id, plan_id, completed_by_user_id) VALUES ($1, $2, $3)',
        [coupleId, planId, userId]
      );
      isCompleted = true;
    }

    res.json({
      success: true,
      data: { isCompleted }
    });

  } catch (error) {
    console.error('Error toggling devotional:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
