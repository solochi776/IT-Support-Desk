// Runs the Activity 7 test table against any base URL.
// Usage: npm run smoke            (tests http://localhost:3000)
//        npm run smoke -- https://your-backend.onrender.com
const base = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");
let passed = 0;
let failed = 0;

async function call(method, path, body, raw) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = raw ? body : JSON.stringify(body);
  }
  const res = await fetch(base + path, options);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json };
}

function check(name, condition, detail = "") {
  if (condition) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} ${detail}`); }
}

(async () => {
  console.log(`Testing ${base}\n`);
  const good = { title: "Smoke test request", category: "Network", description: "Created by the smoke test.", status: "Pending" };

  let r = await call("GET", "/health");
  check("GET /health returns 200", r.status === 200 && r.json?.status === "ok", JSON.stringify(r));

  r = await call("GET", "/api/records");
  check("GET /api/records returns 200 and an array", r.status === 200 && Array.isArray(r.json));
  const before = r.json?.length ?? 0;

  r = await call("POST", "/api/records", { ...good, id: 9999 });
  check("POST valid body returns 201 with a new id (client id ignored)", r.status === 201 && Number.isInteger(r.json?.id) && r.json.id !== 9999, JSON.stringify(r));
  const id = r.json?.id;

  r = await call("GET", `/api/records/${id}`);
  check("GET one returns the exact record", r.status === 200 && r.json?.title === good.title && r.json?.id === id);

  r = await call("PUT", `/api/records/${id}`, { title: "Changed title", category: "Software", description: "Changed by the smoke test.", status: "Completed" });
  check("PUT returns 200, new values and the original id", r.status === 200 && r.json?.id === id && r.json?.status === "Completed" && r.json?.title === "Changed title");

  r = await call("POST", "/api/records", { ...good, title: "   " });
  check("POST spaces-only title returns 400", r.status === 400 && typeof r.json?.message === "string");
  r = await call("POST", "/api/records", { ...good, status: "Done" });
  check("POST invalid status returns 400", r.status === 400 && typeof r.json?.message === "string");
  r = await call("POST", "/api/records", { category: "Network", description: "No title here.", status: "Pending" });
  check("POST missing title returns 400", r.status === 400);
  r = await call("POST", "/api/records", { ...good, title: 123 });
  check("POST non-string title returns 400", r.status === 400);
  r = await call("POST", "/api/records", "{ bad json", true);
  check("POST malformed JSON returns 400 with a JSON message", r.status === 400 && typeof r.json?.message === "string");

  r = await call("GET", "/api/records");
  check("Invalid requests created no rows", r.json?.length === before + 1, `expected ${before + 1}, got ${r.json?.length}`);

  r = await call("GET", "/api/records/abc");
  check("GET invalid id returns 400", r.status === 400);
  r = await call("PUT", "/api/records/0", good);
  check("PUT id 0 returns 400", r.status === 400);
  r = await call("DELETE", "/api/records/-5");
  check("DELETE negative id returns 400", r.status === 400);

  const missing = 99999999;
  r = await call("GET", `/api/records/${missing}`);
  check("GET missing id returns 404", r.status === 404);
  r = await call("PUT", `/api/records/${missing}`, good);
  check("PUT missing id returns 404 (does not create)", r.status === 404);
  r = await call("DELETE", `/api/records/${missing}`);
  check("DELETE missing id returns 404", r.status === 404);

  r = await call("DELETE", `/api/records/${id}`);
  check("DELETE returns 200 and the deletion message", r.status === 200 && r.json?.message === "Record deleted.");
  r = await call("GET", `/api/records/${id}`);
  check("GET deleted id now returns 404", r.status === 404);

  r = await call("GET", "/no/such/route");
  check("Unknown route returns 404 JSON", r.status === 404 && typeof r.json?.message === "string");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((error) => { console.error("Could not reach the server:", error.message); process.exit(1); });
