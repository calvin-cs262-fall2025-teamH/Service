import { Router, Request, Response } from "express";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;
const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ 保存或更新用户资料
router.post("/profile", async (req: Request, res: Response) => {
  try {
    const { user_id, name, dateOfBirth, major, year, hobby } = req.body;

    // 检查是否存在资料
    const check = await pool.query("SELECT * FROM profiles WHERE user_id=$1", [user_id]);

    if (check.rows.length > 0) {
      // 已存在 → 更新
      await pool.query(
        `UPDATE profiles 
         SET name=$1, date_of_birth=$2, major=$3, year=$4, hobby=$5, updated_at=NOW()
         WHERE user_id=$6`,
        [name, dateOfBirth, major, year, hobby, user_id]
      );
    } else {
      // 不存在 → 插入
      await pool.query(
        `INSERT INTO profiles (user_id, name, date_of_birth, major, year, hobby)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user_id, name, dateOfBirth, major, year, hobby]
      );
    }

    res.json({ message: "Profile saved!" });
  } catch (err) {
    console.error("Error saving profile:", err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// ✅ 读取用户资料
router.get("/profile/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await pool.query("SELECT * FROM profiles WHERE user_id=$1", [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
