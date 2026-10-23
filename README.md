# CheerSpot by 20FIT

Record a voice note and cheer your champion on, live in the arena.

Race spectators record short voice-note cheers for athletes. An admin reviews each cheer through its transcript and approves it. A DJ then plays the approved cheers in the arena.

Live at **cheerspot.20fit.id** (once deployed).

## Routes

| Path      | Page       | Purpose                              |
| --------- | ---------- | ------------------------------------ |
| `/`       | Landing    | Intro and language toggle            |
| `/cheer`  | Cheer      | Spectators record and send a cheer   |
| `/admin`  | Admin      | Approve cheers from their transcript |
| `/dj`     | DJ Booth   | Play approved cheers                 |

All four pages are placeholders for now.

## Stack

- React + Vite (JavaScript)
- Tailwind CSS
- React Router
- Supabase (`@supabase/supabase-js`)

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values from your Supabase project settings:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Variables starting with `VITE_` are baked into the client bundle at build time. On Railway, set them on the service before building.

If they are empty, the app still runs. In development, the Landing page logs a warning to the console.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # dev server with hot reload
```

Other scripts:

```bash
npm run build      # production build into dist/
npm run preview    # preview the built app locally
npm start          # serve dist/ on $PORT (used on Railway)
```

## Deploy (Railway)

- Build command: `npm run build`
- Start command: `npm start`
- Railway sets `PORT` automatically. `server.js` serves `dist/` and falls back to `index.html`, so direct visits to `/admin` and `/dj` work.
