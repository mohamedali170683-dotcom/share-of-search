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
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Vercel Postgres, Neon, Supabase, etc.)

### Local Development

1. **Clone and install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Push database schema**:
   ```bash
   npm run db:push
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **For local API development**, also run the backend:
   ```bash
   cd ../backend
   npm install
   npm run dev
   ```

## Vercel Deployment

### 1. Create a Vercel Project

```bash
npm i -g vercel
vercel
```

### 2. Add a PostgreSQL Database

Option A: **Vercel Postgres** (recommended)
- Go to your Vercel dashboard → Storage → Create Database → Postgres
- It will automatically add the environment variables

Option B: **Neon** or **Supabase**
- Create a PostgreSQL database
- Add `DATABASE_URL` and `DIRECT_URL` to Vercel environment variables

### 3. Environment Variables

Set these in Vercel dashboard → Settings → Environment Variables:

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### 4. Deploy

```bash
vercel --prod
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sample-data` | GET | Get sample brand and keyword data |
| `/api/calculate` | POST | Calculate SOS, SOV, and Gap |
| `/api/ranked-keywords` | POST | Fetch ranked keywords from DataForSEO |
| `/api/projects` | GET/POST | List/create projects |
| `/api/projects/[id]` | GET/PUT/DELETE | Manage single project |
| `/api/projects/[id]/calculate` | POST | Calculate and save metrics |

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

## License

MIT
