# SearchShare Pro

A Share of Search and Share of Voice analytics tool that helps measure brand awareness and search visibility.

## Features

- **Share of Search (SOS)**: Calculate brand awareness through search volume comparison
- **Share of Voice (SOV)**: Measure visibility-weighted market share using CTR curves
- **Growth Gap Analysis**: Identify opportunities with SOV-SOS differential
- **DataForSEO Integration**: Fetch live keyword data from Google
- **CSV Export**: Export metrics and keyword data
- **Projects** (optional): Save analyses with PostgreSQL database

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: PostgreSQL with Prisma (optional)

---

## Quick Deploy to Vercel

### Step 1: Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Click **Deploy**

That's it! The app will work immediately with sample data.

### Step 2: Add DataForSEO Credentials (for live data)

In Vercel → **Settings** → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `VITE_DATAFORSEO_LOGIN` | Your DataForSEO email |
| `VITE_DATAFORSEO_PASSWORD` | Your DataForSEO API password |

Then redeploy for changes to take effect.

### Step 3: Add Database (optional, for saving projects)

Only needed if you want to save projects. Skip this for basic usage.

1. In Vercel dashboard → **Storage** → **Create Database** → **Postgres**
2. Add environment variables:
   ```
   DATABASE_URL = ${POSTGRES_PRISMA_URL}
   DIRECT_URL = ${POSTGRES_URL_NON_POOLING}
   ```
3. Redeploy

---

## How It Works

### Without Database (Default)
- App loads with sample brand data
- Enter a domain to fetch live ranked keywords via DataForSEO
- Calculations work in-memory
- Export to CSV

### With Database
- Create and save projects
- Store brand keywords and ranked keywords
- Track calculation history

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_DATAFORSEO_LOGIN` | For live data | DataForSEO account email |
| `VITE_DATAFORSEO_PASSWORD` | For live data | DataForSEO API password |
| `DATABASE_URL` | Optional | PostgreSQL connection URL |
| `DIRECT_URL` | Optional | PostgreSQL direct URL |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sample-data` | GET | Get sample brand and keyword data |
| `/api/calculate` | POST | Calculate SOS, SOV, and Gap |
| `/api/ranked-keywords` | POST | Fetch ranked keywords from DataForSEO |
| `/api/projects` | GET/POST | List/create projects (requires DB) |

---

## Core Formulas

**Share of Search (SOS)**:
```
SOS = (Your Brand Search Volume / Total All Brand Search Volumes) × 100
```

**Share of Voice (SOV)**:
```
SOV = Sum(Keyword Volume × CTR at Position) / Total Market Volume × 100
```

**Growth Gap**:
```
Gap = SOV - SOS
- Gap > 2: Growth potential
- Gap < -2: Missing opportunities
- Gap ±2: Balanced
```

## CTR Curve

| Position | CTR |
|----------|-----|
| 1 | 28% |
| 2 | 15% |
| 3 | 9% |
| 4 | 6% |
| 5 | 4% |
| 6-10 | 3-1.5% |
| 11-20 | 1.2-0.2% |

---

## License

MIT
