import { Router, Request, Response } from 'express';
import pool from '../db'; // ✅ Import the pool instance
const router = Router();

interface User {
  id: number;
  email: string;
  password: string;
  profile?: {
    name?: string;
    dateOfBirth?: string;
    major?: string;
    year?: string;
    hobby?: string;
  };
  partnerId?: number;
  connectionCode?: string;
}

// This should be the same users array from auth.ts
// In a real app, this would be a database
let users: User[] = [];

// Export setter to sync with auth.ts
export const setUsers = (usersArray: User[]) => {
  users = usersArray;
};

// Get user profile
router.get('/profile/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  try {
    const { rows } = await pool.query(
      'SELECT name, date_of_birth, major, year, hobby FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (rows.length > 0) {
      return res.json({ profile: rows[0] });
    }
  } catch (err) {
    console.error('DB error:', err);
  }

  // fallback: 内存 users
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ profile: user.profile || {} });
});


// Update user profile
router.put('/profile/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const { name, dateOfBirth, major, year, hobby } = req.body;

  try {
    await pool.query(
      `INSERT INTO profiles (user_id, name, date_of_birth, major, year, hobby)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id)
       DO UPDATE SET name=$2, date_of_birth=$3, major=$4, year=$5, hobby=$6`,
      [userId, name, dateOfBirth, major, year, hobby]
    );
  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ error: 'Failed to save profile' });
  }

  // 保留原来的内存更新
  const user = users.find(u => u.id === userId);
  if (user) {
    user.profile = { ...user.profile, ...req.body };
  }

  res.json({ profile: req.body });
});

// Generate connection code
router.post('/partner/generate-code/:userId', (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Generate a 6-character code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  user.connectionCode = code;

  res.json({ code });
});

// Connect with partner using code
router.post('/partner/connect', (req: Request, res: Response) => {
  const { userId, partnerCode } = req.body;

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const partner = users.find(u => u.connectionCode === partnerCode);
  if (!partner) {
    return res.status(404).json({ error: 'Invalid partner code' });
  }

  if (partner.id === userId) {
    return res.status(400).json({ error: 'Cannot connect with yourself' });
  }

  // Connect both users
  user.partnerId = partner.id;
  partner.partnerId = user.id;

  res.json({ message: 'Connected successfully', partnerId: partner.id });
});

// Unmatch from partner
router.post('/partner/unmatch/:userId', (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const user = users.find(u => u.id === userId);

  if (!user || !user.partnerId) {
    return res.status(404).json({ error: 'No partner found' });
  }

  const partner = users.find(u => u.id === user.partnerId);
  if (partner) {
    partner.partnerId = undefined;
  }

  user.partnerId = undefined;

  res.json({ message: 'Unmatched successfully' });
});

export default router;