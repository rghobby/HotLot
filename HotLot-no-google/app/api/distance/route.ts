import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = (searchParams.get("origin") || "").trim();
    const destination = (searchParams.get("destination") || "").trim();
    const mode = (searchParams.get("mode") || "driving") as "driving"|"walking"|"transit";
    if (!destination) return NextResponse.json({ error: "Missing destination" }, { status: 400 });

    const o = parseLatLon(origin) ?? { lat: -37.8183, lon: 144.9671 };
    const d = parseLatLon(destination);
    if (!d) return NextResponse.json({ error: "Bad destination coords" }, { status: 400 });

    const km = haversineKm(o.lat, o.lon, d.lat, d.lon);

    let speedKmh = 25;
    if (mode === "driving") {
      if (km < 5) speedKmh = 18;
      else if (km < 15) speedKmh = 24;
      else speedKmh = 32;
      speedKmh *= 0.9;
    } else if (mode === "transit") {
      speedKmh = 16;
    } else if (mode === "walking") {
      speedKmh = 4.7;
    }

    let minutes = (km / Math.max(speedKmh, 1)) * 60;
    if (mode === "driving") minutes += Math.min(6, 2 + km * 0.2);
    if (mode === "transit") minutes += 4;

    minutes = Math.max(2, Math.min(180, minutes));
    const result = Math.round(minutes);

    return NextResponse.json({ minutes: result, method: "local-estimator", km: Math.round(km*10)/10 });
  } catch (e) {
    return NextResponse.json({ error: "Estimator failed" }, { status: 500 });
  }
}

function parseLatLon(s: string): { lat: number; lon: number } | null {
  const parts = s.split(",").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  return { lat, lon };
}

function haversineKm(lat1:number, lon1:number, lat2:number, lon2:number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function toRad(x:number){ return x * Math.PI / 180; }
