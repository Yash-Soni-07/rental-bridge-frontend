import { useEffect, useState, useMemo, useCallback, useRef, type MutableRefObject } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Tooltip,
    GeoJSON,
    useMap,
    useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { MapPin, ViewportBounds } from "./useMapListings";
import { hexToRgba } from "./useLocalityClusters";
import { ZONES, useWardMap, type Zone, type WardCount } from "./useWardMap";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const AHMEDABAD_CENTER: [number, number] = [23.0225, 72.5714];
const DEFAULT_ZOOM = 11;

/** Level 0 (Ahmedabad city) -> Level 1 (zones): zoom threshold */
const CITY_ZOOM_THRESHOLD = 11;
/** Level 1 (zones) → Level 2 (wards): zoom threshold */
const ZONE_ZOOM_THRESHOLD = 12;
/** Level 2 (wards) → Level 3 (pins): zoom threshold */
export const WARD_ZOOM_THRESHOLD = 14;

// CartoDB tiles — no API key required
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const PIN_COLORS = { both: "#6366f1", rent: "#10b981", sale: "#f59e0b" } as const;

// ─── useDarkMode ──────────────────────────────────────────────────────────────

function useDarkMode(): boolean {
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains("dark")
    );
    useEffect(() => {
        const obs = new MutationObserver(() =>
            setIsDark(document.documentElement.classList.contains("dark"))
        );
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);
    return isDark;
}

// ─── Icon factories ───────────────────────────────────────────────────────────

/**
 * Level 0 — City marker: large circular brand marker representing Ahmedabad.
 * Dynamically scales down (shrinks) as the map is zoomed out below 11.
 */
function makeCityIcon(totalCount: number, currentZoom: number): L.DivIcon {
    const baseZoom = 11;
    // Shrink size by 14px per zoom level below 11, down to a minimum of 18px
    const size = Math.max(18, 68 - Math.max(0, baseZoom - currentZoom) * 14);

    const color = "#6366f1"; // Brand indigo
    const bg = hexToRgba(color, 0.76);
    const border = hexToRgba(color, 0.95);
    const shadow = hexToRgba(color, 0.42);
    const countStr = totalCount > 999 ? `${(totalCount / 1000).toFixed(1)}k` : String(totalCount);

    let innerHtml = "";
    if (size >= 50) {
        // Show both "Ahmedabad" and listing count
        const nameFontSize = size >= 60 ? "10px" : "8px";
        const countFontSize = size >= 60 ? "9.5px" : "8.5px";
        innerHtml = `
            <span style="color:white;font-size:${nameFontSize};font-weight:800;
                font-family:system-ui,-apple-system,sans-serif;
                text-shadow:0 1.5px 3px rgba(0,0,0,0.5);
                line-height:1.2;text-align:center;padding:0 4px;
                text-transform:uppercase;letter-spacing:0.03em;
            ">Ahmedabad</span>
            <span style="color:white;font-size:${countFontSize};font-weight:700;opacity:0.92;
                font-family:system-ui,-apple-system,sans-serif;
                text-shadow:0 1px 2px rgba(0,0,0,0.4);
            ">${countStr}</span>
        `;
    } else if (size >= 30) {
        // Show only listing count
        const countFontSize = size >= 40 ? "9px" : "8px";
        innerHtml = `
            <span style="color:white;font-size:${countFontSize};font-weight:700;
                font-family:system-ui,-apple-system,sans-serif;
                text-shadow:0 1px 2px rgba(0,0,0,0.4);
            ">${countStr}</span>
        `;
    } else {
        // Too small: show solid dot indicator
        innerHtml = "";
    }

    const borderWidth = size >= 50 ? 3 : size >= 30 ? 2 : 1.5;

    return L.divIcon({
        html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${bg};
            backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
            border:${borderWidth}px solid ${border};
            box-shadow:0 6px 20px ${shadow},0 1.5px 6px rgba(0,0,0,0.22);
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            cursor:pointer;
        ">${innerHtml}</div>`,
        className: "",
        iconSize: L.point(size, size),
        iconAnchor: L.point(size / 2, size / 2),
    });
}

/**
 * Level 1 — Zone marker: large semi-transparent colored circle.
 * Transparent so map labels behind remain readable.
 */
