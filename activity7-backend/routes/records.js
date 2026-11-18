const router = require("express").Router();
const pool = require("../db");

const STATUSES = ["Pending", "In progress", "Completed"];
const MAX_INT4 = 2147483647;
const COLUMNS = "id, title, category, description, status";

/* ---------- helpers ---------- */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// id must be a positive whole number. Anything else is a 400.
function parseId(value) {
  if (!/^\d+$/.test(value)) {
    throw new HttpError(400, "The id must be a positive whole number.");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(400, "The id must be a positive whole number.");
  }
  return id;
}

// An id above the database integer range cannot exist.
function idCanExist(id) {
  return id <= MAX_INT4;
}

const notFound = () => new HttpError(404, "Record not found.");

// Checks the four editable fields. A client-supplied id is ignored.
function validateBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Send a JSON object with title, category, description and status.");
  }

  const labels = { title: "Title", category: "Category", description: "Description", status: "Status" };
  for (const field of Object.keys(labels)) {
    if (body[field] === undefined || body[field] === null) {
      throw new HttpError(400, `${labels[field]} is required.`);
    }
    if (typeof body[field] !== "string") {
      throw new HttpError(400, `${labels[field]} must be a string.`);
    }
  }

  const title = body.title.trim();
  const category = body.category.trim();
  const description = body.description.trim();
  const status = body.status; // status must match exactly, so it is not trimmed

  if (title.length < 3 || title.length > 80) {
    throw new HttpError(400, "Title must have 3 to 80 characters.");
  }
  if (category.length < 2 || category.length > 40) {
    throw new HttpError(400, "Category must have 2 to 40 characters.");
  }
  if (description.length < 5 || description.length > 300) {
    throw new HttpError(400, "Description must have 5 to 300 characters.");
  }
  if (!STATUSES.includes(status)) {
    throw new HttpError(400, "Status must be Pending, In progress or Completed.");
  }

  return { title, category, description, status };
}

/* ---------- routes ---------- */

// GET all
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM records ORDER BY id`);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET one
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!idCanExist(id)) throw notFound();
    const result = await pool.query(`SELECT ${COLUMNS} FROM records WHERE id = $1`, [id]);
    if (result.rowCount === 0) throw notFound();
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST create
router.post("/", async (req, res, next) => {
  try {
    const { title, category, description, status } = validateBody(req.body);
    const result = await pool.query(
      `INSERT INTO records (title, category, description, status)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [title, category, description, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT replace the four editable fields (never creates a record)
router.put("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const { title, category, description, status } = validateBody(req.body);
    if (!idCanExist(id)) throw notFound();
    const result = await pool.query(
      `UPDATE records
       SET title = $1, category = $2, description = $3, status = $4
       WHERE id = $5 RETURNING ${COLUMNS}`,
      [title, category, description, status, id]
    );
    if (result.rowCount === 0) throw notFound();
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!idCanExist(id)) throw notFound();
    const result = await pool.query("DELETE FROM records WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) throw notFound();
    res.status(200).json({ message: "Record deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
