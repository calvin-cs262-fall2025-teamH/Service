import { Router } from 'express';
import axios from 'axios';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generateReadingPlan } from '../lib/bibleData';

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

    if (category === 'year') {
      // Check for custom plan first
      const customPlanResult = await query(
        'SELECT id FROM custom_reading_plans WHERE couple_id = $1',
        [coupleId]
      );

      if (customPlanResult.rows.length > 0) {
        const planId = customPlanResult.rows[0].id;
        // Fetch generated days
        const daysResult = await query(`
          SELECT 
            id, 
            day_number, 
            reference as title, 
            COALESCE(scripture_text, reference) as scripture_text, 
            is_completed, 
            completed_at 
          FROM custom_plan_days 
          WHERE plan_id = $1 
          ORDER BY day_number ASC
        `, [planId]);

        return res.json({
          success: true,
          data: daysResult.rows.map(row => ({
            ...row,
            category: 'year',
            is_custom: true // Flag to frontend that this is a custom plan item
          }))
        });
      }
      
      // Fallback to static 'year' plan if no custom plan exists (or return empty to prompt creation)
      // For now, let's return empty so the frontend knows to prompt for creation
      return res.json({
        success: true,
        data: [] 
      });
    }

    // Fetch standard plans and join with progress
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
    const { start_book, start_chapter, end_book, end_chapter, chapters_per_day } = req.body;

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({ success: false, message: 'No couple found' });
    }

    // Generate the plan in memory first to validate
    let generatedDays;
    try {
      generatedDays = generateReadingPlan(
        start_book,
        parseInt(start_chapter),
        end_book,
        parseInt(end_chapter),
        parseInt(chapters_per_day)
      );
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid plan parameters' });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Upsert custom plan
      // We need the ID, so we use RETURNING id
      // If conflict, we update and return id
      // Note: ON CONFLICT UPDATE with RETURNING works in Postgres
      const planResult = await query(`
        INSERT INTO custom_reading_plans (couple_id, start_book, start_chapter, end_book, end_chapter, chapters_per_day)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (couple_id)
        DO UPDATE SET
          start_book = EXCLUDED.start_book,
          start_chapter = EXCLUDED.start_chapter,
          end_book = EXCLUDED.end_book,
          end_chapter = EXCLUDED.end_chapter,
          chapters_per_day = EXCLUDED.chapters_per_day,
          days_completed = 0
        RETURNING id
      `, [coupleId, start_book, start_chapter, end_book, end_chapter, chapters_per_day]);

      const planId = planResult.rows[0].id;

      // Delete existing days for this plan (if it was an update)
      await query('DELETE FROM custom_plan_days WHERE plan_id = $1', [planId]);

      // Bulk insert new days
      // Construct the VALUES part dynamically
      if (generatedDays.length > 0) {
        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        generatedDays.forEach(day => {
          placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
          values.push(planId, day.day, day.reference);
          paramIndex += 3;
        });

        const queryText = `
          INSERT INTO custom_plan_days (plan_id, day_number, reference)
          VALUES ${placeholders.join(', ')}
        `;

        await query(queryText, values);
      }

      await query('COMMIT');
      res.json({ success: true, message: 'Custom plan saved', planId });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error saving custom plan:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/devotionals/custom/append
// Append a range of chapters to the custom plan
router.post('/custom/append', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start_book, start_chapter, end_book, end_chapter, chapters_per_day } = req.body;

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({ success: false, message: 'No couple found' });
    }

    // Generate the plan in memory first to validate
    let generatedDays;
    try {
      generatedDays = generateReadingPlan(
        start_book,
        parseInt(start_chapter),
        end_book,
        parseInt(end_chapter),
        parseInt(chapters_per_day)
      );
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid plan parameters' });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Ensure custom plan exists or create one
      let planResult = await query(
        'SELECT id, chapters_per_day FROM custom_reading_plans WHERE couple_id = $1',
        [coupleId]
      );

      let planId;
      if (planResult.rows.length === 0) {
        // Create new plan if not exists
        const insertResult = await query(`
          INSERT INTO custom_reading_plans (couple_id, start_book, start_chapter, end_book, end_chapter, chapters_per_day)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [coupleId, start_book, start_chapter, end_book, end_chapter, chapters_per_day]);
        planId = insertResult.rows[0].id;
      } else {
        planId = planResult.rows[0].id;
        // Update chapters_per_day preference if provided
        if (chapters_per_day) {
           await query('UPDATE custom_reading_plans SET chapters_per_day = $1 WHERE id = $2', [chapters_per_day, planId]);
        }
      }

      // Get current max day number
      const maxDayResult = await query(
        'SELECT MAX(day_number) as max_day FROM custom_plan_days WHERE plan_id = $1',
        [planId]
      );
      const currentMaxDay = maxDayResult.rows[0].max_day || 0;

      // Bulk insert new days
      if (generatedDays.length > 0) {
        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        // Fetch verses with concurrency limit
        const daysWithVerses = [];
        const BATCH_SIZE = 5; // Process 5 requests at a time
        
        for (let i = 0; i < generatedDays.length; i += BATCH_SIZE) {
            const batch = generatedDays.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(batch.map(async (day) => {
                let scriptureText = '';
                try {
                    // Use a timeout to prevent hanging
                    const response = await axios.get(`https://bible-api.com/${encodeURIComponent(day.firstVerseReference)}`, { timeout: 5000 });
                    if (response.data && response.data.text) {
                        scriptureText = response.data.text.trim();
                    }
                } catch (e: any) {
                    console.error(`Failed to fetch verse for ${day.firstVerseReference}:`, e.message || e);
                }
                return { ...day, scriptureText };
            }));
            daysWithVerses.push(...batchResults);
            
            // Small delay between batches to be polite to the API
            if (i + BATCH_SIZE < generatedDays.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        daysWithVerses.forEach((day, index) => {
          placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
          // Adjust day number to be sequential from current max
          values.push(planId, currentMaxDay + index + 1, day.reference, day.scriptureText);
          paramIndex += 4;
        });

        const queryText = `
          INSERT INTO custom_plan_days (plan_id, day_number, reference, scripture_text)
          VALUES ${placeholders.join(', ')}
        `;

        await query(queryText, values);
      }

      await query('COMMIT');
      res.json({ success: true, message: 'Chapters added to plan', planId });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error appending to custom plan:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/devotionals/custom/items
