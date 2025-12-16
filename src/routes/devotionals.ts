import { Router } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { BIBLE_BOOKS } from '../constants/bibleData';

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
    // Include both global plans (couple_id IS NULL) and couple-specific plans
    // Exclude plans hidden by the couple
    const result = await query(`
      SELECT
        dp.*,
        CASE WHEN cdp.completed_at IS NOT NULL THEN true ELSE false END as is_completed,
        cdp.completed_at,
        CASE WHEN dp.couple_id IS NOT NULL THEN true ELSE false END as is_custom
      FROM devotional_plans dp
      LEFT JOIN couple_devotional_progress cdp
        ON dp.id = cdp.plan_id AND cdp.couple_id = $1
      WHERE dp.category = $2 
        AND (dp.couple_id IS NULL OR dp.couple_id = $1)
        AND NOT EXISTS (
          SELECT 1 FROM hidden_devotional_plans hdp 
          WHERE hdp.couple_id = $1 AND hdp.plan_id = dp.id
        )
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

// POST /api/devotionals/custom/append
// Append chapters to the custom reading plan
router.post('/custom/append', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start_book, start_chapter, end_book, end_chapter, chapters_per_day } = req.body;

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({ success: false, message: 'No couple found' });
    }

    // 1. Calculate the list of chapters to add
    const chaptersToAdd: { book: string; chapter: number }[] = [];
    let recording = false;

    for (const book of BIBLE_BOOKS) {
      if (book.name === start_book) recording = true;

      if (recording) {
        const start = book.name === start_book ? start_chapter : 1;
        const end = book.name === end_book ? end_chapter : book.chapters;

        for (let c = start; c <= end; c++) {
          chaptersToAdd.push({ book: book.name, chapter: c });
        }
      }

      if (book.name === end_book) break;
    }

    if (chaptersToAdd.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid range' });
    }

    // 2. Get the current max day_number for this couple's year plan
    const maxDayResult = await query(`
      SELECT MAX(day_number) as max_day 
      FROM devotional_plans 
      WHERE category = 'year' AND (couple_id = $1 OR couple_id IS NULL)
    `, [coupleId]);
    
    let currentDay = (maxDayResult.rows[0]?.max_day || 0) + 1;

    // 3. Insert chapters
    // Group by chapters_per_day
    for (let i = 0; i < chaptersToAdd.length; i += chapters_per_day) {
      const dayChapters = chaptersToAdd.slice(i, i + chapters_per_day);
      
      const title = dayChapters.length === 1 
        ? `${dayChapters[0].book} ${dayChapters[0].chapter}`
        : `${dayChapters[0].book} ${dayChapters[0].chapter} - ${dayChapters[dayChapters.length - 1].book === dayChapters[0].book ? '' : dayChapters[dayChapters.length - 1].book + ' '}${dayChapters[dayChapters.length - 1].chapter}`;
      
      const reference = title; // Simple reference for now
      const scripture_text = `Read ${title}`; // Placeholder text

      await query(`
        INSERT INTO devotional_plans (category, day_number, title, reference, scripture_text, couple_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['year', currentDay, title, reference, scripture_text, coupleId]);

      currentDay++;
    }

    res.json({ success: true, message: `Added ${chaptersToAdd.length} chapters to plan` });
  } catch (error) {
    console.error('Error appending custom plan:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/devotionals/custom/items
// Delete custom plan items
router.delete('/custom/items', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({ success: false, message: 'No couple found' });
    }

    // Split IDs into custom and global to handle them differently
    const plans = await query('SELECT id, couple_id FROM devotional_plans WHERE id = ANY($1)', [ids]);
    
    const customIds: number[] = [];
    const globalIds: number[] = [];
    
    for (const plan of plans.rows) {
      if (plan.couple_id === coupleId) {
        customIds.push(plan.id);
      } else if (plan.couple_id === null) {
        globalIds.push(plan.id);
      }
    }
    
    // 1. Delete custom items (permanently)
    if (customIds.length > 0) {
      await query(`
        DELETE FROM devotional_plans 
        WHERE id = ANY($1) AND couple_id = $2
      `, [customIds, coupleId]);
    }
    
    // 2. Hide global items (for this couple)
    if (globalIds.length > 0) {
      for (const id of globalIds) {
        await query(
          'INSERT INTO hidden_devotional_plans (couple_id, plan_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [coupleId, id]
        );
      }
    }

    res.json({ success: true, message: 'Items deleted' });
  } catch (error) {
    console.error('Error deleting custom plan items:', error);
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
