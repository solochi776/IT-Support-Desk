const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

// Hosted databases (Render and others) need SSL. A local database usually does not.
function useSsl() {
  if (process.env.DATABASE_SSL === "true") return true;
  if (process.env.DATABASE_SSL === "false") return false;
  if (!connectionString) return false;
  return !/@(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(connectionString);
}

const pool = new Pool({
  connectionString,
  ssl: useSsl() ? { rejectUnauthorized: false } : false
});

pool.on("error", (error) => {
  // An idle client failed. Log it; the pool creates a new client when needed.
  console.error("Unexpected database error:", error.message);
});

// Creates the tables if they are missing and inserts the starting records once.
async function initDatabase() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env locally or to the service environment on Render.");
  }
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock so two starting instances cannot both seed.
    await client.query("SELECT pg_advisory_xact_lock(7001)");
    await client.query(schema);
    const seeded = await client.query("SELECT 1 FROM seed_state WHERE name = 'records'");
    if (seeded.rowCount === 0) {
      await client.query(seed);
      await client.query("INSERT INTO seed_state (name) VALUES ('records')");
      console.log("Starting records inserted.");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.initDatabase = initDatabase;
