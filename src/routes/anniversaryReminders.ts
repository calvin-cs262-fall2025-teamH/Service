// Service/src/routes/anniversaryReminders.ts
import { Response, Router } from 'express';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper to get user's couple_id
async function getUserCoupleId(userId: number): Promise<number | null> {
  const result = await pool.query(
    'SELECT couple_id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.couple_id || null;
}

// Helper to transform database row to API response format
function transformReminderRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    coupleId: row.couple_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    anniversaryDate: row.reminder_date, // Map database reminder_date to frontend anniversaryDate
    reminderDaysBefore: row.reminder_days_before,
    isRecurring: row.is_recurring,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Create anniversary reminder
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      title,
      description,
      anniversaryDate,
      reminderDaysBefore = 7,
      isRecurring = true,
    } = req.body;

    if (!title || !anniversaryDate) {
      return res.status(400).json({
        success: false,
        message: 'Title and anniversary date are required',
      });
    }

    if (String(title).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot be empty',
      });
    }

    const coupleId = await getUserCoupleId(userId);

    if (!coupleId) {
      return res.status(400).json({
        success: false,
        message: 'You must be in a couple to create anniversary reminders',
      });
    }

    // Create anniversary reminder - match the exact table structure
    const result = await pool.query(
      `INSERT INTO anniversary_reminders
       (couple_id, user_id, title, description, reminder_date, reminder_days_before, is_recurring, is_enabled, reminder_type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'push', NOW(), NOW())
       RETURNING *`,
      [coupleId, userId, title.trim(), description?.trim() || null, anniversaryDate, reminderDaysBefore, isRecurring]
    );

    res.json({
      success: true,
      data: transformReminderRow(result.rows[0]),
      message: 'Anniversary reminder created successfully',
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Create error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create anniversary reminder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all anniversary reminders for the couple
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);

    if (!coupleId) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const result = await pool.query(
      `SELECT ar.*,
        (SELECT COUNT(*) FROM reminder_checklist_items rci
         WHERE rci.reminder_id = ar.id
        ) as checklist_count
       FROM anniversary_reminders ar
       WHERE ar.couple_id = $1
       ORDER BY ar.reminder_date ASC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...transformReminderRow(row),
        checklistCount: parseInt(row.checklist_count || '0'),
      })),
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Get all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get anniversary reminders',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get upcoming anniversary reminders (within 30 days)
router.get('/upcoming', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);

    if (!coupleId) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const result = await pool.query(
      `SELECT * FROM anniversary_reminders
       WHERE couple_id = $1
       AND is_enabled = true
       AND reminder_date >= CURRENT_DATE
       AND reminder_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY reminder_date ASC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows.map(transformReminderRow),
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Get upcoming error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming reminders',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get single anniversary reminder
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const reminderId = parseInt(req.params.id);

    if (!coupleId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const result = await pool.query(
      `SELECT * FROM anniversary_reminders
       WHERE id = $1 AND couple_id = $2`,
      [reminderId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anniversary reminder not found',
      });
    }

    res.json({
      success: true,
      data: transformReminderRow(result.rows[0]),
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Get one error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get anniversary reminder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update anniversary reminder
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const reminderId = parseInt(req.params.id);

    if (!coupleId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const {
      title,
      description,
      anniversaryDate,
      reminderDaysBefore,
      isRecurring,
      isEnabled,
    } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (anniversaryDate !== undefined) {
      updates.push(`reminder_date = $${paramCount}`);
      values.push(anniversaryDate);
      paramCount++;
    }
    if (reminderDaysBefore !== undefined) {
      updates.push(`reminder_days_before = $${paramCount}`);
      values.push(reminderDaysBefore);
      paramCount++;
    }
    if (isRecurring !== undefined) {
      updates.push(`is_recurring = $${paramCount}`);
      values.push(isRecurring);
      paramCount++;
    }
    if (isEnabled !== undefined) {
      updates.push(`is_enabled = $${paramCount}`);
      values.push(isEnabled);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(reminderId, coupleId);

    const result = await pool.query(
      `UPDATE anniversary_reminders
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND couple_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anniversary reminder not found',
      });
    }

    res.json({
      success: true,
      data: transformReminderRow(result.rows[0]),
      message: 'Anniversary reminder updated successfully',
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update anniversary reminder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Toggle anniversary reminder enabled status
router.put('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const reminderId = parseInt(req.params.id);

    if (!coupleId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const result = await pool.query(
      `UPDATE anniversary_reminders
       SET is_enabled = NOT is_enabled, updated_at = NOW()
       WHERE id = $1 AND couple_id = $2
       RETURNING *`,
      [reminderId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anniversary reminder not found',
      });
    }

    res.json({
      success: true,
      data: transformReminderRow(result.rows[0]),
      message: 'Anniversary reminder toggled successfully',
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle anniversary reminder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete anniversary reminder
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const reminderId = parseInt(req.params.id);

    if (!coupleId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const result = await pool.query(
      `DELETE FROM anniversary_reminders
       WHERE id = $1 AND couple_id = $2
       RETURNING id`,
      [reminderId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anniversary reminder not found',
      });
    }

    res.json({
      success: true,
      message: 'Anniversary reminder deleted successfully',
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete anniversary reminder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============= Checklist Item Routes =============

// Get all checklist items for a reminder
router.get('/:id/checklist', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const reminderId = parseInt(req.params.id);

    if (!coupleId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Verify the reminder belongs to the couple
    const reminderCheck = await pool.query(
      'SELECT id FROM anniversary_reminders WHERE id = $1 AND couple_id = $2',
      [reminderId, coupleId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anniversary reminder not found',
      });
    }

    const result = await pool.query(
      `SELECT id, reminder_id, title, is_completed, created_at, updated_at, created_by, is_shared
       FROM reminder_checklist_items
       WHERE reminder_id = $1
       ORDER BY created_at ASC`,
      [reminderId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        reminderId: row.reminder_id,
        title: row.title,
        isCompleted: row.is_completed,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        isShared: row.is_shared,
      })),
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Get checklist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get checklist items',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create checklist item
router.post('/:id/checklist', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const reminderId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    if (!coupleId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Verify the reminder belongs to the couple
    const reminderCheck = await pool.query(
      'SELECT id FROM anniversary_reminders WHERE id = $1 AND couple_id = $2',
      [reminderId, coupleId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anniversary reminder not found',
      });
    }

    const result = await pool.query(
      `INSERT INTO reminder_checklist_items (reminder_id, title, is_completed, created_at, updated_at, created_by, is_shared)
       VALUES ($1, $2, FALSE, NOW(), NOW(), $3, TRUE)
       RETURNING *`,
      [reminderId, title.trim(), userId]
    );

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        reminderId: result.rows[0].reminder_id,
        title: result.rows[0].title,
        isCompleted: result.rows[0].is_completed,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        createdBy: result.rows[0].created_by,
        isShared: result.rows[0].is_shared,
      },
      message: 'Checklist item created successfully',
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Create checklist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checklist item',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update checklist item
router.put('/:id/checklist/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const reminderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const { title, isCompleted } = req.body;

    if (!coupleId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Verify the reminder belongs to the couple
    const reminderCheck = await pool.query(
      'SELECT id FROM anniversary_reminders WHERE id = $1 AND couple_id = $2',
      [reminderId, coupleId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anniversary reminder not found',
      });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title.trim());
      paramCount++;
    }
    if (isCompleted !== undefined) {
      updates.push(`is_completed = $${paramCount}`);
      values.push(isCompleted);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(itemId, reminderId);

    const result = await pool.query(
      `UPDATE reminder_checklist_items
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND reminder_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        reminderId: result.rows[0].reminder_id,
        title: result.rows[0].title,
        isCompleted: result.rows[0].is_completed,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        createdBy: result.rows[0].created_by,
        isShared: result.rows[0].is_shared,
      },
      message: 'Checklist item updated successfully',
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Update checklist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update checklist item',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete checklist item
router.delete('/:id/checklist/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    const reminderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);

    if (!coupleId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Verify the reminder belongs to the couple
    const reminderCheck = await pool.query(
      'SELECT id FROM anniversary_reminders WHERE id = $1 AND couple_id = $2',
      [reminderId, coupleId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anniversary reminder not found',
      });
    }

    const result = await pool.query(
      `DELETE FROM reminder_checklist_items
       WHERE id = $1 AND reminder_id = $2
       RETURNING id`,
      [itemId, reminderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found',
      });
    }

    res.json({
      success: true,
      message: 'Checklist item deleted successfully',
    });
  } catch (error: unknown) {
    console.error('[anniversaryReminders] Delete checklist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete checklist item',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;