function makeZoneIcon(zone: Zone, totalCount: number): L.DivIcon {
    const size = 58;
    const bg = hexToRgba(zone.color, 0.72);
    const border = hexToRgba(zone.color, 0.90);
    const shadow = hexToRgba(zone.color, 0.38);
    const countStr = totalCount > 999 ? `${(totalCount / 1000).toFixed(1)}k` : String(totalCount);
    return L.divIcon({
        html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${bg};
            backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
            border:2.5px solid ${border};
            box-shadow:0 4px 14px ${shadow},0 1px 4px rgba(0,0,0,0.18);
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            cursor:pointer;
        ">
            <span style="color:white;font-size:9.5px;font-weight:700;
                font-family:system-ui,-apple-system,sans-serif;
                text-shadow:0 1px 2px rgba(0,0,0,0.45);
                line-height:1.2;text-align:center;padding:0 4px;
            ">${zone.name}</span>
            <span style="color:white;font-size:9px;font-weight:600;opacity:0.88;
                font-family:system-ui,-apple-system,sans-serif;
                text-shadow:0 1px 2px rgba(0,0,0,0.4);
            ">${countStr}</span>
        </div>`,
        className: "",
        iconSize: L.point(size, size),
        iconAnchor: L.point(size / 2, size / 2),
    });
}

/**
 * Level 2 — Ward marker: semi-transparent colored pill.
 * Same style as former locality pills.
 */
function makeWardIcon(wardName: string, count: number, color: string): L.DivIcon {
    const display = wardName.length > 16 ? wardName.slice(0, 15) + "…" : wardName;
    const bg     = hexToRgba(color, 0.72);
    const border = hexToRgba(color, 0.88);
    const shadow = hexToRgba(color, 0.40);
    const w = Math.max(90, Math.min(display.length, 16) * 6.5 + 54);
    const h = 28;
    const countStr = count > 999 ? `${(count / 1000).toFixed(1)}k` : String(count);
    return L.divIcon({
        html: `<div style="
            display:inline-flex;align-items:center;gap:5px;
            background:${bg};
            backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
            border:1.5px solid ${border};border-radius:20px;
            padding:4px 8px 4px 10px;
            box-shadow:0 2px 8px ${shadow},0 1px 3px rgba(0,0,0,0.18);
            cursor:pointer;white-space:nowrap;
        ">
            <span style="color:white;font-size:11px;font-weight:600;
                font-family:system-ui,-apple-system,sans-serif;
                text-shadow:0 1px 2px rgba(0,0,0,0.35);letter-spacing:0.01em;
            ">${display}</span>
            <span style="background:rgba(255,255,255,0.22);color:white;font-size:10px;font-weight:700;
                padding:1px 6px;border-radius:10px;
                font-family:system-ui,-apple-system,sans-serif;
                text-shadow:0 1px 2px rgba(0,0,0,0.3);
            ">${countStr}</span>
        </div>`,
        className: "",
        iconSize: L.point(w, h),
        iconAnchor: L.point(w / 2, h / 2),
    });
}

/** Level 3 — Individual pin */
function makePinIcon(color: string, highlighted = false): L.DivIcon {
    const size = highlighted ? 16 : 11;
    const ring = highlighted
        ? `border:2.5px solid white;box-shadow:0 0 0 2.5px ${color}70,0 2px 8px rgba(0,0,0,0.35);`
        : `border:1.5px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.22);`;
    return L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};${ring}"></div>`,
        className: "",
        iconSize: L.point(size, size),
        iconAnchor: L.point(size / 2, size / 2),
    });
}

const PIN_ICONS = {
    both: makePinIcon(PIN_COLORS.both),
    rent: makePinIcon(PIN_COLORS.rent),
    sale: makePinIcon(PIN_COLORS.sale),
};

function makeClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
    const count = cluster.getChildCount();
    const size = count < 10 ? 34 : count < 100 ? 40 : 48;
    const fs   = count < 10 ? 12 : count < 100 ? 11 : 10;
    return L.divIcon({
        html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            border:2px solid rgba(255,255,255,0.88);
            box-shadow:0 3px 10px rgba(99,102,241,0.45),0 1px 3px rgba(0,0,0,0.2);
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:${fs}px;font-weight:700;
            font-family:system-ui,-apple-system,sans-serif;
        ">${count}</div>`,
        className: "",
        iconSize: L.point(size, size),
        iconAnchor: L.point(size / 2, size / 2),
    });
}

