import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = searchParams.get("origin");
    const destination = searchParams.get("destination");
    const mode = (searchParams.get("mode") || "driving") as "driving"|"walking"|"transit";
    if (!origin || !destination) return NextResponse.json({ error: "Missing origin/destination" }, { status: 400 });

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", origin);
    url.searchParams.set("destinations", destination);
    url.searchParams.set("mode", mode);
    url.searchParams.set("region", "au");
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Google API error");
    const json = await res.json();
    const minutes = json?.rows?.[0]?.elements?.[0]?.duration?.value
      ? Math.round(json.rows[0].elements[0].duration.value / 60)
      : null;
    return NextResponse.json({ minutes });
  } catch (e) {
    return NextResponse.json({ error: "Distance service failed" }, { status: 500 });
  }
}
