/**
 * useWardMap.ts
 *
 * Loads the AMC ward GeoJSON once on init (from local static file — never fetched from GitHub).
 * Provides:
 *   - ZONES config (7 zones, each with zone color + list of ward names aligned to GeoJSON)
 *   - normalize(s) — strips numeric prefix, hyphen→space, uppercase
 *   - getWardFeature(wardName) — find GeoJSON feature by canonical ward name
 *   - getFeatureBounds(feature) — bounding box [[minLat,minLng],[maxLat,maxLng]]
 *   - getWardCentroid(wardName) — [lat, lng] centroid from polygon bbox
 *   - getZoneCentroid(zone) — [lat, lng] center of all zone's wards
 *   - getZoneBounds(zone) — combined bbox of all wards in the zone
 *   - wardReady — true once GeoJSON is fully loaded
 */
import { useState, useEffect, useCallback } from "react";
import type { MapPin } from "./useMapListings";

// ─── Re-export MapPin so ward files don't need a separate import ──────────────
export type { MapPin };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WardCount {
    ward: string;    // canonical ward name (uppercase, from DB / normalize())
    count: number;
}

// ─── Zone configuration ───────────────────────────────────────────────────────
// Ward names MUST match the GeoJSON feature names after normalize().
// Verified against: datameet/Municipal_Spatial_Data/master/Ahmedabad/Wards.geojson

export const ZONES = [
    {
        id: "CENTRAL" as const,
        name: "Central",
        color: "#ef4444",
        wards: ["SHAHPUR", "DARIYAPUR", "JAMALPUR", "KHADIA", "ASARWA", "SHAHIBAG"],
    },
    {
        id: "EAST" as const,
        name: "East",
        color: "#f97316",
        wards: ["GOMTIPUR", "ODHAV", "VASTRAL", "BHAIPURA HATKESHWAR", "AMRAIWADI", "RAMOL HATHIJAN", "NIKOL", "VIRATNAGAR"],
    },
    {
        id: "NORTH" as const,
        name: "North",
        color: "#eab308",
        wards: ["BAPUNAGAR", "INDIA COLONY", "THAKKARBAPANAGAR", "SARASPUR RAKHIYAL", "SARDARNAGAR", "NARODA", "KUBERNAGR", "SAIJPUR BOGHA"],
    },
    {
        id: "NORTH_WEST" as const,
        name: "North West",
        color: "#22c55e",
        wards: ["GOTA", "CHANDLODIA", "GHATLODIA", "THALTEJ", "BODAKDEV"],
    },
    {
        id: "SOUTH" as const,
        name: "South",
        color: "#6366f1",
        wards: ["BAHERAMPURA", "INDRAPURI", "KHOKHRA", "MANINAGAR", "DANILIMDA", "LAMBHA", "ISANPUR", "VATVA"],
    },
    {
        id: "SOUTH_WEST" as const,
        name: "South West",
        color: "#a855f7",
        wards: ["SARKHEJ", "JODHPUR", "VEJALPUR", "MAKTAMPURA"],
    },
    {
        id: "WEST" as const,
        name: "West",
        color: "#06b6d4",
        wards: ["RANIP", "CHANDKHEDA", "SABARMATI", "NARANPURA", "NEW WADAJ", "S.P.STADIUM", "NAVRANGPURA", "PALDI", "VASNA"],
    },
] as const;

export type ZoneId = typeof ZONES[number]["id"];
export type Zone = typeof ZONES[number];

// ─── Normalize ward name ──────────────────────────────────────────────────────
// Strips numeric prefix, converts hyphens to spaces, uppercases.
// "27 SARASPUR-RAKHIYAL" → "SARASPUR RAKHIYAL"
// "08 THALTEJ"           → "THALTEJ"

export function normalize(s: string): string {
    return s
        .toUpperCase()
        .replace(/^\d+\s*/, "")      // strip leading digits + space
        .replace(/-/g, " ")           // hyphen → space
        .replace(/\s+/g, " ")         // normalize whitespace
        .trim();
}

