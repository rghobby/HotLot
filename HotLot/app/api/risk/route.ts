import { NextRequest, NextResponse } from "next/server";

const BAYSIDE_SUBURBS = new Set([
  "Sandringham","Hampton","Hampton East","Brighton","Brighton East",
  "Beaumaris","Black Rock","Highett","Cheltenham"
]);

function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lon = Number(searchParams.get("lon"));
    const suburb = (searchParams.get("suburb")||"").trim();
    if (!isFinite(lat) || !isFinite(lon)) return NextResponse.json({ error: "Bad coords" }, { status: 400 });

    // Placeholder heuristics. Replace with real OSM/VicRoads/PTV lookups.
    let risk = 0.4;
    const notes: string[] = [];

    // Fake distances for demo (replace with spatial lookup results)
    const distM = 90;
    const aadt = 32000;

    if (distM <= 50) { risk += 0.35; notes.push("Fronts or near arterial (≤50m)"); }
    else if (distM <= 120) { risk += 0.20; notes.push("Close to arterial (≤120m)"); }
    else if (distM <= 200) { risk += 0.08; notes.push("Within 200m of arterial"); }

    if (aadt >= 40000) { risk += 0.20; notes.push("High traffic volume (AADT ≥40k)"); }
    else if (aadt >= 20000) { risk += 0.10; notes.push("Moderate traffic (20k–40k)"); }

    const interDist = 70;
    if (interDist <= 50) { risk += 0.10; notes.push("Near signalised intersection (≤50m)"); }

    const ptVehPerHr = 10;
    if (ptVehPerHr >= 20) { risk += 0.08; notes.push("High-frequency PT corridor"); }
    else if (ptVehPerHr >= 12) { risk += 0.04; notes.push("Moderate PT corridor"); }

    if (BAYSIDE_SUBURBS.has(suburb)) {
      const distToBeachM = 300;
      const distToStationM = 250;
      const nearRetailStrip = true;
      const distToSchoolM = 180;
      const inPermitZone = true;

      if (distToBeachM <= 400) { risk += 0.10; notes.push("Near foreshore (parking churn)"); }
      if (distToStationM <= 300) { risk += 0.10; notes.push("Near railway station (commuter parking)"); }
      if (nearRetailStrip) { risk += 0.06; notes.push("Adjacent to retail strip (short-stay turnover)"); }
      if (distToSchoolM <= 250) { risk += 0.12; notes.push("Near school (pickup/dropoff peaks)"); }
      if (inPermitZone) { risk += 0.06; notes.push("Resident permit area nearby"); }
    }

    risk = clamp01(risk);
    notes.unshift("Bayside rules applied: " + String(BAYSIDE_SUBURBS.has(suburb)));
    return NextResponse.json({ risk, notes });
  } catch (e) {
    return NextResponse.json({ error: "Risk service failed" }, { status: 500 });
  }
}
