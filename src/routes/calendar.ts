// Service/src/routes/calendar.ts
import { Router } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Helper function to get and validate user's partnership_id (couple_id)
 */
async function getUserPartnershipId(userId: number): Promise<number | null> {
  const result = await query(
    'SELECT couple_id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.couple_id || null;
}

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
router.post('/events', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { date, time, endTime, title, description, eventType, isAllDay, location } = req.body;

    if (!date || !title) {
      return res.status(400).json({
        success: false,
        message: 'Date and title are required'
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

    const partnershipId = await getUserPartnershipId(userId);
    if (!partnershipId) {
      return res.status(400).json({
        success: false,
        message: 'No partnership found. Please connect with your partner first.'
      });
    }

    // Create calendar event
    const result = await query(
      `INSERT INTO calendar_events
       (partnership_id, added_by_user_id, title, description, event_date, event_time, end_time, is_all_day, event_type, location, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [partnershipId, userId, title, description || null, date, time || null, endTime || null, isAllDay !== false, eventType || 'other', location || null]
    );

    const event = result.rows[0];

    res.json({
      success: true,
      data: {
        id: event.id,
        partnershipId: event.partnership_id,
        addedBy: event.added_by_user_id,
        title: event.title,
        description: event.description,
        date: event.event_date,
        time: event.event_time,
        endTime: event.end_time,
        isAllDay: event.is_all_day,
        eventType: event.event_type,
        location: event.location,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      },
      message: 'Calendar event created successfully'
    });
  } catch (error: any) {
    console.error('[calendar] Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create calendar event',
      error: error.message
    });
  }
});

/**
 * GET /api/calendar/events
 * Get all calendar events for the user's partnership
 */
router.get('/events', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const partnershipId = await getUserPartnershipId(userId);

    if (!partnershipId) {
      return res.status(400).json({
        success: false,
        message: 'No partnership found'
      });
    }

    // Get all calendar events for this partnership
    const result = await query(
      `SELECT
        ce.*,
        u.name as added_by_name
       FROM calendar_events ce
       LEFT JOIN users u ON ce.added_by_user_id = u.id
       WHERE ce.partnership_id = $1
       ORDER BY ce.event_date ASC, ce.event_time ASC NULLS LAST`,
      [partnershipId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        partnershipId: row.partnership_id,
        addedBy: row.added_by_user_id,
        addedByName: row.added_by_name,
        title: row.title,
        description: row.description,
        date: row.event_date,
        time: row.event_time,
        endTime: row.end_time,
        isAllDay: row.is_all_day,
        eventType: row.event_type,
        location: row.location,
        googleCalendarId: row.google_calendar_id,
        appleCalendarId: row.apple_calendar_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error: any) {
    console.error('[calendar] Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events'
    });
  }
});

/**
 * GET /api/calendar/events/:id
 * Get a specific calendar event by ID
 */
router.get('/events/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const eventId = parseInt(req.params.id);
    const partnershipId = await getUserPartnershipId(userId);

    if (!partnershipId) {
      return res.status(400).json({
        success: false,
        message: 'No partnership found'
      });
    }

    // Get event with permission check
    const result = await query(
      `SELECT
        ce.*,
        u.name as added_by_name
       FROM calendar_events ce
       LEFT JOIN users u ON ce.added_by_user_id = u.id
       WHERE ce.id = $1 AND ce.partnership_id = $2`,
      [eventId, partnershipId]
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
        partnershipId: event.partnership_id,
        addedBy: event.added_by_user_id,
        addedByName: event.added_by_name,
        title: event.title,
        description: event.description,
        date: event.event_date,
        time: event.event_time,
        isAllDay: event.is_all_day,
        eventType: event.event_type,
        googleCalendarId: event.google_calendar_id,
        appleCalendarId: event.apple_calendar_id,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      }
    });
  } catch (error: any) {
    console.error('[calendar] Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar event'
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
    const { date, time, endTime, title, description, eventType, isAllDay, location } = req.body;

    const partnershipId = await getUserPartnershipId(userId);
    if (!partnershipId) {
      return res.status(400).json({
        success: false,
        message: 'No partnership found'
      });
    }

    // Update event with permission check
    const result = await query(
      `UPDATE calendar_events
       SET event_date = COALESCE($1, event_date),
           event_time = COALESCE($2, event_time),
           end_time = COALESCE($3, end_time),
           title = COALESCE($4, title),
           description = COALESCE($5, description),
           event_type = COALESCE($6, event_type),
           is_all_day = COALESCE($7, is_all_day),
           location = COALESCE($8, location),
           updated_at = NOW()
       WHERE id = $9
         AND partnership_id = $10
       RETURNING *`,
      [date, time, endTime, title, description, eventType, isAllDay, location, eventId, partnershipId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found or access denied'
      });
    }

    const event = result.rows[0];

    res.json({
      success: true,
      data: {
        id: event.id,
        partnershipId: event.partnership_id,
        addedBy: event.added_by_user_id,
        title: event.title,
        description: event.description,
        date: event.event_date,
        time: event.event_time,
        endTime: event.end_time,
        isAllDay: event.is_all_day,
        eventType: event.event_type,
        location: event.location,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      },
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
 * DELETE /api/calendar/events/:id
 * Delete a calendar event
 */
router.delete('/events/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const eventId = parseInt(req.params.id);

    const partnershipId = await getUserPartnershipId(userId);
    if (!partnershipId) {
      return res.status(400).json({
        success: false,
        message: 'No partnership found'
      });
    }

    // Delete event with permission check
    const result = await query(
      `DELETE FROM calendar_events
       WHERE id = $1
         AND partnership_id = $2
       RETURNING id`,
      [eventId, partnershipId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found or access denied'
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

/**
 * GET /api/calendar/upcoming
 * Get upcoming events within next 30 days
 */
router.get('/upcoming', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const partnershipId = await getUserPartnershipId(userId);

    if (!partnershipId) {
      return res.status(400).json({
        success: false,
        message: 'No partnership found'
      });
    }

    // Get upcoming events within next 30 days
    const result = await query(
      `SELECT
        ce.*,
        u.name as added_by_name
       FROM calendar_events ce
       LEFT JOIN users u ON ce.added_by_user_id = u.id
       WHERE ce.partnership_id = $1
         AND ce.event_date >= CURRENT_DATE
         AND ce.event_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY ce.event_date ASC, ce.event_time ASC NULLS LAST`,
      [partnershipId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        partnershipId: row.partnership_id,
        addedBy: row.added_by_user_id,
        addedByName: row.added_by_name,
        title: row.title,
        description: row.description,
        date: row.event_date,
        time: row.event_time,
        isAllDay: row.is_all_day,
        eventType: row.event_type,
        createdAt: row.created_at
      }))
    });
  } catch (error: any) {
    console.error('[calendar] Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events'
    });
  }
});

/**
 * GET /api/calendar/anniversaries
 * Calculate relationship anniversaries and milestones
 */
router.get('/anniversaries', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const partnershipId = await getUserPartnershipId(userId);

    if (!partnershipId) {
      return res.status(400).json({
        success: false,
        message: 'No partnership found'
      });
    }

    // Get couple's created date
    const coupleResult = await query(
      'SELECT created_at FROM couples WHERE id = $1',
      [partnershipId]
    );

    if (coupleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partnership not found'
      });
    }

    const relationshipStart = new Date(coupleResult.rows[0].created_at);
    const today = new Date();

    // Calculate days together
    const daysTogether = Math.floor((today.getTime() - relationshipStart.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate months together
    let monthsTogether = (today.getFullYear() - relationshipStart.getFullYear()) * 12;
    monthsTogether += today.getMonth() - relationshipStart.getMonth();

    // Calculate years together
    const yearsTogether = Math.floor(monthsTogether / 12);

    // Calculate next milestones
    const nextDay100 = new Date(relationshipStart);
    nextDay100.setDate(nextDay100.getDate() + Math.ceil(daysTogether / 100) * 100);

    const nextMonthAnniversary = new Date(relationshipStart);
    nextMonthAnniversary.setMonth(relationshipStart.getMonth() + monthsTogether + 1);

    const nextYearAnniversary = new Date(relationshipStart);
    nextYearAnniversary.setFullYear(relationshipStart.getFullYear() + yearsTogether + 1);

    res.json({
      success: true,
      data: {
        relationshipStart: relationshipStart.toISOString().split('T')[0],
        daysTogether,
        monthsTogether,
        yearsTogether,
        nextMilestones: {
          next100Days: nextDay100.toISOString().split('T')[0],
          nextMonthAnniversary: nextMonthAnniversary.toISOString().split('T')[0],
          nextYearAnniversary: nextYearAnniversary.toISOString().split('T')[0]
        }
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

export default router;
