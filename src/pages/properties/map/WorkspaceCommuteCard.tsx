import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Navigation, Car, Bike, Loader2, Search, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotonFeature {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
    properties: {
        osm_id: number;
        name?: string;
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        type?: string;
        postcode?: string;
    };
}

interface PhotonResponse {
    features: PhotonFeature[];
}

interface PlaceOption {
    id: number;
    name: string;
    subtitle: string;
    lat: number;
    lng: number;
}

interface CommuteResult {
    drivingDistance: string;
    drivingDuration: string;
    cyclingDuration: string;
}

interface WorkspaceCommuteCardProps {
    propertyLat: number;
    propertyLng: number;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hrs} hr ${remaining} min` : `${hrs} hr`;
}

/** Build a readable subtitle from Photon properties */
function buildSubtitle(p: PhotonFeature["properties"]): string {
    const parts: string[] = [];
    if (p.street) parts.push(p.street);
    if (p.city && p.city !== p.name) parts.push(p.city);
    if (p.state && p.state !== p.city) parts.push(p.state);
    return parts.join(", ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceCommuteCard({ propertyLat, propertyLng }: WorkspaceCommuteCardProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<PlaceOption[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
    const [commuteResult, setCommuteResult] = useState<CommuteResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reset all state when the property changes
    useEffect(() => {
        setQuery("");
        setSuggestions([]);
        setSelectedPlace(null);
        setCommuteResult(null);
        setCalcError(null);
        setShowSuggestions(false);
    }, [propertyLat, propertyLng]);

    // ── Photon geocoding search ────────────────────────────────────────────────
    // Photon uses fuzzy/prefix matching and accepts lat/lon to bias results
    // towards a location — far superior to Nominatim for local searches.

    const searchPlaces = useCallback(async (q: string) => {
        const trimmed = q.trim();
        if (trimmed.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        setIsSearching(true);
        try {
            // Bias results towards the property location (prioritises nearby results)
            const url =
                `https://photon.komoot.io/api/` +
                `?q=${encodeURIComponent(trimmed)}` +
                `&limit=7` +
                `&lang=en` +
                // location bias — pulls results near this coordinate to the top
                `&lat=${propertyLat}&lon=${propertyLng}` +
                // loose country filter (not strict, avoids missing results)
                `&bbox=68.0,20.0,90.0,35.0`; // India bounding box

            const resp = await fetch(url);
            if (!resp.ok) throw new Error("search failed");
            const data: PhotonResponse = await resp.json();

            const places: PlaceOption[] = data.features
                .filter((f) => f.properties.name)
                .map((f) => ({
                    id: f.properties.osm_id,
                    name: f.properties.name ?? "Unknown",
                    subtitle: buildSubtitle(f.properties),
                    lat: f.geometry.coordinates[1],
                    lng: f.geometry.coordinates[0],
                }));

            setSuggestions(places);
            setShowSuggestions(places.length > 0);
        } catch {
            setSuggestions([]);
        } finally {
            setIsSearching(false);
        }
    }, [propertyLat, propertyLng]);

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setQuery(val);
        if (selectedPlace) {
            setSelectedPlace(null);
            setCommuteResult(null);
            setCalcError(null);
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchPlaces(val), 350);
    }

    // ── Place selection + OSRM dual routing ──────────────────────────────────

    async function handleSelectPlace(place: PlaceOption) {
        setQuery(place.name);
        setSelectedPlace(place);
        setShowSuggestions(false);
        setSuggestions([]);
        setCalcError(null);
        setCommuteResult(null);
        setIsCalculating(true);

        try {
            // OSRM expects coordinates in {lng},{lat} order
            const coords = `${propertyLng},${propertyLat};${place.lng},${place.lat}`;

            const [drivingResp, cyclingResp] = await Promise.all([
                fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`),
                fetch(`https://router.project-osrm.org/route/v1/cycling/${coords}?overview=false`),
            ]);

            const [drivingData, cyclingData] = await Promise.all([
                drivingResp.json(),
                cyclingResp.json(),
            ]);

            if (!drivingData.routes?.[0]) throw new Error("No driving route found");
            if (!cyclingData.routes?.[0]) throw new Error("No cycling route found");

            setCommuteResult({
                drivingDistance: formatDistance(drivingData.routes[0].distance),
                drivingDuration: formatDuration(drivingData.routes[0].duration),
                cyclingDuration: formatDuration(cyclingData.routes[0].duration),
            });
        } catch {
            setCalcError("Could not calculate route. Try a different location.");
        } finally {
            setIsCalculating(false);
        }
    }

    function handleReset() {
        setQuery("");
        setSuggestions([]);
        setSelectedPlace(null);
        setCommuteResult(null);
        setCalcError(null);
        setShowSuggestions(false);
        setTimeout(() => inputRef.current?.focus(), 50);
    }

    // Google Maps directions URL — no API key needed
    const mapsDirectionsUrl = selectedPlace
        ? `https://www.google.com/maps/dir/?api=1` +
          `&origin=${propertyLat},${propertyLng}` +
          `&destination=${selectedPlace.lat},${selectedPlace.lng}` +
          `&travelmode=driving`
        : null;

    // Fallback: open Google Maps Directions from property → typed workspace name
    // Google Maps will geocode the destination text itself — no API key needed.
    const googleDirectionsUrl = query.trim()
        ? `https://www.google.com/maps/dir/?api=1` +
          `&origin=${propertyLat},${propertyLng}` +
          `&destination=${encodeURIComponent(query.trim())}` +
          `&travelmode=driving`
        : null;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            ref={containerRef}
            className="mx-6 mb-4 rounded-xl border border-border bg-card shadow-sm overflow-visible"
        >
            {/* Card header */}
            <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-2">
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Commute to Workspace
                    </p>
                </div>
                {(selectedPlace || query) && (
                    <button
                        onClick={handleReset}
                        className="p-1 rounded-md hover:bg-accent transition-colors"
                        title="Clear"
                    >
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                    </button>
                )}
            </div>

            <div className="p-4 space-y-3">
                {/* Search input */}
                <div className="relative">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            placeholder="Start typing your workspace..."
                            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all placeholder:text-muted-foreground"
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-3 h-3.5 w-3.5 text-muted-foreground animate-spin" />
                        )}
                    </div>

                    {/* Suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 right-0 rounded-lg border border-border bg-popover shadow-xl z-[9999] overflow-hidden">
                            {suggestions.map((s, i) => (
                                <button
                                    key={`${s.id}-${i}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectPlace(s);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-start gap-2.5 ${
                                        i < suggestions.length - 1 ? "border-b border-border/50" : ""
                                    }`}
                                >
                                    <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium leading-snug truncate">{s.name}</p>
                                        {s.subtitle && (
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {s.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}

                            {/* "Can't find it? Get directions via Google Maps" fallback */}
                            {googleDirectionsUrl && (
                                <a
                                    href={googleDirectionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:bg-accent transition-colors border-t border-border/50"
                                >
                                    <Navigation className="h-3 w-3 flex-shrink-0" />
                                    Can't find it? Get directions to "<span className="font-medium text-foreground truncate max-w-[140px]">{query.trim()}</span>" on Google Maps
                                </a>
                            )}
                        </div>
                    )}

                    {/* No results found state */}
                    {showSuggestions && suggestions.length === 0 && !isSearching && query.trim().length >= 2 && googleDirectionsUrl && (
                        <div className="absolute top-full mt-1 left-0 right-0 rounded-lg border border-border bg-popover shadow-xl z-[9999] overflow-hidden">
                            <div className="px-3 py-2.5 text-xs text-muted-foreground">
                                No results found locally.
                            </div>
                            <a
                                href={googleDirectionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-primary hover:bg-accent transition-colors border-t border-border/50 font-medium"
                            >
                                <Navigation className="h-3 w-3 flex-shrink-0" />
                                Get directions to "{query.trim()}" on Google Maps →
                            </a>
                        </div>
                    )}
                </div>

                {/* Calculating spinner */}
                {isCalculating && (
                    <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Calculating commute times…</span>
                    </div>
                )}

                {/* Error state */}
                {calcError && !isCalculating && (
                    <p className="text-xs text-destructive">{calcError}</p>
                )}

                {/* Commute result */}
                {commuteResult && !isCalculating && (
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                            Distance:{" "}
                            <span className="text-foreground font-semibold">
                                {commuteResult.drivingDistance}
                            </span>
                        </p>
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950/40">
                                    <Car className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground leading-none">By car</p>
                                    <p className="text-sm font-bold leading-tight">
                                        {commuteResult.drivingDuration}
                                    </p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-border" />
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100 dark:bg-green-950/40">
                                    <Bike className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground leading-none">By bike</p>
                                    <p className="text-sm font-bold leading-tight">
                                        {commuteResult.cyclingDuration}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Get Directions button */}
                {mapsDirectionsUrl && commuteResult && !isCalculating && (
                    <a
                        href={mapsDirectionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
                    >
                        <Navigation className="h-4 w-4" />
                        Get Directions on Google Maps
                    </a>
                )}
            </div>
        </div>
    );
}
