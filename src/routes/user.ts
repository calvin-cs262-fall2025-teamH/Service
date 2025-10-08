import { Router, Request, Response } from 'express';

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
router.get('/profile/:userId', (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    profile: user.profile || {},
    hasPartner: !!user.partnerId,
  });
});

// Update user profile
router.put('/profile/:userId', (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.profile = {
    ...user.profile,
    ...req.body,
  };

  res.json({ profile: user.profile });
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