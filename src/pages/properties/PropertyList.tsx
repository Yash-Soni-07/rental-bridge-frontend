import { useState, useCallback, useEffect } from "react";
import { useList, useGo } from "@refinedev/core";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { PropertyImage } from "@/components/PropertyImage";
import { PropertyFilterBar } from "./map/PropertyFilterBar";
import { PropertyMapView } from "./map/PropertyMapView";
import { ListingDetailSheet } from "./map/ListingDetailSheet";
import { useMapListings, type MapPin } from "./map/useMapListings";
import { getZoneColor, type WardCount } from "./map/useWardMap";

// ─── API base ─────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api")
    .replace(/\/api$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
    id: number;
    title: string;
    description: string | null;
    address: string;
    bedrooms: number;
    bathrooms: number;
    area_sqft: number;
    monthly_rent: number;
    latitude?: number | null;
    longitude?: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PropertyList = () => {
    const go = useGo();

    // ── Active ward (set when user clicks a ward marker) ──────────────────────
    const [activeWard, setActiveWard] = useState<string | null>(null);

    // ── Ward summary counts from /api/map/ward-summary ────────────────────────
    const [wardCounts, setWardCounts] = useState<WardCount[]>([]);
    useEffect(() => {
        fetch(`${API_BASE}/api/map/ward-summary`)
            .then((r) => r.json())
            .then((data: Array<{ ward: string; count: number; centroid_lat: number; centroid_lng: number }>) => {
                setWardCounts(data.map((w) => ({ ward: w.ward, count: w.count })));
            })
            .catch((e) => console.error("Ward summary fetch failed:", e));
    }, []);

    // ── Individual pin loading (only in Level 3 — ward selected) ─────────────
    const {
        pins,
        isLoading: pinsLoading,
        filters,
        updateFilter,
        resetFilters,
        totalCount,
    } = useMapListings({ suspended: !activeWard });

    // ── Property cards (all rentals from `properties` table) ─────────────────
    const { result, query } = useList<Property>({ resource: "properties" });
    const { isLoading: cardsLoading, isError, error } = query;
    const allProperties = result?.data ?? [];

    // Client-side filter: match properties whose address contains the active ward
    const properties = activeWard
        ? allProperties.filter((p) =>
            p.address?.toUpperCase().includes(activeWard)
        )
        : allProperties;

    // ── Map interaction state ─────────────────────────────────────────────────
    const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
    const [highlightedPinId, setHighlightedPinId] = useState<number | null>(null);
    const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number } | null>(null);

    function handlePinClick(pin: MapPin) {
        setSelectedPin(pin);
        setFlyToCoords(null);
    }

    function handleCardClick(property: Property) {
        if (property.latitude && property.longitude) {
            setFlyToCoords({ lat: property.latitude, lng: property.longitude });
        }
        go({ to: `/properties/${property.id}`, type: "push" });
    }

    // Called by PropertyMapView when a ward is clicked or cleared
    const handleWardClick = useCallback((wardName: string) => {
        const name = wardName.trim();
        if (name) {
            setActiveWard(name.toUpperCase());
            updateFilter("ward", name.toUpperCase());
        } else {
            setActiveWard(null);
            updateFilter("ward", "");
        }
    }, [updateFilter]);

    function handleReset() {
        resetFilters();
        setActiveWard(null);
    }

    // Zone color for the active ward badge
    const activeWardColor = activeWard ? getZoneColor(activeWard) : undefined;

    return (
        <div className="flex flex-col h-screen overflow-hidden p-4 gap-3 bg-background">

            {/* ── Filter bar ── */}
            <div className="flex-shrink-0 rounded-xl border bg-card shadow-sm">
                <PropertyFilterBar
                    filters={filters}
                    totalCount={totalCount}
                    isLoading={pinsLoading}
                    onFilterChange={updateFilter}
                    onReset={handleReset}
                />
            </div>

            {/* ── Map + Property cards ── */}
            <div className="flex-1 min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden">
                <PanelGroup
                    direction="horizontal"
                    className="h-full"
                    autoSaveId="property-list-split"
                >
                    {/* Map panel */}
                    <Panel defaultSize={50} minSize={25} maxSize={75} className="relative">
                        <PropertyMapView
                            pins={pins}
                            isPinsLoading={pinsLoading}
                            highlightedPinId={highlightedPinId}
                            flyToCoords={flyToCoords}
                            onPinClick={handlePinClick}
                            onViewportChange={() => {}} // viewport loading replaced by ward-based loading
                            wardCounts={wardCounts}
                            onWardClick={handleWardClick}
                            onZoomChange={() => {}}  // zoom level handled internally by map
                        />
                    </Panel>

                    {/* Resize handle */}
                    <PanelResizeHandle className="w-1.5 relative flex items-center justify-center bg-border hover:bg-primary/30 active:bg-primary/50 transition-colors duration-150 cursor-col-resize group">
                        <div className="absolute flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <span className="h-1 w-1 rounded-full bg-primary/80" />
                            <span className="h-1 w-1 rounded-full bg-primary/80" />
                            <span className="h-1 w-1 rounded-full bg-primary/80" />
                        </div>
                    </PanelResizeHandle>

                    {/* Property cards panel */}
                    <Panel defaultSize={50} minSize={25} maxSize={75} className="overflow-y-auto">
                        <div className="p-4">
                            {/* Panel header */}
                            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold">Properties</h1>
                                    {activeWard && (
                                        <Badge
                                            variant="secondary"
                                            className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10 transition-colors"
                                            style={{ borderColor: activeWardColor, color: activeWardColor }}
                                            onClick={() => {
                                                setActiveWard(null);
                                                updateFilter("ward", "");
                                            }}
                                        >
                                            {activeWard}
                                            <X className="h-3 w-3 ml-0.5" />
                                        </Badge>
                                    )}
                                </div>
                                {!cardsLoading && (
                                    <span className="text-xs text-muted-foreground">
                                        {properties.length} rental{properties.length !== 1 ? "s" : ""}
                                        {activeWard ? ` in ${activeWard}` : " listed"}
                                    </span>
                                )}
                            </div>

                            {/* Loading skeletons */}
                            {cardsLoading && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {[...Array(4)].map((_, i) => (
                                        <Card key={i}>
                                            <Skeleton className="h-36 w-full rounded-t-xl" />
                                            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                                            <CardContent>
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-2/3" />
                                            </CardContent>
                                            <CardFooter><Skeleton className="h-9 w-full" /></CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Error */}
                            {isError && (
                                <div className="text-sm text-destructive">
                                    Failed to load: {error?.message ?? "Something went wrong"}
                                </div>
                            )}

                            {/* Empty state */}
                            {!cardsLoading && !isError && properties.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                                    <p className="text-sm">
                                        {activeWard
                                            ? `No verified rentals in ${activeWard} ward yet.`
                                            : "No rental properties listed yet."}
                                    </p>
                                    {activeWard && (
                                        <Button
                                            variant="link" size="sm" className="mt-1 text-xs"
                                            onClick={() => setActiveWard(null)}
                                        >
                                            Show all properties
                                        </Button>
                                    )}
                                    <p className="text-xs mt-2">Browse the map to explore all listings.</p>
                                </div>
                            )}

                            {/* Property cards */}
                            {!cardsLoading && !isError && properties.length > 0 && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {properties.map((property) => (
                                        <Card
                                            key={property.id}
                                            className="flex flex-col hover:shadow-lg transition-all duration-200 overflow-hidden border-none shadow-sm cursor-pointer"
                                            onMouseEnter={() => setHighlightedPinId(property.id)}
                                            onMouseLeave={() => setHighlightedPinId(null)}
                                        >
                                            <PropertyImage propertyId={property.id} />
                                            <CardHeader>
                                                <CardTitle className="line-clamp-1 text-base">
                                                    {property.title}
                                                </CardTitle>
                                                <div className="text-xl font-bold text-primary">
                                                    ₹{property.monthly_rent}/month
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <p className="text-muted-foreground line-clamp-2 mb-2 text-xs">
                                                    {property.description || "No description available"}
                                                </p>
                                                <div className="text-xs text-muted-foreground mb-2">
                                                    {property.address}
                                                </div>
                                                <div className="flex gap-2 mt-2 text-xs font-medium text-muted-foreground flex-wrap">
                                                    <span className="bg-secondary px-2 py-0.5 rounded">{property.bedrooms} BHK</span>
                                                    <span className="bg-secondary px-2 py-0.5 rounded">{property.bathrooms} Baths</span>
                                                    <span className="bg-secondary px-2 py-0.5 rounded">{property.area_sqft} Sq.ft</span>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button
                                                    className="w-full" size="sm"
                                                    onClick={() => handleCardClick(property)}
                                                >
                                                    View Details
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Panel>
                </PanelGroup>
            </div>

            {/* Listing detail slide-in sheet */}
            <ListingDetailSheet
                listingId={selectedPin?.id ?? null}
                showRent={filters.showRent}
                showSale={filters.showSale}
                onClose={() => setSelectedPin(null)}
            />
        </div>
    );
};