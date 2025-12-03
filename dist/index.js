"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const couple_1 = __importDefault(require("./routes/couple"));
const activities_1 = __importDefault(require("./routes/activities"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const prayers_1 = __importDefault(require("./routes/prayers"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '4000', 10);
app.use((0, cors_1.default)({
    origin: true,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', (0, cors_1.default)());
// app.use(cors());
app.use(express_1.default.json());
app.use((req, res, next) => {
    // Only log non-GET requests or important endpoints to reduce noise
    if (req.method !== 'GET' || req.url.includes('/profile') || req.url.includes('/partner/generate') || req.url.includes('/partner/connect')) {
        console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.url + ' from ' + req.ip);
    }
    next();
});
// Auth & User routes
app.use('/api/auth', auth_1.default);
app.use('/api/user', user_1.default);
// New feature routes
app.use('/api/couple', couple_1.default);
app.use('/api/activities', activities_1.default);
app.use('/api/calendar', calendar_1.default);
app.use('/api/prayers', prayers_1.default);
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/', (req, res) => {
    res.json({ message: 'Service is running' });
});
async function start() {
    await (0, db_1.pingDb)();
    app.listen(PORT, '0.0.0.0', () => {
        console.log('Server running on port ' + PORT + ', listening on all interfaces');
    });
}
start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