// ─── Lookup: ward name → zone ─────────────────────────────────────────────────

export function getZoneForWard(wardName: string): Zone | null {
    const upper = wardName.toUpperCase();
    return (ZONES.find((z) => z.wards.includes(upper as any)) ?? null) as Zone | null;
}

export function getZoneColor(wardName: string): string {
    return getZoneForWard(wardName)?.color ?? "#94a3b8";
}

// ─── GeoJSON geometry helpers ─────────────────────────────────────────────────

export function getFeatureBounds(
    feature: GeoJSON.Feature
): [[number, number], [number, number]] | null {
    const geom = feature.geometry;
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    function processRing(ring: GeoJSON.Position[]) {
        for (const [lng, lat] of ring) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
        }
    }

    if (geom.type === "Polygon") {
        processRing(geom.coordinates[0]);
    } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) processRing(poly[0]);
    } else {
        return null;
    }

    if (!isFinite(minLat)) return null;
    return [[minLat, minLng], [maxLat, maxLng]];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWardMap() {
    const [features, setFeatures] = useState<GeoJSON.Feature[]>([]);
    const [wardReady, setWardReady] = useState(false);

    // Load GeoJSON once on mount — from local static file (Vite serves /public as root)
    useEffect(() => {
        fetch("/data/amc_wards.geojson")
            .then((r) => {
                if (!r.ok) throw new Error(`Failed to load ward GeoJSON: ${r.status}`);
                return r.json() as Promise<GeoJSON.FeatureCollection>;
            })
            .then((fc) => {
                setFeatures(fc.features);
                setWardReady(true);
            })
            .catch((e) => console.error("Ward GeoJSON load error:", e));
    }, []);

    /** Find the GeoJSON Feature for a ward by canonical name (uses normalize() matching). */
    const getWardFeature = useCallback(
        (wardName: string): GeoJSON.Feature | null => {
            const target = normalize(wardName);
            return (
                features.find(
                    (f) => normalize(String(f.properties?.Name ?? "")) === target
                ) ?? null
            );
        },
        [features]
    );

    /** Bounding box [[minLat, minLng], [maxLat, maxLng]] for a ward. */
    const getWardBounds = useCallback(
        (wardName: string): [[number, number], [number, number]] | null => {
            const feat = getWardFeature(wardName);
            return feat ? getFeatureBounds(feat) : null;
        },
        [getWardFeature]
    );

    /** Geographic centroid [lat, lng] of a ward (bbox midpoint). */
    const getWardCentroid = useCallback(
        (wardName: string): [number, number] | null => {
            const b = getWardBounds(wardName);
            if (!b) return null;
            return [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];
        },
        [getWardBounds]
    );

    /** Combined bounding box for all wards in a zone. */
    const getZoneBounds = useCallback(
        (zone: Zone): [[number, number], [number, number]] | null => {
            let minLat = Infinity, maxLat = -Infinity;
            let minLng = Infinity, maxLng = -Infinity;
            for (const wardName of zone.wards) {
                const b = getWardBounds(wardName);
                if (!b) continue;
                if (b[0][0] < minLat) minLat = b[0][0];
                if (b[0][1] < minLng) minLng = b[0][1];
                if (b[1][0] > maxLat) maxLat = b[1][0];
                if (b[1][1] > maxLng) maxLng = b[1][1];
            }
            return isFinite(minLat) ? [[minLat, minLng], [maxLat, maxLng]] : null;
        },
        [getWardBounds]
    );

    /** Geographic centroid [lat, lng] of a zone (center of combined bbox). */
    const getZoneCentroid = useCallback(
        (zone: Zone): [number, number] | null => {
            const b = getZoneBounds(zone);
            if (!b) return null;
            return [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];
        },
        [getZoneBounds]
    );

    return {
        wardReady,
        getWardFeature,
        getWardBounds,
        getWardCentroid,
        getZoneBounds,
        getZoneCentroid,
    };
}
