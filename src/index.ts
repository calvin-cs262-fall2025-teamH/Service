import cors from 'cors';
import express from 'express';
import { pingDb } from './db';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors({
  origin: true,
  credentials: false,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());

// app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.url + ' from ' + req.ip);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);


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