// ─── Sub-components (must live inside MapContainer) ───────────────────────────

function ZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
    const map = useMapEvents({ zoomend: () => onZoomChange(map.getZoom()) });
    useEffect(() => { onZoomChange(map.getZoom()); }, []); // eslint-disable-line
    return null;
}

function FlyToPin({ lat, lng }: { lat: number | null; lng: number | null }) {
    const map = useMap();
    useEffect(() => {
        if (lat !== null && lng !== null) {
            map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
        }
    }, [lat, lng, map]);
    return null;
}

interface FlyToBoundsReq { bounds: [[number, number], [number, number]]; seq: number; maxZoom?: number; }
function FlyToBounds({
    req,
    isAnimatingRef,
}: {
    req: FlyToBoundsReq | null;
    isAnimatingRef: MutableRefObject<boolean>;
}) {
    const map = useMap();
    // Mark animation done when map finishes moving
    useMapEvents({
        moveend: () => { isAnimatingRef.current = false; },
    });
    useEffect(() => {
        if (!req) return;
        isAnimatingRef.current = true;   // block zoom-transition logic during flight
        map.flyToBounds(req.bounds, {
            padding: [45, 45],
            maxZoom: req.maxZoom ?? WARD_ZOOM_THRESHOLD + 1,
            duration: 0.9,
        });
    }, [req?.seq, map]); // eslint-disable-line
    return null;
}

/**
 * Clears the active boundary on map background clicks.
 * Filters out clicks ON marker icons — otherwise the ward click that
 * triggers the boundary also immediately clears it via propagation.
 */