// Delete specific days from the custom plan and re-index
router.delete('/custom/items', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { dayIds } = req.body; // Array of IDs to delete

    if (!Array.isArray(dayIds) || dayIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected for deletion' });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({ success: false, message: 'No couple found' });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Get plan ID for this couple
      const planResult = await query(
        'SELECT id FROM custom_reading_plans WHERE couple_id = $1',
        [coupleId]
      );

      if (planResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }
      const planId = planResult.rows[0].id;

      // Verify items belong to this plan and delete them
      // We use ANY($1) for array parameter
      await query(`
        DELETE FROM custom_plan_days 
        WHERE id = ANY($1) AND plan_id = $2
      `, [dayIds, planId]);

      // Re-index day numbers
      // We fetch all remaining days ordered by current day_number
      const remainingDays = await query(`
        SELECT id FROM custom_plan_days 
        WHERE plan_id = $1 
        ORDER BY day_number ASC
      `, [planId]);

      // Update each row with new sequential day number
      // This could be optimized with a single complex query or window function update, 
      // but a loop is safer/simpler for now given the likely small size of plans.
      // Actually, let's try a window function update if possible, or just loop.
      // Loop is fine for < 365 items.
      
      for (let i = 0; i < remainingDays.rows.length; i++) {
        const day = remainingDays.rows[i];
        const newDayNumber = i + 1;
        await query(
          'UPDATE custom_plan_days SET day_number = $1 WHERE id = $2',
          [newDayNumber, day.id]
        );
      }

      await query('COMMIT');
      res.json({ success: true, message: 'Items deleted and plan re-indexed' });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error deleting custom plan items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/devotionals/custom/:dayId/toggle
// Toggle completion status of a custom plan day
router.post('/custom/:dayId/toggle', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const dayId = parseInt(req.params.dayId);

    if (isNaN(dayId)) {
      return res.status(400).json({ success: false, message: 'Invalid day ID' });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({ success: false, message: 'No couple found' });
    }

    // Verify this day belongs to the couple's plan
    const verifyResult = await query(`
      SELECT cpd.id, cpd.is_completed 
      FROM custom_plan_days cpd
      JOIN custom_reading_plans crp ON cpd.plan_id = crp.id
      WHERE cpd.id = $1 AND crp.couple_id = $2
    `, [dayId, coupleId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan day not found or access denied' });
    }

    const currentStatus = verifyResult.rows[0].is_completed;
    const newStatus = !currentStatus;

    await query(`
      UPDATE custom_plan_days
      SET is_completed = $1, completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END
      WHERE id = $2
    `, [newStatus, dayId]);

    res.json({
      success: true,
      data: { isCompleted: newStatus }
    });

  } catch (error) {
    console.error('Error toggling custom devotional:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/devotionals/:id/toggle
// Toggle completion status of a STANDARD devotional plan
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
