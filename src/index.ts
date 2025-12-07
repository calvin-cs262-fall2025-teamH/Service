import cors from 'cors';
import express from 'express';
import { pingDb } from './db';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import coupleRoutes from './routes/couple';
import activitiesRoutes from './routes/activities';
import calendarRoutes from './routes/calendar';
import prayersRoutes from './routes/prayers';
import anniversaryRemindersRoutes from './routes/anniversaryReminders';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
app.use(cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  // Only log non-GET requests or important endpoints to reduce noise
  if (req.method !== 'GET' || req.url.includes('/profile') || req.url.includes('/partner/generate') || req.url.includes('/partner/connect')) {
    console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.url + ' from ' + req.ip);
  }
  next();
});

// Auth & User routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// New feature routes
app.use('/api/couple', coupleRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/prayers', prayersRoutes);
app.use('/api/anniversary-reminders', anniversaryRemindersRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Service is running' });
});

async function start() {
  await pingDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on port ' + PORT + ', listening on all interfaces');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