function MapClickClearer({ onClear }: { onClear: () => void }) {
    useMapEvents({
        click: (e) => {
            const target = e.originalEvent.target as HTMLElement;
            // Leaflet DivIcon markers render inside .leaflet-marker-icon
            if (target.closest(".leaflet-marker-icon") !== null) return;
            onClear();
        },
    });
    return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PropertyMapViewProps {
    // Level 3 pins (ward-filtered, from useMapListings)
    pins: MapPin[];
    isPinsLoading: boolean;
    highlightedPinId: number | null;
    flyToCoords: { lat: number; lng: number } | null;
    onPinClick: (pin: MapPin) => void;
    onViewportChange: (bounds: ViewportBounds) => void; // kept for compat — unused in 3-level system

    // Ward listing counts (from /api/map/ward-summary)
    wardCounts: WardCount[];

    // Callbacks
    onWardClick: (wardName: string) => void;  // "" to clear active ward
    onZoomChange: (zoom: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PropertyMapView({
    pins,
    isPinsLoading,
    highlightedPinId,
    flyToCoords,
    onPinClick,
    wardCounts,
    onWardClick,
    onZoomChange,
}: PropertyMapViewProps) {
    const isDark = useDarkMode();

    const {
        wardReady,
        getWardFeature,
        getWardBounds,
        getWardCentroid,
        getZoneBounds,
        getZoneCentroid,
    } = useWardMap();

    // ── State machine ──────────────────────────────────────────────────────────
    const [renderLevel, setRenderLevel] = useState<0 | 1 | 2 | 3>(() => {
        if (DEFAULT_ZOOM < CITY_ZOOM_THRESHOLD) return 0;
        if (DEFAULT_ZOOM < ZONE_ZOOM_THRESHOLD) return 1;
        if (DEFAULT_ZOOM < WARD_ZOOM_THRESHOLD) return 2;
        return 3;
    });
    const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);
    const [activeWardName, setActiveWardName] = useState<string | null>(null);
    const [activeBoundaryFeature, setActiveBoundaryFeature] = useState<GeoJSON.Feature | null>(null);
    const [flyReq, setFlyReq] = useState<FlyToBoundsReq | null>(null);
    const [isTransitionLoading, setIsTransitionLoading] = useState(false);

    // Ref to block zoom-transition logic while flyToBounds animation is in progress
    const isAnimatingRef = useRef(false);

    function flyTo(
        bounds: [[number, number], [number, number]],
        maxZoom?: number
    ) {
        setFlyReq((prev) => ({ bounds, seq: (prev?.seq ?? 0) + 1, maxZoom }));
    }

    // ── Zoom → level transitions ───────────────────────────────────────────────
    // IMPORTANT: onWardClick must be called OUTSIDE of any functional state
    // updater — calling a parent setState inside setRenderLevel(prev => {...})
    // violates React's "no setState during render" rule.
    function handleZoomChange(zoom: number) {
        setCurrentZoom(zoom);
        // Skip level transitions while flyToBounds / flyTo animation is in progress.
        // The fly animation temporarily passes through intermediate zoom values that
        // would otherwise incorrectly trigger a level reset.
        if (isAnimatingRef.current) return;

        if (zoom < CITY_ZOOM_THRESHOLD) {
            if (renderLevel !== 0) {
                setActiveWardName(null);
                setActiveBoundaryFeature(null);
                setRenderLevel(0);
                onWardClick("");      // parent setState — called AFTER child setters
            }
        } else if (zoom < ZONE_ZOOM_THRESHOLD) {
            if (renderLevel !== 1) {
                setActiveWardName(null);
                setActiveBoundaryFeature(null);
                setRenderLevel(1);
                onWardClick("");      // parent setState — called AFTER child setters
            }
        } else if (zoom < WARD_ZOOM_THRESHOLD && renderLevel === 3) {
            setActiveWardName(null);
            setActiveBoundaryFeature(null);
            setRenderLevel(2);
            onWardClick("");          // parent setState — called AFTER child setters
        }
        onZoomChange(zoom);
    }

    // ── City click (Level 0 → Level 1) ────────────────────────────────────────
    const handleCityClick = useCallback(() => {
        if (!wardReady) return;
        // Fly to Ahmedabad center with zoom level 12 (ZONE_ZOOM_THRESHOLD)
        setFlyReq((prev) => ({
            bounds: [
                [AHMEDABAD_CENTER[0] - 0.05, AHMEDABAD_CENTER[1] - 0.05],
                [AHMEDABAD_CENTER[0] + 0.05, AHMEDABAD_CENTER[1] + 0.05]
            ] as [[number, number], [number, number]],
            seq: (prev?.seq ?? 0) + 1,
            maxZoom: ZONE_ZOOM_THRESHOLD
        }));
        setRenderLevel(1);
    }, [wardReady]);

    // ── Zone click (Level 1 → Level 2) ────────────────────────────────────────
    const handleZoneClick = useCallback((zone: Zone) => {
        if (!wardReady) return;
        const bounds = getZoneBounds(zone);
        if (bounds) flyTo(bounds, ZONE_ZOOM_THRESHOLD + 1);
        setRenderLevel(2);
    }, [wardReady, getZoneBounds]);

    // ── Ward click (Level 2 → Level 3) ────────────────────────────────────────
    const handleWardClick = useCallback((wardName: string) => {
        if (!wardReady) return;
        setIsTransitionLoading(true);

        const bounds = getWardBounds(wardName);
        if (bounds) flyTo(bounds, WARD_ZOOM_THRESHOLD + 2);

        const feature = getWardFeature(wardName);
        setActiveBoundaryFeature(feature);
        setActiveWardName(wardName);
        setRenderLevel(3);
        onWardClick(wardName);

        // Brief loading indicator for pin fetch
        setTimeout(() => setIsTransitionLoading(false), 600);
    }, [wardReady, getWardBounds, getWardFeature, onWardClick]);

    // ── Clear boundary on map background click ────────────────────────────────
    function handleMapClear() {
        if (activeBoundaryFeature) {
            setActiveBoundaryFeature(null);
        }
    }

    // ── Highlighted pin icon ───────────────────────────────────────────────────
    const highlightedIcon = useMemo(() => {
        if (!highlightedPinId) return null;
        const pin = pins.find((p) => p.id === highlightedPinId);
        if (!pin) return null;
        return makePinIcon(PIN_COLORS[pin.listing_purpose] ?? PIN_COLORS.both, true);
    }, [highlightedPinId, pins]);

    // ── Status text ────────────────────────────────────────────────────────────
    const statusText = (() => {
        if (!wardReady) return "Loading map data…";
        if (renderLevel === 0) return "Ahmedabad city · click to explore zones";
        if (renderLevel === 1) return "7 zones · click a zone to explore";
        if (renderLevel === 2) return "48 wards · click a ward to see listings";
        if (renderLevel === 3 && activeWardName) {
            return isPinsLoading
                ? `Loading pins in ${activeWardName}…`
                : `${pins.length.toLocaleString("en-IN")} listings in ${activeWardName}`;
        }
        return "";
    })();

    const isLoading = isPinsLoading || isTransitionLoading;

    return (
        <div className="relative w-full h-full">
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/40 backdrop-blur-[2px] pointer-events-none">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background border rounded-full px-4 py-2 shadow-sm">
                        <span className="animate-spin inline-block h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        {renderLevel === 3 ? "Loading pins…" : "Zooming…"}
                    </div>
                </div>
            )}

            {/* Status + breadcrumb */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
                <div className="bg-background/90 backdrop-blur-sm border rounded-full px-3 py-1 text-xs font-medium shadow-sm pointer-events-none">
                    {statusText}
                </div>

                {/* Active ward badge — click to clear */}
                {activeWardName && (
                    <div
                        className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border rounded-full px-3 py-1 text-xs font-medium shadow-sm cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => {
                            setActiveWardName(null);
                            setActiveBoundaryFeature(null);
                            setRenderLevel(2);
                            onWardClick("");
                        }}
                    >
                        <span
                            className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                            style={{ background: ZONES.find((z) => z.wards.includes(activeWardName as any))?.color ?? "#94a3b8" }}
                        />
                        {activeWardName}
                        <span className="text-muted-foreground ml-0.5">✕</span>
                    </div>
                )}
            </div>

            <MapContainer
                center={AHMEDABAD_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ width: "100%", height: "100%" }}
                className="z-0 rounded-xl"
            >
                {/* CartoDB tiles — auto-switch with app theme */}
                <TileLayer
                    key={isDark ? "dark" : "light"}
                    url={isDark ? TILE_DARK : TILE_LIGHT}
                    attribution={ATTRIBUTION}
                />

                <ZoomTracker onZoomChange={handleZoomChange} />
                <MapClickClearer onClear={handleMapClear} />

                {flyToCoords && <FlyToPin lat={flyToCoords.lat} lng={flyToCoords.lng} />}
                <FlyToBounds req={flyReq} isAnimatingRef={isAnimatingRef} />

                {/* Ward boundary polygon — visible across all levels once a ward is selected */}
                {activeBoundaryFeature && (
                    <GeoJSON
                        key={activeWardName ?? "boundary"}
                        data={activeBoundaryFeature}
                        style={() => ({
                            color: ZONES.find((z) => z.wards.includes(activeWardName as any))?.color ?? "#FF3B30",
                            weight: 2.5,
                            opacity: 1,
                            dashArray: "6, 4",
                            fillColor: ZONES.find((z) => z.wards.includes(activeWardName as any))?.color ?? "#FF3B30",
                            fillOpacity: 0.08,
                            lineJoin: "round" as const,
                        })}
                    />
                )}

                {/* ── LEVEL 0: Single Ahmedabad city marker ── */}
                {wardReady && renderLevel === 0 && (() => {
                    const totalCount = wardCounts.reduce((sum, wc) => sum + wc.count, 0);
                    return (
                        <Marker
                            position={AHMEDABAD_CENTER}
                            icon={makeCityIcon(totalCount, currentZoom)}
                            eventHandlers={{ click: handleCityClick }}
                        >
                            <Tooltip direction="top" offset={[0, -38]} opacity={0.96}>
                                <span className="text-xs font-semibold">Ahmedabad City</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                    · {totalCount.toLocaleString("en-IN")} listings
                                </span>
                            </Tooltip>
                        </Marker>
                    );
                })()}

                {/* ── LEVEL 1: 7 zone markers ── */}
                {wardReady && renderLevel === 1 && ZONES.map((zone) => {
                    const centroid = getZoneCentroid(zone);
                    if (!centroid) return null;
                    const totalCount = wardCounts
                        .filter((wc) => (zone.wards as readonly string[]).includes(wc.ward))
                        .reduce((sum, wc) => sum + wc.count, 0);
                    return (
                        <Marker
                            key={zone.id}
                            position={centroid}
                            icon={makeZoneIcon(zone, totalCount)}
                            eventHandlers={{ click: () => handleZoneClick(zone) }}
                        >
                            <Tooltip direction="top" offset={[0, -32]} opacity={0.96}>
                                <span className="text-xs font-semibold">{zone.name} Zone</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                    · {totalCount.toLocaleString("en-IN")} listings
                                </span>
                            </Tooltip>
                        </Marker>
                    );
                })}

                {/* ── LEVEL 2: 48 ward markers ── */}
                {wardReady && renderLevel === 2 && ZONES.flatMap((zone) =>
                    zone.wards.map((wardName) => {
                        const centroid = getWardCentroid(wardName);
                        if (!centroid) return null;
                        const wc = wardCounts.find((w) => w.ward === wardName);
                        const count = wc?.count ?? 0;
                        return (
                            <Marker
                                key={wardName}
                                position={centroid}
                                icon={makeWardIcon(wardName, count, zone.color)}
                                eventHandlers={{ click: () => handleWardClick(wardName) }}
                            >
                                <Tooltip direction="top" offset={[0, -16]} opacity={0.96}>
                                    <span className="text-xs font-semibold">{wardName}</span>
                                    <span className="text-xs text-muted-foreground ml-1">
                                        · {count} listings
                                    </span>
                                </Tooltip>
                            </Marker>
                        );
                    })
                )}

                {/* ── LEVEL 3: Individual pins in active ward ── */}
                <MarkerClusterGroup
                    chunkedLoading
                    iconCreateFunction={makeClusterIcon}
                    showCoverageOnHover={false}
                    spiderfyOnMaxZoom
                    maxClusterRadius={50}
                    zoomToBoundsOnClick
                    animate
                >
                    {renderLevel === 3 && pins.map((pin) => {
                        const isHighlighted = pin.id === highlightedPinId;
                        const icon = isHighlighted && highlightedIcon
                            ? highlightedIcon
                            : (PIN_ICONS[pin.listing_purpose] ?? PIN_ICONS.both);
                        return (
                            <Marker
                                key={pin.id}
                                position={[pin.latitude, pin.longitude]}
                                icon={icon}
                                eventHandlers={{ click: () => onPinClick(pin) }}
                            >
                                <Tooltip direction="top" offset={[0, -6]} opacity={0.96}>
                                    <div className="text-xs font-medium leading-tight min-w-[130px]">
                                        <div className="font-semibold">{pin.name}</div>
                                        {pin.locality && pin.locality !== pin.name && (
                                            <div className="text-muted-foreground">{pin.locality}</div>
                                        )}
                                        {pin.bhk_type && (
                                            <div className="text-muted-foreground">{pin.bhk_type} BHK · {pin.property_type}</div>
                                        )}
                                        {pin.est_monthly_rent && (
                                            <div className="text-emerald-700 font-medium">
                                                ~₹{Math.round(parseFloat(pin.est_monthly_rent)).toLocaleString("en-IN")}/mo
                                            </div>
                                        )}
                                        {pin.price_in_cr && (
                                            <div className="text-amber-700">
                                                {parseFloat(pin.price_in_cr) >= 1
                                                    ? `₹${parseFloat(pin.price_in_cr).toFixed(2)} Cr`
                                                    : `₹${(parseFloat(pin.price_in_cr) * 100).toFixed(0)} L`}
                                            </div>
                                        )}
                                    </div>
                                </Tooltip>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 left-3 z-[1000] bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 text-xs shadow-sm pointer-events-none">
                {renderLevel < 3 ? (
                    <div className="text-muted-foreground italic">
                        {renderLevel === 0 && "Click Ahmedabad to see zones"}
                        {renderLevel === 1 && "Click a zone to see wards"}
                        {renderLevel === 2 && "Click a ward to see listings"}
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: PIN_COLORS.both }} /><span>Rent &amp; Sale</span></div>
                        <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: PIN_COLORS.rent }} /><span>Rent only</span></div>
                        <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: PIN_COLORS.sale }} /><span>Sale only</span></div>
                    </div>
                )}
            </div>
        </div>
    );
}
