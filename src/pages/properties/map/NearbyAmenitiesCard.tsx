import { useState, useEffect, useRef } from "react";
import { MapPin, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

// ─── Category definitions ─────────────────────────────────────────────────────

interface Category {
    id: string;
    label: string;
    emoji: string;
    color: string;
}

const CATEGORIES: Category[] = [
    { id: "all",      label: "All",       emoji: "🗺️",  color: "#6366f1" },
    { id: "food",     label: "Food",      emoji: "🍽️",  color: "#ef4444" },
    { id: "cafe",     label: "Cafe",      emoji: "☕",   color: "#d97706" },
    { id: "gym",      label: "Gym",       emoji: "💪",   color: "#8b5cf6" },
    { id: "health",   label: "Health",    emoji: "🏥",   color: "#ec4899" },
    { id: "transit",  label: "Transit",   emoji: "🚌",   color: "#0ea5e9" },
    { id: "pharmacy", label: "Pharmacy",  emoji: "💊",   color: "#10b981" },
    { id: "bank",     label: "ATM/Bank",  emoji: "🏦",   color: "#f59e0b" },
    { id: "market",   label: "Market",    emoji: "🛒",   color: "#06b6d4" },
    { id: "park",     label: "Park",      emoji: "🌳",   color: "#22c55e" },
];

const RADIUS_LIST = [500, 1000, 2000] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AmenityPlace {
    id: number;
    name: string;
    categoryId: string;
    distance: number; // metres
    lat: number;
    lng: number;
}

interface OverpassEl {
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
}

interface NearbyAmenitiesCardProps {
    propertyLat: number;
    propertyLng: number;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m: number): string {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function distClass(m: number): string {
    if (m < 500)  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    if (m < 1000) return "bg-yellow-100  text-yellow-700  dark:bg-yellow-950/40  dark:text-yellow-400";
    return "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400";
}

function detectCat(tags: Record<string, string>): string {
    const a = tags.amenity  ?? "";
    const l = tags.leisure  ?? "";
    const h = tags.highway  ?? "";
    const r = tags.railway  ?? "";
    const s = tags.shop     ?? "";
    if (["restaurant","fast_food","food_court","biergarten"].includes(a)) return "food";
    if (a === "cafe")                                                       return "cafe";
    if (a === "gym" || l === "fitness_centre")                              return "gym";
    if (["hospital","clinic","doctors"].includes(a))                        return "health";
    if (a === "pharmacy")                                                   return "pharmacy";
    if (["atm","bank"].includes(a))                                         return "bank";
    if (h === "bus_stop" || ["station","subway_entrance","tram_stop","halt"].includes(r)) return "transit";
    if (["supermarket","convenience","grocery"].includes(s))                return "market";
    if (["park","garden"].includes(l))                                      return "park";
    return "";
}

function buildQuery(lat: number, lng: number, radius: number): string {
    const c = `${lat},${lng}`;
    return `[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|food_court|biergarten|cafe|hospital|clinic|doctors|pharmacy|atm|bank|gym)$"](around:${radius},${c});
  nwr["leisure"~"^(fitness_centre|park|garden)$"](around:${radius},${c});
  nwr["highway"="bus_stop"](around:${radius},${c});
  nwr["railway"~"^(station|subway_entrance|tram_stop|halt)$"](around:${radius},${c});
  nwr["shop"~"^(supermarket|convenience|grocery)$"](around:${radius},${c});
);
out center tags;`;
}

const ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
];

async function loadPlaces(lat: number, lng: number, radius: number): Promise<AmenityPlace[]> {
    const query = buildQuery(lat, lng, radius);
    let lastErr: Error = new Error("All endpoints failed");

    for (const ep of ENDPOINTS) {
        try {
            const res = await fetch(ep, {
                method:  "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body:    `data=${encodeURIComponent(query)}`,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: { elements: OverpassEl[] } = await res.json();

            const seen = new Set<number>();
            const out: AmenityPlace[] = [];

            for (const el of json.elements) {
                if (seen.has(el.id)) continue;
                seen.add(el.id);
                const tags = el.tags ?? {};
                const name = (tags["name"] || tags["name:en"] || "").trim();
                if (!name) continue;
                const elLat = el.lat ?? el.center?.lat;
                const elLng = el.lon ?? el.center?.lon;
                if (!elLat || !elLng) continue;
                const cat = detectCat(tags);
                if (!cat) continue;
                out.push({
                    id: el.id,
                    name,
                    categoryId: cat,
                    distance: haversine(lat, lng, elLat, elLng),
                    lat: elLat,
                    lng: elLng,
                });
            }

            return out.sort((a, b) => a.distance - b.distance);
        } catch (e) {
            lastErr = e as Error;
        }
    }
    throw lastErr;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SHOW_LIMIT = 6;

export function NearbyAmenitiesCard({ propertyLat, propertyLng }: NearbyAmenitiesCardProps) {
    const [radius,    setRadius]    = useState<number>(1000);
    const [customRadiusText, setCustomRadiusText] = useState("");
    const [activeCat, setActiveCat] = useState("all");
    const [places,    setPlaces]    = useState<AmenityPlace[]>([]);
    const [loading,   setLoading]   = useState(true);   // true from start → skeleton shows immediately
    const [error,     setError]     = useState<string | null>(null);
    const [expanded,  setExpanded]  = useState(false);

    const mountedRef = useRef(true);

    async function fetch_places(r: number) {
        setLoading(true);
        setError(null);
        setExpanded(false);
        try {
            const data = await loadPlaces(propertyLat, propertyLng, r);
            if (mountedRef.current) setPlaces(data);
        } catch {
            if (mountedRef.current) setError("Could not load nearby places. Please try again.");
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }

    // Fetch on mount + when property changes
    useEffect(() => {
        mountedRef.current = true;
        setPlaces([]);
        setActiveCat("all");
        setRadius(1000);
        setExpanded(false);
        fetch_places(1000);
        return () => { mountedRef.current = false; };
    }, [propertyLat, propertyLng]); // eslint-disable-line react-hooks/exhaustive-deps

    function changeRadius(r: number) {
        if (r <= 0 || r > 10000) return; // sane limits
        setRadius(r);
        setActiveCat("all");
        fetch_places(r);
    }

    function handleCustomRadiusSubmit(e: React.FormEvent) {
        e.preventDefault();
        const r = parseInt(customRadiusText);
        if (!isNaN(r)) {
            changeRadius(r);
        }
    }

    function refresh() {
        fetch_places(radius);
    }

    // Counts per category
    const counts: Record<string, number> = { all: places.length };
    for (const p of places) counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;

    // Filtered + sliced
    const filtered = activeCat === "all" ? places : places.filter((p) => p.categoryId === activeCat);
    const visible  = expanded ? filtered : filtered.slice(0, SHOW_LIMIT);
    const hasMore  = filtered.length > SHOW_LIMIT;

    function getCat(id: string): Category {
        return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
    }

    // ── Render ─────────────────────────────────────────────────────────────────────

    return (
        <div className="mx-6 mb-4 rounded-xl border border-border bg-card shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Nearby Places
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {RADIUS_LIST.map((r) => {
                        const isSelected = radius === r && !customRadiusText;
                        return (
                            <button
                                key={r}
                                onClick={() => {
                                    setCustomRadiusText("");
                                    changeRadius(r);
                                }}
                                disabled={loading}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all disabled:opacity-40 ${
                                    isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-accent"
                                }`}
                            >
                                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                            </button>
                        );
                    })}
                    
                    {/* Custom radius input */}
                    <form onSubmit={handleCustomRadiusSubmit} className="flex items-center gap-1">
                        <input
                            type="number"
                            min="100"
                            max="10000"
                            value={customRadiusText}
                            onChange={(e) => setCustomRadiusText(e.target.value)}
                            placeholder="m"
                            disabled={loading}
                            className={`w-11 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-center border focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40 ${
                                customRadiusText && radius === parseInt(customRadiusText)
                                    ? "bg-primary text-primary-foreground border-primary placeholder:text-primary-foreground/50"
                                    : "bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-foreground placeholder:text-muted-foreground/60"
                            }`}
                            style={{ MozAppearance: 'textfield' }} // hides arrows in firefox
                        />
                    </form>
                    
                    <button
                        onClick={refresh}
                        disabled={loading}
                        title="Refresh"
                        className="ml-1 p-1 rounded-md hover:bg-accent transition-colors disabled:opacity-40"
                    >
                        <RefreshCw className={`h-3 w-3 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Category chips */}
            <div className="flex gap-1.5 px-3 py-2.5 border-b overflow-x-auto pb-3">
                {CATEGORIES.map((cat) => {
                    const count   = counts[cat.id] ?? 0;
                    const isActive = activeCat === cat.id;
                    // Hide empty categories (except "All")
                    if (cat.id !== "all" && !loading && count === 0) return null;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => { setActiveCat(cat.id); setExpanded(false); }}
                            style={isActive ? { borderColor: cat.color, color: cat.color, backgroundColor: `${cat.color}12` } : undefined}
                            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
                                isActive
                                    ? "border-current"
                                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                        >
                            <span>{cat.emoji}</span>
                            <span>{cat.label}</span>
                            {!loading && count > 0 && (
                                <span
                                    className="ml-0.5 px-1.5 rounded-full text-[9px] font-bold leading-4"
                                    style={isActive
                                        ? { background: cat.color, color: "#fff" }
                                        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Body */}
            <div className="px-3 py-2.5">

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3 px-1 py-1.5">
                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                                    <div className="h-2.5 w-1/2 bg-muted animate-pulse rounded" />
                                </div>
                                <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="py-5 flex flex-col items-center gap-2 text-center">
                        <p className="text-2xl">⚠️</p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                        <button onClick={refresh} className="text-xs text-primary hover:underline">
                            Try again
                        </button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && filtered.length === 0 && (
                    <div className="py-5 flex flex-col items-center gap-1.5 text-center">
                        <p className="text-2xl">{activeCat === "all" ? "🏜️" : getCat(activeCat).emoji}</p>
                        <p className="text-xs text-muted-foreground">
                            No {activeCat === "all" ? "places" : getCat(activeCat).label.toLowerCase()} within{" "}
                            {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
                        </p>
                        {radius < 2000 && (
                            <button
                                onClick={() => changeRadius(radius === 500 ? 1000 : 2000)}
                                className="text-xs text-primary hover:underline"
                            >
                                Try wider radius
                            </button>
                        )}
                    </div>
                )}

                {/* Results */}
                {!loading && !error && visible.length > 0 && (
                    <div className="space-y-0.5">
                        {visible.map((place) => {
                            const cat = getCat(place.categoryId);
                            return (
                                <a
                                    key={place.id}
                                    href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-1.5 py-2 rounded-lg hover:bg-accent transition-colors group"
                                >
                                    {/* Icon circle */}
                                    <div
                                        className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm"
                                        style={{ background: `${cat.color}18`, border: `1.5px solid ${cat.color}35` }}
                                    >
                                        {cat.emoji}
                                    </div>

                                    {/* Name + type */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate leading-tight group-hover:text-primary transition-colors">
                                            {place.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                                            {cat.label}
                                        </p>
                                    </div>

                                    {/* Distance badge */}
                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${distClass(place.distance)}`}>
                                        {fmtDist(place.distance)}
                                    </span>
                                </a>
                            );
                        })}

                        {/* Expand / collapse */}
                        {hasMore && (
                            <button
                                onClick={() => setExpanded((e) => !e)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                            >
                                {expanded ? (
                                    <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                                ) : (
                                    <><ChevronDown className="h-3.5 w-3.5" /> {filtered.length - SHOW_LIMIT} more nearby</>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Attribution */}
            {!loading && places.length > 0 && (
                <div className="px-4 py-1.5 border-t bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">
                        Data &copy;{" "}
                        <a
                            href="https://www.openstreetmap.org/copyright"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground"
                        >
                            OpenStreetMap
                        </a>{" "}
                        contributors
                    </p>
                </div>
            )}
        </div>
    );
}
