# IT Support Desk API (ICT251 Activity 7)

Node.js, Express and PostgreSQL backend for the IT Support Desk.
Student: Shadrick Solochi, 202509615.

## Run it locally
1. Install Node.js LTS and PostgreSQL (or use your Render database's EXTERNAL URL).
2. `npm install`
3. Copy `.env.example` to `.env` and set `DATABASE_URL`.
4. `npm start` then open http://localhost:3000
   The tables are created and the 9 starting records are inserted once on first start.
5. In a second terminal: `npm run smoke` runs every test from Section 7 of the brief.
   Against the hosted API: `npm run smoke -- https://your-backend.onrender.com`

## Deploy on Render
**A. Database**
1. Render dashboard > New > PostgreSQL. Name it `itsupport-db`, choose the Free plan, create it.
2. When it is ready, copy the **Internal Database URL** from its page.

**B. GitHub**
1. Create a new repository and upload everything in this folder (package.json and package-lock.json included). `.env` and `node_modules` are already excluded by `.gitignore`.

**C. Web service**
1. Render dashboard > New > Web Service > connect the repository.
2. Language: Node. Build command: `npm install`. Start command: `npm start`. Instance type: Free.
3. Environment variables:
   - `DATABASE_URL` = the Internal Database URL from step A
   - `CLIENT_ORIGINS` = your Netlify frontend URL, no trailing slash (add more with commas)
   - `PUBLIC_URL` (optional) = your Render service URL, so the guide page shows it
4. Deploy. In the logs you should see `Starting records inserted.` then `Server listening`.
5. Open the service URL (the API guide), then `/health`, then run `npm run smoke -- <your URL>`.

Submit the service URL, for example `https://your-backend.onrender.com`.

## Postman requests (Section 7 tests)
Set `Content-Type: application/json` for POST and PUT.

| Test | Request | Expect |
|---|---|---|
| Health | GET /health | 200 |
| List | GET /api/records | 200, array |
| Create | POST /api/records with the body below | 201, new id |
| Read one | GET /api/records/{id} | 200 |
| Update | PUT /api/records/{id} with all four fields | 200, same id |
| Delete | DELETE /api/records/{id} | 200, `{"message":"Record deleted."}` |
| After delete | GET /api/records/{id} | 404 |
| Bad input | POST with no title, or status `Done` | 400 |
| Bad id / bad JSON | GET /api/records/abc, or POST `{ bad` | 400 |
| Missing id | GET, PUT, DELETE /api/records/99999 | 404 each |

```json
{
  "title": "Laptop will not start",
  "category": "Hardware",
  "description": "The laptop shows a black screen after the logo.",
  "status": "Pending"
}
```
