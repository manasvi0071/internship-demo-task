import express from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { pool } from "./db.js";
import { authenticateToken } from "./middleware.js";
import type { AuthRequest } from "./middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

type Field = {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
};

type EntityConfig = {
  name: string;
  fields?: Field[];
};

function normalizeKey(value: string = ""): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getEntityConfig(normalizedConfig: { entities?: EntityConfig[] }, entityName: string) {
  return (normalizedConfig?.entities || []).find((entity) => entity.name === entityName);
}

function mapRowToEntityFields(row: Record<string, unknown>, fields: Field[]): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  const rowKeys = Object.keys(row);

  for (const field of fields) {
    const directValue = row[field.name];
    if (directValue !== undefined) {
      mapped[field.name] = directValue;
      continue;
    }

    const possible = [normalizeKey(field.name), normalizeKey(field.label || "")].filter(Boolean);

    const matchedKey = rowKeys.find((key) => possible.includes(normalizeKey(key)));
    mapped[field.name] = matchedKey ? row[matchedKey] : null;
  }

  return mapped;
}

function validateAndClean(fields: Field[], payload: Record<string, unknown>) {
  const errors: string[] = [];
  const cleaned: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = payload[field.name];

    if ((raw === undefined || raw === null || raw === "") && field.required) {
      errors.push(`${field.name} is required`);
      continue;
    }

    if (raw === undefined || raw === null || raw === "") {
      cleaned[field.name] = null;
      continue;
    }

    if (field.type === "number") {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        errors.push(`${field.name} must be a number`);
      } else {
        cleaned[field.name] = num;
      }
      continue;
    }

    if (field.type === "email") {
      const str = String(raw).trim();
      if (!str.includes("@")) {
        errors.push(`${field.name} must be a valid email`);
      } else {
        cleaned[field.name] = str;
      }
      continue;
    }

    if (field.type === "checkbox") {
      cleaned[field.name] =
        raw === true || raw === "true" || raw === "TRUE" || raw === "1" || raw === 1;
      continue;
    }

    if (field.type === "select") {
      const str = String(raw).trim();
      if (field.options?.length && !field.options.includes(str)) {
        errors.push(`${field.name} must be one of: ${field.options.join(", ")}`);
      } else {
        cleaned[field.name] = str;
      }
      continue;
    }

    cleaned[field.name] = String(raw);
  }

  return { errors, cleaned };
}

router.get(
  "/apps/:configId/entities/:entityName",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const configId = String(req.params.configId);
      const entityName = String(req.params.entityName);

      const result = await pool.query(
        `SELECT id, data, created_at, updated_at
         FROM records
         WHERE app_config_id = $1 AND entity_name = $2 AND owner_user_id = $3
         ORDER BY created_at DESC`,
        [configId, entityName, req.user?.userId]
      );

      return res.json({ records: result.rows });
    } catch (error) {
      console.error("GET RECORDS ERROR:", error);
      return res.status(500).json({ message: "Could not fetch records" });
    }
  }
);

router.post(
  "/apps/:configId/entities/:entityName",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const configId = String(req.params.configId);
      const entityName = String(req.params.entityName);

      const configResult = await pool.query(
        `SELECT normalized_config FROM app_configs WHERE id = $1`,
        [configId]
      );

      if (!configResult.rows.length) {
        return res.status(404).json({ message: "Config not found" });
      }

      const entity = getEntityConfig(configResult.rows[0].normalized_config, entityName);

      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }

      const { errors, cleaned } = validateAndClean(entity.fields || [], req.body as Record<string, unknown>);

      if (errors.length) {
        return res.status(400).json({ message: "Validation failed", errors });
      }

      const result = await pool.query(
        `INSERT INTO records (app_config_id, entity_name, owner_user_id, data)
         VALUES ($1, $2, $3, $4)
         RETURNING id, data, created_at, updated_at`,
        [configId, entityName, req.user?.userId, JSON.stringify(cleaned)]
      );

      return res.status(201).json({ record: result.rows[0] });
    } catch (error) {
      console.error("CREATE RECORD ERROR:", error);
      return res.status(500).json({ message: "Could not create record" });
    }
  }
);

router.post(
  "/apps/:configId/entities/:entityName/import",
  authenticateToken,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      const configId = String(req.params.configId);
      const entityName = String(req.params.entityName);

      if (!req.file) {
        return res.status(400).json({ message: "CSV file is required" });
      }

      const configResult = await pool.query(
        `SELECT normalized_config FROM app_configs WHERE id = $1`,
        [configId]
      );

      if (!configResult.rows.length) {
        return res.status(404).json({ message: "Config not found" });
      }

      const entity = getEntityConfig(configResult.rows[0].normalized_config, entityName);

      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }

      const csvText = req.file.buffer.toString("utf-8");

      const rows = parse(csvText, {
        columns: true,
        trim: true,
        skip_empty_lines: true,
        relax_column_count: true,
      }) as Record<string, unknown>[];

      let count = 0;
      const skippedRows: Array<{ row: number; errors: string[] }> = [];

      for (let i = 0; i < rows.length; i++) {
        const mapped = mapRowToEntityFields(rows[i], entity.fields || []);
        const { errors, cleaned } = validateAndClean(entity.fields || [], mapped);

        if (errors.length) {
          skippedRows.push({ row: i + 2, errors });
          continue;
        }

        await pool.query(
          `INSERT INTO records (app_config_id, entity_name, owner_user_id, data)
           VALUES ($1, $2, $3, $4)`,
          [configId, entityName, req.user?.userId, JSON.stringify(cleaned)]
        );

        count++;
      }

      return res.json({
        message: "CSV imported successfully",
        count,
        skipped: skippedRows.length,
        rowErrors: skippedRows,
      });
    } catch (error) {
      console.error("CSV IMPORT ERROR:", error);
      return res.status(500).json({ message: "Failed to import CSV" });
    }
  }
);

export default router;