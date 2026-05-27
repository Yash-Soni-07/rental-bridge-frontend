import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api")
    .replace(/\/api$/, ""); // normalize: remove trailing /api if present

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ViewportBounds {
    lat_min: number;
    lat_max: number;
    lng_min: number;
    lng_max: number;
}

export interface MapPin {
    id: number;
    latitude: number;
    longitude: number;
    name: string;
    bhk_type: number | null;
    property_type: string;
    listing_purpose: "rent" | "sale" | "both";
    est_monthly_rent: string | null;
    price_in_cr: string | null;
    locality: string | null;
}

export interface ListingDetail {
    id: number;
    name: string;
    property_title: string | null;
    description: string | null;
    locality: string | null;
    city: string;
    property_type: string;
    listing_purpose: string;
    bhk_type: number | null;
    area_sqft_raw: number | null;
    area_type: string | null;
    area_sqft_super: number | null;
    price_in_cr: string | null;
    price_in_inr: string | null;
    rate_per_sqft: string | null;
    rate_per_sqft_super: string | null;
    est_monthly_rent_min: string | null;
    est_monthly_rent: string | null;
    est_monthly_rent_max: string | null;
    rent_per_sqft: string | null;
    latitude: number | null;
    longitude: number | null;
    source: string;
    is_verified: boolean;
}

export interface MapFilters {
    showRent: boolean;
    showSale: boolean;
    bhk: number[];         // [] means all BHK
    rentMin: number;
    rentMax: number;
    priceMin: number;      // Crores
    priceMax: number;      // Crores
    locality: string;
    ward: string;          // AMC ward name — when set, fetches all pins for this ward (no viewport)
    viewport: ViewportBounds | null; // null = no bounding box (initial state)
}

const DEFAULT_FILTERS: MapFilters = {
    showRent: true,
    showSale: true,
    bhk: [],
    rentMin: 0,
    rentMax: 150000,
    priceMin: 0,
    priceMax: 20,
    locality: "",
    ward: "",
    viewport: null, // will be set by the map on first render
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMapListings(options: { suspended?: boolean } = {}) {
    const { suspended = false } = options;
    const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
    const [pins, setPins] = useState<MapPin[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounce timer — prevents API spam on continuous pan/zoom
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchPins = useCallback(async (f: MapFilters) => {
        // Ward mode: fetch all pins for a specific ward (no viewport filter).
        // Viewport mode: require viewport before fetching (avoids full 17k load on mount).
        const isWardMode = Boolean(f.ward.trim());
        if (!isWardMode && !f.viewport) return;

        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();

            if (isWardMode) {
                // ── Ward mode: fetch ALL pins for this ward ──────────────────
                params.set("ward", f.ward.trim().toUpperCase());
            } else {
                // ── Viewport mode: bounding-box based ────────────────────────
                params.set("lat_min", String(f.viewport!.lat_min));
                params.set("lat_max", String(f.viewport!.lat_max));
                params.set("lng_min", String(f.viewport!.lng_min));
                params.set("lng_max", String(f.viewport!.lng_max));
            }
            // ── Listing purpose ──────────────────────────────────────────
            if (f.showRent && !f.showSale) {
                params.set("purpose", "rent,both");
            } else if (!f.showRent && f.showSale) {
                params.set("purpose", "sale,both");
            }

            // ── BHK ──────────────────────────────────────────────────────
            if (f.bhk.length > 0) {
                params.set("bhk", f.bhk.join(","));
            }

            // ── Rent range ───────────────────────────────────────────────
            if (f.showRent || (!f.showRent && !f.showSale)) {
                if (f.rentMin > 0)       params.set("rent_min", String(f.rentMin));
                if (f.rentMax < 150000)  params.set("rent_max", String(f.rentMax));
            }

            // ── Price range ──────────────────────────────────────────────
            if (f.showSale || (!f.showRent && !f.showSale)) {
                if (f.priceMin > 0)      params.set("price_min", String(f.priceMin));
                if (f.priceMax < 20)     params.set("price_max", String(f.priceMax));
            }

            // ── Locality search ──────────────────────────────────────────
            if (f.locality.trim()) {
                params.set("locality", f.locality.trim());
            }

            const url = `${API_BASE}/api/map/pins?${params.toString()}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`API error ${resp.status}`);
            const data: MapPin[] = await resp.json();
            setPins(data);
        } catch (err: any) {
            setError(err.message ?? "Failed to load map pins");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Re-fetch on filter / viewport change, debounced 350ms.
    // When suspended (locality cluster view active), clear pins and skip fetching.
    useEffect(() => {
        if (suspended) {
            setPins([]);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchPins(filters);
        }, 350);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [filters, fetchPins, suspended]);

    const updateFilter = useCallback(<K extends keyof MapFilters>(
        key: K,
        value: MapFilters[K]
    ) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    // Called by PropertyMapView whenever the user pans or zooms
    const updateViewport = useCallback((bounds: ViewportBounds) => {
        setFilters((prev) => {
            // Skip update if bounds haven't meaningfully changed (avoids re-renders)
            const vp = prev.viewport;
            if (
                vp &&
                Math.abs(vp.lat_min - bounds.lat_min) < 0.001 &&
                Math.abs(vp.lat_max - bounds.lat_max) < 0.001 &&
                Math.abs(vp.lng_min - bounds.lng_min) < 0.001 &&
                Math.abs(vp.lng_max - bounds.lng_max) < 0.001
            ) {
                return prev; // no meaningful change, skip
            }
            return { ...prev, viewport: bounds };
        });
    }, []);

    const resetFilters = useCallback(() => {
        // Keep viewport when resetting filters — don't re-center the map
        setFilters((prev) => ({ ...DEFAULT_FILTERS, viewport: prev.viewport }));
    }, []);

    return {
        pins,
        isLoading,
        error,
        filters,
        updateFilter,
        updateViewport,
        resetFilters,
        totalCount: pins.length,
    };
}

// ─── Listing detail fetch (called lazily on pin click) ────────────────────────

export async function fetchListingDetail(id: number): Promise<ListingDetail> {
    const resp = await fetch(`${API_BASE}/api/map/listing/${id}`);
    if (!resp.ok) throw new Error(`Failed to fetch listing ${id}`);
    return resp.json();
}
