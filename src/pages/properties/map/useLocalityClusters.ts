/**
 * useLocalityClusters.ts
 * Manages:
 *   1. Fetching locality summary (one time on mount)
 *   2. Deterministic color per locality (hash-based)
 *   3. Boundary polygon fetching — Nominatim first, convex hull fallback
 *   4. In-memory boundary cache (no repeated API calls per session)
 */
import { useState, useEffect, useRef } from "react";
import type { MapPin } from "./useMapListings";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api")
    .replace(/\/api$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocalityGroup {
    locality: string;
    count: number;
    centroid_lat: number;
    centroid_lng: number;
    color: string; // deterministic per locality
}

export interface LocalityBoundary {
    locality: string;
    geojson: GeoJSON.Geometry;        // Polygon or MultiPolygon
    color: string;                    // matches the cluster color
    source: "nominatim" | "convex-hull" | "bbox";
}

// ─── Color palette ────────────────────────────────────────────────────────────
// 12 distinct, carefully chosen colors that look good on both
// CartoDB Voyager (light) and Dark Matter (dark) tile backgrounds.

const PALETTE = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow-amber
    "#22c55e", // green
    "#06b6d4", // cyan
    "#6366f1", // indigo
    "#a855f7", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f59e0b", // amber
    "#3b82f6", // blue
    "#84cc16", // lime
];

/**
 * Deterministic color from locality name.
 * Same locality always gets the same color across renders and sessions.
 */
export function getLocalityColor(locality: string): string {
    let hash = 0;
    for (let i = 0; i < locality.length; i++) {
        hash = (Math.imul(31, hash) + locality.charCodeAt(i)) | 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Convert hex color (#rrggbb) to rgba(r,g,b,a) string.
 */
export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Geometry utilities ───────────────────────────────────────────────────────

/**
 * Andrew's monotone chain — O(n log n) convex hull.
 * Input: [longitude, latitude] pairs (GeoJSON coordinate order).
 */
function convexHull(pts: [number, number][]): [number, number][] {
    if (pts.length < 3) return pts;
    const points = [...pts].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
    const n = points.length;

    function cross(o: [number, number], a: [number, number], b: [number, number]): number {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }

    const lower: [number, number][] = [];
    for (const p of points) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper: [number, number][] = [];
    for (let i = n - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    lower.pop();
    upper.pop();
    return [...lower, ...upper];
}

function pinsToConvexHullPolygon(pins: MapPin[]): GeoJSON.Polygon | null {
    if (pins.length < 3) return null;
    const coords: [number, number][] = pins.map((p) => [p.longitude, p.latitude]);
    const hull = convexHull(coords);
    if (hull.length < 3) return null;
    return {
        type: "Polygon",
        coordinates: [[...hull, hull[0]]], // close the ring
    };
}

function pinsToBBoxPolygon(pins: MapPin[]): GeoJSON.Polygon {
    const lngs = pins.map((p) => p.longitude);
    const lats = pins.map((p) => p.latitude);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    // Small padding so the border doesn't clip the outermost pins
    const padLat = Math.max((maxLat - minLat) * 0.06, 0.003);
    const padLng = Math.max((maxLng - minLng) * 0.06, 0.003);
    return {
        type: "Polygon",
        coordinates: [[
            [minLng - padLng, minLat - padLat],
            [maxLng + padLng, minLat - padLat],
            [maxLng + padLng, maxLat + padLat],
            [minLng - padLng, maxLat + padLat],
            [minLng - padLng, minLat - padLat],
        ]],
    };
}

// ─── Utility: fetch all pins for a specific locality ─────────────────────────

export async function fetchLocalityPins(locality: string): Promise<MapPin[]> {
    const url = `${API_BASE}/api/map/pins?locality=${encodeURIComponent(locality)}&limit=3000`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch pins for ${locality}`);
    return resp.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocalityClusters() {
    const [groups, setGroups] = useState<LocalityGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Boundary cache — Map<locality, LocalityBoundary>
    // useRef so it persists across renders without triggering re-renders
    const boundaryCache = useRef<Map<string, LocalityBoundary>>(new Map());

    // Fetch locality summary once on mount
    useEffect(() => {
        setIsLoading(true);
        fetch(`${API_BASE}/api/map/locality-summary`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data: Array<{ locality: string; count: number; centroid_lat: number; centroid_lng: number }>) => {
                setGroups(
                    data.map((g) => ({
                        ...g,
                        color: getLocalityColor(g.locality),
                    }))
                );
            })
            .catch((e) => console.error("Locality summary fetch failed:", e))
            .finally(() => setIsLoading(false));
    }, []);

    /**
     * Fetch (and cache) the boundary polygon for a locality.
     * Strategy:
     *   1. Nominatim polygon_geojson  → if OSM has a boundary relation
     *   2. Convex hull of pins         → accurate to actual listing spread
     *   3. Bounding box of pins        → final fallback
     */
    async function fetchBoundary(locality: string, pins: MapPin[]): Promise<LocalityBoundary> {
        const color = getLocalityColor(locality);

        // Return cached result immediately
        const cached = boundaryCache.current.get(locality);
        if (cached) return cached;

        let result: LocalityBoundary;

        try {
            // Nominatim rate limit: 1 req/sec anonymous. We only call this on click
            // and cache the result — safe for any realistic usage pattern.
            const nominatimUrl =
                `https://nominatim.openstreetmap.org/search` +
                `?q=${encodeURIComponent(locality + ",Ahmedabad,India")}` +
                `&format=json&polygon_geojson=1&limit=1`;

            const resp = await fetch(nominatimUrl, {
                headers: { "Accept-Language": "en" },
            });
            const data = await resp.json();

            const geojson = data?.[0]?.geojson;
            if (geojson && (geojson.type === "Polygon" || geojson.type === "MultiPolygon")) {
                result = { locality, geojson, color, source: "nominatim" };
            } else {
                throw new Error("No polygon from Nominatim");
            }
        } catch {
            // Convex hull from actual pin positions
            const hull = pinsToConvexHullPolygon(pins);
            if (hull) {
                result = { locality, geojson: hull, color, source: "convex-hull" };
            } else {
                result = { locality, geojson: pinsToBBoxPolygon(pins), color, source: "bbox" };
            }
        }

        boundaryCache.current.set(locality, result);
        return result;
    }

    return { groups, isLoading, fetchBoundary };
}
