'use client'
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

type Purpose = "own_occupy" | "invest";

interface Profile {
  purpose: Purpose;
  budgetMax: number;
  minBeds: number;
  suburbs: string[];
  targetYield?: number;
  targetGrowth?: number;
  weights: { fin: number; life: number; attr: number; growth: number; quiet: number };
  mustHaves: {
    propertyTypes: ("house" | "unit" | "townhouse")[];
    carSpaceMin: number;
  };
}

interface Listing {
  id: string;
  portal: "domain" | "rea" | "mock";
  url: string;
  address: string;
  suburb: string;
  price: number;
  beds: number;
  baths: number;
  cars: number;
  type: "house" | "unit" | "townhouse";
  landSize?: number;
  internalArea?: number;
  lat?: number;
  lon?: number;
  travelMinsToPOI?: number;
  bodyCorpPerYear?: number;
  rentEstimatePerWeek?: number;
  trafficParkingRisk?: number;
  riskNotes?: string[];
}

interface ScoredListing {
  listing: Listing;
  score: number;
  reasons: string[];
}

function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }

function travelPenalty(actualMins: number | undefined, targetMins: number) {
  if (actualMins == null) return 0.5;
  if (actualMins <= targetMins) return 1;
  const t = 1 - clamp01((actualMins - targetMins) / targetMins);
  return clamp01(t);
}

function softBudgetHeadroom(price: number, budgetMax: number) {
  if (price <= budgetMax) return 1;
  const over = price / budgetMax - 1;
  return clamp01(1 - over * 4);
}

function yieldScore(weeklyRent: number | undefined, price: number, targetYield: number | undefined) {
  if (!weeklyRent || !targetYield) return 0.5;
  const gross = (weeklyRent * 52) / price;
  if (gross >= targetYield) return 1;
  const gap = targetYield - gross;
  return clamp01(1 - (gap / 0.02));
}

function attrAreaScore(internalArea?: number, landSize?: number) {
  const ia = internalArea ? clamp01((internalArea - 90) / (150 - 90)) : 0.5;
  const land = landSize ? clamp01((landSize - 300) / (500 - 300)) : 0.5;
  return Math.max(ia, land);
}

// Growth heuristic
const SUBURB_GROWTH_TABLE: Record<string, { house: number; unit: number }> = {
  sandringham: { house: 0.038, unit: 0.032 },
  hampton: { house: 0.040, unit: 0.033 },
};
function projectedCAGR(suburb: string, type: Listing["type"]): number {
  const key = suburb.toLowerCase();
  const row = SUBURB_GROWTH_TABLE[key];
  if (!row) return 0.03;
  return type === "unit" ? row.unit : row.house;
}

// Mock data
const MOCK_LISTINGS: Listing[] = [
  {
    id: "MOCK-1",
    portal: "mock",
    url: "https://example.com/listing/1",
    address: "88 Sandringham Rd",
    suburb: "Sandringham",
    price: 1650000,
    beds: 3,
    baths: 2,
    cars: 2,
    type: "house",
    landSize: 460,
    internalArea: 155,
    travelMinsToPOI: undefined,
    rentEstimatePerWeek: 900,
    lat: -37.9529,
    lon: 145.0157,
  },
  {
    id: "MOCK-2",
    portal: "mock",
    url: "https://example.com/listing/2",
    address: "12 Bay Rd",
    suburb: "Sandringham",
    price: 1280000,
    beds: 2,
    baths: 1,
    cars: 1,
    type: "unit",
    internalArea: 85,
    travelMinsToPOI: undefined,
    bodyCorpPerYear: 3400,
    rentEstimatePerWeek: 700,
    lat: -37.9506,
    lon: 145.0130,
  },
  {
    id: "MOCK-3",
    portal: "mock",
    url: "https://example.com/listing/3",
    address: "4 Crisp St",
    suburb: "Hampton",
    price: 1780000,
    beds: 3,
    baths: 2,
    cars: 1,
    type: "townhouse",
    internalArea: 140,
    travelMinsToPOI: undefined,
    rentEstimatePerWeek: 980,
    lat: -37.9339,
    lon: 145.0055,
  },
];

