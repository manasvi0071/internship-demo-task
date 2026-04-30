import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import authRoutes from "./auth.js";
import { authenticateToken } from "./middleware.js";
import type { AuthRequest } from "./middleware.js";
import configRoutes from "./configRoutes.js";
import recordsRoutes from "./recordsRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/configs", configRoutes);
app.use("/", recordsRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "Backend is running" });
});

app.get("/db-test", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully",
      time: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.use("/auth", authRoutes);

app.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    res.json({
      message: "Protected route working",
      user: req.user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch user" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});