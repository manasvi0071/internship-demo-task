import express from "express";
import { pool } from "./db.js";
import { appConfigSchema } from "./configSchema.js";
import { normalizeConfig } from "./configUtils.js";
import { authenticateToken } from "./middleware.js";
import type { AuthRequest } from "./middleware.js";

const router = express.Router();

// GET all configs
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, created_at FROM app_configs ORDER BY created_at DESC"
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not fetch configs" });
  }
});

// POST create new config
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const parsed = appConfigSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid config",
        errors: parsed.error.flatten(),
      });
    }

    const { normalizedConfig, warnings } = normalizeConfig(parsed.data);

    const result = await pool.query(
      `INSERT INTO app_configs (name, raw_config, normalized_config, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, created_at`,
      [
        parsed.data.appName,
        JSON.stringify(parsed.data),
        JSON.stringify(normalizedConfig),
        req.user?.userId || null,
      ]
    );

    return res.status(201).json({
      message: "Config saved successfully",
      config: result.rows[0],
      warnings,
      normalizedConfig,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not save config" });
  }
});

// GET specific config by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, raw_config, normalized_config, created_at FROM app_configs WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Config not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not fetch config" });
  }
});

export default router;