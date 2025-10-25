// Service/src/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";


const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    if (!isEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (String(password).length < 6) return res.status(400).json({ error: "Password too short (>=6)" });

    const exists = await query("SELECT 1 FROM users WHERE email=$1", [email]);
    if (exists.rowCount) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const insert = await query(
      "INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id, email, created_at",
      [email, hash]
    );
    const user = insert.rows[0];


    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ user, token });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const result = await query("SELECT id, email, password_hash FROM users WHERE email=$1", [email]);
    if (!result.rowCount) return res.status(400).json({ error: "Invalid credentials" });
    const user = result.rows[0];

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "No token" });

    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    const result = await query("SELECT id, email, created_at FROM users WHERE id=$1", [payload.id]);
    if (!result.rowCount) return res.status(404).json({ error: "User not found" });

    res.json({ user: result.rows[0] });
  } catch (e: any) {
    console.error(e);
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
