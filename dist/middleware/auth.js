"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
/**
 * Middleware to verify JWT token and attach user info to request
 */
const authenticateToken = (req, res, next) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Attach user info to request (ensure number type)
        req.userId = typeof payload.id === 'string' ? parseInt(payload.id, 10) : payload.id;
        req.userEmail = payload.email;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Generate JWT token for a user
 */
const generateToken = (userId, email) => {
    return jsonwebtoken_1.default.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
