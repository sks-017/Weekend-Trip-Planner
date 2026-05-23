# SAN

SAN is an AI-powered weekend travel planning agent for India. It is designed for working professionals, friend groups, bikers, families, and travelers who want realistic Friday-night-to-Monday-morning trip plans from a phone, laptop, or browser.

## What is included

- Next.js frontend with Tailwind styling
- Node serverless backend through `app/api/plan`
- SAN agent that audits budget, return safety, group fit, booking readiness, transport fatigue, and fallback options
- Origin-aware weekend data for New Delhi, Mumbai, Pune, Bengaluru, Hyderabad, Chennai, and Kolkata
- Self-drive car, bike trip, Volvo/bus, tempo traveller, and train-plus-cab transport modes
- Deterministic planning engine that works without any AI login or API key
- OpenAI, Gemini, and local-LLM adapter slots in `lib/aiProviders.js`
- Budget split, itinerary, stay suggestions, food/activity planning, weather/road notes, hidden gems, and Monday 8 AM return safety logic

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Optional AI providers

The app works in deterministic SAN mode by default. To enable an LLM-backed narrative from the API route, set:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

or:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=...
```

For a local model, set `AI_PROVIDER=local` and replace the adapter body in `lib/aiProviders.js` with your local inference endpoint.

## Deployment

- Vercel: deploy the app directory directly.
- Netlify: use the Next.js runtime/plugin and set the build command to `npm run build`.
- Cloudflare Pages: use an OpenNext/Cloudflare adapter for API route support, or keep the deterministic planner client-side for a static export.

Future production integrations fit naturally behind the current boundaries:

- Google Maps or OpenStreetMap routing API
- OpenWeatherMap weather feed
- Supabase or Firebase trip history
- Booking.com, Airbnb, or Goibibo affiliate connectors
- Optional auth for saved groups and shared itineraries
