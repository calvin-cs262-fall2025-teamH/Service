// Service/src/routes/activities.ts
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
 * POST /api/activities
 * Create a new activity/memory
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { title, description, date, location } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: 'Title and date are required'
      });
    }

    // Validate date format
    const activityDate = new Date(date);
    if (isNaN(activityDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Get user's couple
    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(400).json({
        success: false,
        message: 'You must be part of a couple to create activities'
      });
    }

    // Create activity
    const result = await query(
      `INSERT INTO activities (couple_id, title, description, date, location, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, couple_id, title, description, date, location, created_at`,
      [coupleId, title, description || null, activityDate, location || null]
    );

    const activity = result.rows[0];

    res.json({
      success: true,
      data: {
        id: activity.id,
        coupleId: activity.couple_id,
        title: activity.title,
        description: activity.description,
        date: activity.date,
        location: activity.location,
        createdAt: activity.created_at
      },
      message: 'Activity created successfully'
    });
  } catch (error: unknown) {
    console.error('[activities] Create error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity'
    });
  }
});

/**
 * GET /api/activities
 * Get all activities for the user's couple
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
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

    // Get all activities with photo count
    const result = await query(
      `SELECT
        a.id, a.title, a.description, a.date, a.location, a.created_at,
        COUNT(p.id) as photo_count
       FROM activities a
       LEFT JOIN photo_collages p ON a.id = p.activity_id
       WHERE a.couple_id = $1
       GROUP BY a.id
       ORDER BY a.date DESC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        date: row.date,
        location: row.location,
        photoCount: parseInt(row.photo_count) || 0,
        createdAt: row.created_at
      }))
    });
  } catch (error: unknown) {
    console.error('[activities] Get all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activities'
    });
  }
});

/**
 * GET /api/activities/:id
 * Get a specific activity with all its photos
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const activityId = parseInt(req.params.id);

    if (isNaN(activityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Get activity with permission check
    const activityResult = await query(
      `SELECT id, couple_id, title, description, date, location, created_at
       FROM activities
       WHERE id = $1 AND couple_id = $2`,
      [activityId, coupleId]
    );

    if (activityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activityResult.rows[0];

    // Get all photos for this activity
    const photosResult = await query(
      `SELECT id, photo_url, caption, created_at
       FROM photo_collages
       WHERE activity_id = $1
       ORDER BY created_at ASC`,
      [activityId]
    );

    res.json({
      success: true,
      data: {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        date: activity.date,
        location: activity.location,
        createdAt: activity.created_at,
        photos: photosResult.rows.map(p => ({
          id: p.id,
          photoUrl: p.photo_url,
          caption: p.caption,
          createdAt: p.created_at
        }))
      }
    });
  } catch (error: unknown) {
    console.error('[activities] Get one error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity'
    });
  }
});

/**
 * PUT /api/activities/:id
 * Update an activity
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const activityId = parseInt(req.params.id);
    const { title, description, date, location } = req.body;

    if (isNaN(activityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Validate date if provided
    if (date) {
      const activityDate = new Date(date);
      if (isNaN(activityDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
    }

    // Update activity with permission check
    const result = await query(
      `UPDATE activities
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           date = COALESCE($3, date),
           location = COALESCE($4, location),
           updated_at = NOW()
       WHERE id = $5 AND couple_id = $6
       RETURNING id, couple_id, title, description, date, location, created_at`,
      [title, description, date, location, activityId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Activity updated successfully'
    });
  } catch (error: unknown) {
    console.error('[activities] Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update activity'
    });
  }
});

/**
 * DELETE /api/activities/:id
 * Delete an activity and all its photos (cascade)
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const activityId = parseInt(req.params.id);

    if (isNaN(activityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Delete activity with permission check (photos will cascade delete)
    const result = await query(
      'DELETE FROM activities WHERE id = $1 AND couple_id = $2 RETURNING id',
      [activityId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error: unknown) {
    console.error('[activities] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity'
    });
  }
});

/**
 * POST /api/activities/:id/photos
 * Add a photo to an activity
 */
router.post('/:id/photos', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const activityId = parseInt(req.params.id);
    const { photoUrl, caption } = req.body;

    if (isNaN(activityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity ID'
      });
    }

    if (!photoUrl || String(photoUrl).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Photo URL is required'
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

    // Add photo
    const result = await query(
      `INSERT INTO photo_collages (activity_id, photo_url, caption, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, activity_id, photo_url, caption, created_at`,
      [activityId, photoUrl.trim(), caption || null]
    );

    const photo = result.rows[0];

    res.json({
      success: true,
      data: {
        id: photo.id,
        activityId: photo.activity_id,
        photoUrl: photo.photo_url,
        caption: photo.caption,
        createdAt: photo.created_at
      },
      message: 'Photo added successfully'
    });
  } catch (error: unknown) {
    console.error('[activities] Add photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add photo'
    });
  }
});

/**
 * DELETE /api/activities/:activityId/photos/:photoId
 * Delete a specific photo from an activity
 */
router.delete('/:activityId/photos/:photoId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const activityId = parseInt(req.params.activityId);
    const photoId = parseInt(req.params.photoId);

    if (isNaN(activityId) || isNaN(photoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity or photo ID'
      });
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      return res.status(404).json({
        success: false,
        message: 'No couple found'
      });
    }

    // Delete photo with permission check
    const result = await query(
      `DELETE FROM photo_collages pc
       USING activities a
       WHERE pc.activity_id = a.id
         AND pc.id = $1
         AND pc.activity_id = $2
         AND a.couple_id = $3
       RETURNING pc.id`,
      [photoId, activityId, coupleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error: unknown) {
    console.error('[activities] Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete photo'
    });
  }
});

/**
 * GET /api/timeline (alias for timeline view)
 * Get timeline view with activities and sample photos
 */
router.get('/timeline/all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    console.log('[activities/timeline] Request from userId:', userId);

    const coupleId = await getUserCoupleId(userId);
    console.log('[activities/timeline] User coupleId:', coupleId);
    if (!coupleId) {
      console.log('[activities/timeline] No couple found, returning empty array');
      return res.json({
        success: true,
        data: [],
        message: 'No couple found'
      });
    }

    // Get all activities with their first 3 photos using aggregation
    const result = await query(
      `SELECT
        a.id, a.title, a.description, a.date, a.location, a.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'photoUrl', p.photo_url,
              'caption', p.caption,
              'createdAt', p.created_at
            ) ORDER BY p.created_at ASC
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as photos
       FROM activities a
       LEFT JOIN LATERAL (
         SELECT id, photo_url, caption, created_at
         FROM photo_collages
         WHERE activity_id = a.id
         ORDER BY created_at ASC
         LIMIT 3
       ) p ON true
       WHERE a.couple_id = $1
       GROUP BY a.id
       ORDER BY a.date DESC, a.created_at DESC`,
      [coupleId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        date: row.date,
        location: row.location,
        createdAt: row.created_at,
        photos: row.photos
      }))
    });
  } catch (error: unknown) {
    console.error('[activities] Get timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get timeline'
    });
  }
});

export default router;