async function mockSearch(): Promise<Listing[]> {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_LISTINGS), 200));
}

export default function Page() {
  const [profile, setProfile] = useState<Profile>({
    purpose: "own_occupy",
    budgetMax: 1600000,
    minBeds: 3,
    suburbs: ["Sandringham","Hampton"],
    targetYield: 0.045,
    targetGrowth: 0.035,
    weights: { fin: 0.33, life: 0.27, attr: 0.22, growth: 0.10, quiet: 0.08 },
    mustHaves: { propertyTypes: ["house","townhouse","unit"], carSpaceMin: 1 }
  });
  const [showNearMisses, setShowNearMisses] = useState(true);
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const [poiOrigin, setPoiOrigin] = useState<string>("Flinders Street Station, Melbourne");
  const [travelMode, setTravelMode] = useState<"driving"|"transit"|"walking">("driving");

  const scored = useMemo(() => {
    return listings
      .map(L => scoreListing(profile, L, showNearMisses))
      .sort((a, b) => b.score - a.score);
  }, [listings, profile, showNearMisses]);

  function update<K extends keyof Profile>(key: K, val: Profile[K]) {
    setProfile(p => ({ ...p, [key]: val }));
  }

  async function runSearch() {
    const data = await mockSearch();
    setListings(data);
    await computeTravelTimes(data);
    await computeTrafficRisk(data);
  }

  async function computeTravelTimes(items: Listing[] = listings) {
    if (!poiOrigin) return;
    const updated: Listing[] = [];
    for (const L of items) {
      if (L.lat == null || L.lon == null) { updated.push(L); continue; }
      try {
        const q = new URLSearchParams({ origin: poiOrigin, destination: `${L.lat},${L.lon}`, mode: travelMode });
        const res = await fetch(`/api/distance?${q.toString()}`);
        if (!res.ok) throw new Error("distance route error");
        const json = await res.json(); // { minutes: number }
        updated.push({ ...L, travelMinsToPOI: json.minutes ?? L.travelMinsToPOI });
      } catch (e) {
        updated.push({ ...L, travelMinsToPOI: L.travelMinsToPOI ?? 25 });
      }
    }
    setListings(updated);
  }

  async function computeTrafficRisk(items: Listing[] = listings) {
    const updated: Listing[] = [];
    for (const L of items) {
      if (L.lat == null || L.lon == null) { updated.push(L); continue; }
      try {
        const q = new URLSearchParams({ lat: String(L.lat), lon: String(L.lon), suburb: L.suburb });
        const res = await fetch(`/api/risk?${q.toString()}`);
        if (!res.ok) throw new Error("risk route error");
        const json = await res.json(); // { risk, notes }
        updated.push({ ...L, trafficParkingRisk: json.risk, riskNotes: json.notes });
      } catch (e) {
        const fallback = 0.35;
        updated.push({ ...L, trafficParkingRisk: L.trafficParkingRisk ?? fallback, riskNotes: L.riskNotes ?? ["Heuristic default"] });
      }
    }
    setListings(updated);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Buyer Strategy Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Purpose</Label>
              <Tabs value={profile.purpose} onValueChange={(v)=>update("purpose", v as Purpose)}>
                <TabsList>
                  <TabsTrigger value="own_occupy" active={profile.purpose==="own_occupy"} onClick={()=>update("purpose","own_occupy")}>Own-Occupy</TabsTrigger>
                  <TabsTrigger value="invest" active={profile.purpose==="invest"} onClick={()=>update("purpose","invest")}>Invest</TabsTrigger>
                </TabsList>
                <TabsContent />
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget max ($)</Label>
                <Input type="number" value={profile.budgetMax}
                  onChange={e=>update("budgetMax", Number(e.target.value))} />
              </div>
              <div>
                <Label>Min beds</Label>
                <Input type="number" value={profile.minBeds}
                  onChange={e=>update("minBeds", Number(e.target.value))} />
              </div>
            </div>

            {profile.purpose === "invest" && (
              <div>
                <Label>Target gross yield (%)</Label>
                <div className="flex items-center gap-3">
                  <Slider defaultValue={[Math.round((profile.targetYield ?? 0.045) * 100)]}
                    max={10} step={0.1}
                    onChange={(v)=>update("targetYield", (v[0] ?? 4.5)/100)} />
                  <Badge>{Math.round((profile.targetYield ?? 0.045)*1000)/10}%</Badge>
                </div>
              </div>
            )}

            <div>
              <Label>Target 5-year capital growth (%)</Label>
              <div className="flex items-center gap-3">
                <Slider defaultValue={[Math.round((profile.targetGrowth ?? 0.035) * 100)]}
                  max={10} step={0.1}
                  onChange={(v)=>update("targetGrowth", (v[0] ?? 3.5)/100)} />
                <Badge>{Math.round((profile.targetGrowth ?? 0.035)*1000)/10}%</Badge>
              </div>
            </div>

            <div>
              <Label>Preferred suburbs (comma-separated)</Label>
              <Input
                value={profile.suburbs.join(", ")}
                onChange={(e)=>update("suburbs", e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}
                placeholder="e.g., Sandringham, Hampton"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Commute origin (address or landmark)</Label>
                <Input value={poiOrigin} onChange={(e)=>setPoiOrigin(e.target.value)} placeholder="e.g., 1 Collins St, Melbourne"/>
              </div>
              <div>
                <Label>Travel mode</Label>
                <select
                  className="input"
                  value={travelMode}
                  onChange={(e)=>setTravelMode(e.target.value as any)}
                >
                  <option value="driving">Driving</option>
                  <option value="transit">Transit</option>
                  <option value="walking">Walking</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Weights</Label>
              <div className="text-xs text-slate-500 mb-2">Financial / Lifestyle / Attributes / Growth / Quiet</div>
              <div className="grid grid-cols-5 gap-2">
                <Input type="number" value={profile.weights.fin} onChange={e=>update("weights", { ...profile.weights, fin: Number(e.target.value)})} />
                <Input type="number" value={profile.weights.life} onChange={e=>update("weights", { ...profile.weights, life: Number(e.target.value)})} />
                <Input type="number" value={profile.weights.attr} onChange={e=>update("weights", { ...profile.weights, attr: Number(e.target.value)})} />
                <Input type="number" value={profile.weights.growth} onChange={e=>update("weights", { ...profile.weights, growth: Number(e.target.value)})} />
                <Input type="number" value={profile.weights.quiet} onChange={e=>update("weights", { ...profile.weights, quiet: Number(e.target.value)})} />
              </div>
              <div className="text-xs text-slate-500 mt-1">Should roughly sum to 1.0</div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={showNearMisses} onChange={(c)=>setShowNearMisses(Boolean(c))} />
              <span className="text-sm">Show near-misses (slightly over budget or -1 bed)</span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={runSearch}>Search Listings</Button>
              <Button variant="outline" onClick={()=>computeTravelTimes()}>Update travel times</Button>
              <Button variant="outline" onClick={()=>computeTrafficRisk()}>Update traffic risk</Button>
            </div>

            <div className="pt-4">
              <div className="text-sm text-amber-700">Demo data only</div>
              <p className="text-xs text-slate-500 mt-1">Wire /api/listings to Domain/PropTrack and replace mockSearch(). Add Google Distance Matrix for commute times, and real OSM/VicRoads/PTV data for risk.</p>
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Matches</h2>
            <div className="text-sm text-slate-500">{scored.filter(s=>!hidden[s.listing.id]).length} results</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scored.filter(s=>!hidden[s.listing.id]).map(({ listing, score, reasons }) => (
              <Card key={listing.id} className="hover:shadow-md transition">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold">
                      {listing.address}, {listing.suburb}
                    </CardTitle>
                    <button className="btn btn-outline" onClick={()=>setHidden(h=>({ ...h, [listing.id]: true }))}>Hide</button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                    <Badge>${new Intl.NumberFormat().format(listing.price)}</Badge>
                    <span>{listing.beds} bed · {listing.baths} bath · {listing.cars} car</span>
                    <span className="ml-auto">{score}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {reasons.slice(0, 4).map((r,i)=> (
                      <Badge key={i}>{r}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <Badge>Growth 5y: {(projectedCAGR(listing.suburb, listing.type)*100).toFixed(1)}%</Badge>
                    {typeof listing.trafficParkingRisk === 'number' && (
                      <Badge variant={listing.trafficParkingRisk > 0.66 ? 'destructive' : listing.trafficParkingRisk > 0.33 ? 'secondary' : 'outline'}>
                        Traffic/Parking: {listing.trafficParkingRisk > 0.66 ? 'High' : listing.trafficParkingRisk > 0.33 ? 'Med' : 'Low'}
                      </Badge>
                    )}
                    <Badge>Commute: {listing.travelMinsToPOI != null ? `${listing.travelMinsToPOI} min` : "N/A"}</Badge>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <a className="btn btn-primary" target="_blank" href={listing.url}>View listing</a>
                    <button
                      className={"btn " + (saved[listing.id] ? "btn-outline" : "btn-outline")}
                      onClick={()=>setSaved(s=>({ ...s, [listing.id]: !s[listing.id] }))}
                    >
                      {saved[listing.id] ? "Saved" : "Save"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {scored.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-slate-500">No results yet. Try widening your suburbs or budget.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Scoring
function scoreListing(profile: Profile, L: Listing, showNearMisses = true): ScoredListing {
  const reasons: string[] = [];

  const gate = (
    L.price <= profile.budgetMax || showNearMisses
  ) && (
    L.beds >= profile.minBeds || (showNearMisses && L.beds === profile.minBeds - 1)
  ) && profile.mustHaves.propertyTypes.includes(L.type) && (
    L.cars >= profile.mustHaves.carSpaceMin
  ) && (
    profile.suburbs.length === 0 || profile.suburbs.map(s=>s.toLowerCase().trim()).includes(L.suburb.toLowerCase())
  );

  if (!gate && !showNearMisses) return { listing: L, score: 0, reasons: ["Failed must-haves"] };

  if (L.price <= profile.budgetMax) reasons.push("Within budget"); else reasons.push("Over budget (near-miss allowed)");
  if (L.beds >= profile.minBeds) reasons.push(`≥ ${profile.minBeds} beds`); else reasons.push("Bed count near-miss");
  if (L.cars >= profile.mustHaves.carSpaceMin) reasons.push(`≥ ${profile.mustHaves.carSpaceMin} car space(s)`);

  const finBudget = softBudgetHeadroom(L.price, profile.budgetMax);
  const finYield = profile.purpose === "invest" ? yieldScore(L.rentEstimatePerWeek, L.price, profile.targetYield) : 0.5;
  const outgoingsPenalty = L.bodyCorpPerYear ? clamp01(1 - (L.bodyCorpPerYear / 5000)) : 0.8;
  const finSub = clamp01(0.5 * finBudget + 0.35 * finYield + 0.15 * outgoingsPenalty);

  const lifeTravel = travelPenalty(L.travelMinsToPOI, 30);
  const lifeSub = lifeTravel;

  const attrSub = attrAreaScore(L.internalArea, L.landSize);

  const projCAGR = projectedCAGR(L.suburb, L.type);
  const targetCAGR = profile.targetGrowth ?? 0.03;
  const growthSub = (() => {
    if (projCAGR >= targetCAGR) return 1;
    const gap = targetCAGR - projCAGR;
    return clamp01(1 - gap / 0.02);
  })();

  const risk = L.trafficParkingRisk ?? 0.5;
  const quietSub = clamp01(1 - risk);

  const composite =
    profile.weights.fin * finSub +
    profile.weights.life * lifeSub +
    profile.weights.attr * attrSub +
    profile.weights.growth * growthSub +
    profile.weights.quiet * quietSub;

  const score = Math.round(100 * clamp01(composite));

  if (finBudget >= 0.95) reasons.push("Strong budget fit");
  if (finYield >= 0.95 && profile.purpose === "invest") reasons.push("Meets target yield");
  if (lifeTravel >= 0.95) reasons.push("Great travel time to POI");
  if (attrSub >= 0.8) reasons.push("Spacious relative to target");
  if (growthSub >= 0.95) reasons.push("Meets growth target");
  if (quietSub >= 0.9) reasons.push("Quiet street profile");

  return { listing: L, score, reasons };
}
