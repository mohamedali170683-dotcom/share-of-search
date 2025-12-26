# SearchShare Pro

A Share of Search and Share of Voice analytics tool that helps measure brand awareness and search visibility.

## Features

- **Share of Search (SOS)**: Calculate brand awareness through search volume comparison
- **Share of Voice (SOV)**: Measure visibility-weighted market share using CTR curves
- **Growth Gap Analysis**: Identify opportunities with SOV-SOS differential
- **DataForSEO Integration**: Fetch live keyword data from Google
- **Project Management**: Save and track multiple brand analyses
- **CSV Export**: Export metrics and keyword data

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel (via GitHub)

---

## Deploy to Vercel (from GitHub)

### Step 1: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select your **share-of-search** repository
4. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `prisma generate && npm run build`
   - **Output Directory**: `dist`

### Step 2: Add PostgreSQL Database

**Option A: Vercel Postgres (Recommended)**
1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database** → Select **Postgres**
3. Follow the setup wizard
4. Vercel automatically adds `POSTGRES_URL` environment variables

**Option B: Neon (Free tier available)**
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project and database
3. Copy the connection string

**Option C: Supabase**
1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to Settings → Database → Connection string
3. Copy the URI connection string

### Step 3: Configure Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Connection string with pooling |
| `DIRECT_URL` | `postgresql://...` | Direct connection (for migrations) |

**For Vercel Postgres**, use:
```
DATABASE_URL = ${POSTGRES_PRISMA_URL}
DIRECT_URL = ${POSTGRES_URL_NON_POOLING}
```

**For Neon**, use:
```
DATABASE_URL = postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
DIRECT_URL = postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### Step 4: Deploy

1. Click **Deploy** in Vercel
2. Vercel will:
   - Install dependencies
   - Generate Prisma client
   - Build the Vite app
   - Deploy serverless API functions

### Step 5: Initialize Database

After first deployment, you need to push the Prisma schema to your database.

**Option A**: Use Vercel's "Run Command" feature in the dashboard

**Option B**: Connect via Prisma Studio
1. In Vercel dashboard → Storage → Your database → Click "Open Prisma Studio"

**Option C**: Run locally once (if you have Node.js):
```bash
cd frontend
npm install
npx prisma db push
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sample-data` | GET | Get sample brand and keyword data |
| `/api/calculate` | POST | Calculate SOS, SOV, and Gap |
| `/api/ranked-keywords` | POST | Fetch ranked keywords from DataForSEO |
| `/api/projects` | GET/POST | List/create projects |
| `/api/projects/[id]` | GET/PUT/DELETE | Manage single project |
| `/api/projects/[id]/calculate` | POST | Calculate and save metrics |

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
- Gap > 2: Growth potential (visibility exceeds awareness)
- Gap < -2: Missing opportunities
- Gap ±2: Balanced
```

## CTR Curve

Position-based click-through rates used for SOV calculation:

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

## Using the App

1. **Sample Data**: The app loads with sample cosmetics brand data by default
2. **DataForSEO Integration**: Expand the API Configuration panel to connect to DataForSEO for live data
3. **Export**: Click "Export CSV" to download your analysis
4. **Projects** (with database): Save analyses and track changes over time

## License

MIT
