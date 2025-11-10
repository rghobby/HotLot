# Property Shortlister — MVP

A ready-to-run Next.js App Router project that lets buyers create a strategy profile, then scores properties using:
- Financial fit
- Lifestyle commute (Google Distance Matrix)
- Property attributes
- Capital growth heuristic
- Quietness (Traffic & Parking Risk) with Bayside-specific rules

## Quick start

```bash
npm install
cp .env.example .env.local
# put your Google Maps API key in .env.local
npm run dev
```

Open http://localhost:3000

## Env

```
GOOGLE_MAPS_API_KEY=your_key_here
```

## Notes
- The distance and risk routes are MVP skeletons with placeholder heuristics; replace with your real data sources (OSM/VicRoads/PTV/etc.).
- Listings are mock data. Swap `mockSearch()` with your Domain/PropTrack ingestion route.
