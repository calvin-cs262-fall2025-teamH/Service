// Service/src/routes/calendar.ts
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
 * POST /api/calendar/events
 * Create a calendar event linked to an activity
 */
router.post('/events', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { activityId, date, title, location } = req.body;

    if (!activityId || !date || !title) {
      return res.status(400).json({
        success: false,
        message: 'Activity ID, date, and title are required'
      });
    }

    // Validate date format
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Verify activity belongs to couple
    const activityCheck = await query(
      'SELECT id FROM activities WHERE id = $1 AND couple_id = $2',
      [activityId, coupleId]
    );

    if (activityCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found or access denied'
      });
    }

    // Create calendar event
    const result = await query(
      `INSERT INTO calendar_events (activity_id, date, title, location, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, activity_id, date, title, location, created_at`,
      [activityId, eventDate, title, location || null]
    );

    const event = result.rows[0];

    res.json({
      success: true,
      data: {
        id: event.id,
        activityId: event.activity_id,
        date: event.date,
        title: event.title,
        location: event.location,
        createdAt: event.created_at
      },
      message: 'Calendar event created successfully'
    });
  } catch (error: any) {
    console.error('[calendar] Create event error:', error);

    // Handle unique constraint violation (activity already has event)
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'This activity already has a calendar event'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create calendar event'
    });
  }
});

/**
 * GET /api/calendar/events
 * Get all calendar events for the user's couple
 */
router.get('/events', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.json({
        success: true,
        data: [],
        message: 'No couple found'
      });
    }

    // Get all calendar events with activity details
    const result = await query(
      `SELECT
        ce.id, ce.activity_id, ce.date, ce.title, ce.location, ce.created_at,
        a.title as activity_title, a.description as activity_description
       FROM calendar_events ce
       JOIN activities a ON ce.activity_id = a.id
       WHERE a.couple_id = $1
       ORDER BY ce.date ASC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        activityId: row.activity_id,
        date: row.date,
        title: row.title,
        location: row.location,
        activityTitle: row.activity_title,
        activityDescription: row.activity_description,
        createdAt: row.created_at
      }))
    });
  } catch (error: any) {
    console.error('[calendar] Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get calendar events'
    });
  }
});

/**
 * GET /api/calendar/events/:id
 * Get a specific calendar event
 */
router.get('/events/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const eventId = parseInt(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Get event with permission check
    const result = await query(
      `SELECT
        ce.id, ce.activity_id, ce.date, ce.title, ce.location, ce.created_at,
        a.title as activity_title, a.description as activity_description
       FROM calendar_events ce
       JOIN activities a ON ce.activity_id = a.id
       WHERE ce.id = $1 AND a.couple_id = $2`,
      [eventId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    const event = result.rows[0];

    res.json({
      success: true,
      data: {
        id: event.id,
        activityId: event.activity_id,
        date: event.date,
        title: event.title,
        location: event.location,
        activityTitle: event.activity_title,
        activityDescription: event.activity_description,
        createdAt: event.created_at
      }
    });
  } catch (error: any) {
    console.error('[calendar] Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get calendar event'
    });
  }
});

/**
 * PUT /api/calendar/events/:id
 * Update a calendar event
 */
router.put('/events/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const eventId = parseInt(req.params.id);
    const { date, title, location } = req.body;

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Validate date if provided
    if (date) {
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Update event with permission check
    const result = await query(
      `UPDATE calendar_events ce
       SET date = COALESCE($1, ce.date),
           title = COALESCE($2, ce.title),
           location = COALESCE($3, ce.location)
       FROM activities a
       WHERE ce.activity_id = a.id
         AND ce.id = $4
         AND a.couple_id = $5
       RETURNING ce.id, ce.activity_id, ce.date, ce.title, ce.location, ce.created_at`,
      [date, title, location, eventId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Calendar event updated successfully'
    });
  } catch (error: any) {
    console.error('[calendar] Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update calendar event'
    });
  }
});

/**
 * GET /api/calendar/upcoming
 * Get upcoming events (next 30 days)
 */
router.get('/upcoming', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.json({
        success: true,
        data: [],
        message: 'No couple found'
      });
    }

    // Get upcoming events within next 30 days
    const result = await query(
      `SELECT
        ce.id, ce.activity_id, ce.date, ce.title, ce.location,
        a.title as activity_title
       FROM calendar_events ce
       JOIN activities a ON ce.activity_id = a.id
       WHERE a.couple_id = $1
         AND ce.date >= CURRENT_DATE
         AND ce.date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY ce.date ASC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        activityId: row.activity_id,
        date: row.date,
        title: row.title,
        location: row.location,
        activityTitle: row.activity_title
      }))
    });
  } catch (error: any) {
    console.error('[calendar] Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming events'
    });
  }
});

/**
 * GET /api/calendar/anniversaries
 * Calculate anniversaries based on couple creation date
 */
router.get('/anniversaries', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Get user's couple with creation date
    const result = await query(
      `SELECT id, created_at FROM couples
       WHERE user1_id = $1 OR user2_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No couple found'
      });
    }

    const couple = result.rows[0];
    const createdAt = new Date(couple.created_at);
    const now = new Date();

    // Calculate days together
    const daysTogether = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate months together
    const monthsTogether =
      (now.getFullYear() - createdAt.getFullYear()) * 12 +
      (now.getMonth() - createdAt.getMonth());

    // Calculate years together
    const yearsTogether = Math.floor(monthsTogether / 12);

    // Calculate next month anniversary date
    const nextMonthAnniversary = new Date(createdAt);
    nextMonthAnniversary.setMonth(createdAt.getMonth() + monthsTogether + 1);
    // Handle day overflow (e.g., Jan 31 -> Feb 28)
    if (nextMonthAnniversary.getDate() !== createdAt.getDate()) {
      nextMonthAnniversary.setDate(0); // Set to last day of previous month
    }

    // Calculate next year anniversary date
    const nextYearAnniversary = new Date(createdAt);
    nextYearAnniversary.setFullYear(createdAt.getFullYear() + yearsTogether + 1);

    res.json({
      success: true,
      data: {
        startDate: createdAt,
        daysTogether,
        monthsTogether,
        yearsTogether,
        nextMonthAnniversary: nextMonthAnniversary > now ? nextMonthAnniversary : null,
        nextYearAnniversary: nextYearAnniversary > now ? nextYearAnniversary : null
      }
    });
  } catch (error: any) {
    console.error('[calendar] Get anniversaries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate anniversaries'
    });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Delete a calendar event
 */
router.delete('/events/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const eventId = parseInt(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Delete event with permission check
    const result = await query(
      `DELETE FROM calendar_events ce
       USING activities a
       WHERE ce.activity_id = a.id
         AND ce.id = $1
         AND a.couple_id = $2
       RETURNING ce.id`,
      [eventId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    res.json({
      success: true,
      message: 'Calendar event deleted successfully'
    });
  } catch (error: any) {
    console.error('[calendar] Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete calendar event'
    });
  }
});

export default router;
