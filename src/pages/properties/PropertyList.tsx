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
import { PropertyImageCarousel } from "./map/PropertyImageCarousel";
import { ListingDetailView } from "./map/ListingDetailView";
import { useMapListings, type MapPin } from "./map/useMapListings";
import { getZoneColor, type WardCount } from "./map/useWardMap";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

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
    listing_id?: number | null;
    property_type?: string;
    city?: string;
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

    const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
    const [featuredLoading, setFeaturedLoading] = useState(false);
    const [featuredPage, setFeaturedPage] = useState(1);
    const [featuredTotal, setFeaturedTotal] = useState(0);

    // Reset page to 1 when filters change
    useEffect(() => {
        setFeaturedPage(1);
    }, [
        filters.bhk,
        filters.rentMin,
        filters.rentMax,
        filters.priceMin,
        filters.priceMax,
        filters.locality,
        filters.showRent,
        filters.showSale,
        filters.sortBy,
        filters.sortOrder
    ]);

    useEffect(() => {
        if (!activeWard) {
            setFeaturedLoading(true);
            const params = new URLSearchParams();
            params.set("page", String(featuredPage));
            params.set("limit", "20");

            if (filters.bhk.length > 0) {
                params.set("bhk", filters.bhk.join(","));
            }
            if (filters.rentMin > 0) {
                params.set("rent_min", String(filters.rentMin));
            }
            if (filters.rentMax < 150000) {
                params.set("rent_max", String(filters.rentMax));
            }
            if (filters.priceMin > 0) {
                params.set("price_min", String(filters.priceMin));
            }
            if (filters.priceMax < 20) {
                params.set("price_max", String(filters.priceMax));
            }
            if (filters.locality.trim()) {
                params.set("locality", filters.locality.trim());
            }
            if (filters.showRent && !filters.showSale) {
                params.set("purpose", "rent,both");
            } else if (!filters.showRent && filters.showSale) {
                params.set("purpose", "sale,both");
            }
            if (filters.sortBy) {
                params.set("sort_by", filters.sortBy);
            }
            if (filters.sortOrder) {
                params.set("sort_order", filters.sortOrder);
            }

            fetch(`${API_BASE}/api/properties/featured?${params.toString()}`)
                .then(r => r.json())
                .then(res => {
                    setFeaturedProperties(res.data || []);
                    setFeaturedTotal(res.total || 0);
                    setFeaturedLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch featured properties", err);
                    setFeaturedLoading(false);
                });
        }
    }, [activeWard, featuredPage, filters]);

    // Client-side filter: match properties whose address contains the active ward and filters
    const filteredProperties = activeWard
        ? allProperties.filter((p) => {
            const matchesWard = p.address?.toUpperCase().includes(activeWard);
            if (!matchesWard) return false;

            if (filters.bhk.length > 0) {
                const matchesBhk = filters.bhk.includes(p.bedrooms) || (filters.bhk.includes(5) && p.bedrooms >= 5);
                if (!matchesBhk) return false;
            }

            if (Number(p.monthly_rent) < filters.rentMin || Number(p.monthly_rent) > filters.rentMax) {
                return false;
            }

            if (filters.locality.trim()) {
                const loc = filters.locality.trim().toUpperCase();
                if (!p.address.toUpperCase().includes(loc) && !p.title.toUpperCase().includes(loc)) {
                    return false;
                }
            }

            return true;
        })
        : featuredProperties;

    // Apply sorting
    const properties = (() => {
        const sorted = [...filteredProperties];
        if (filters.sortBy && filters.sortOrder) {
            const orderMultiplier = filters.sortOrder === "desc" ? -1 : 1;
            sorted.sort((a, b) => {
                if (filters.sortBy === "rent") {
                    return (Number(a.monthly_rent) - Number(b.monthly_rent)) * orderMultiplier;
                }
                if (filters.sortBy === "area") {
                    return (a.area_sqft - b.area_sqft) * orderMultiplier;
                }
                if (filters.sortBy === "bhk") {
                    return (a.bedrooms - b.bedrooms) * orderMultiplier;
                }
                return (a.id - b.id) * orderMultiplier;
            });
        }
        return sorted;
    })();
    
    const displayLoading = activeWard ? cardsLoading : featuredLoading;

    // ── Map interaction state ─────────────────────────────────────────────────
    const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
    const [highlightedPinId, setHighlightedPinId] = useState<number | null>(null);
    const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number } | null>(null);

    function handlePinClick(pin: MapPin) {
        setSelectedPin(pin);
        setFlyToCoords(null);
    }

    function handleCardClick(property: Property) {
        if (!activeWard && property.listing_id) {
            setSelectedPin({ id: property.listing_id } as MapPin);
            return;
        }

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
            setFeaturedPage(1);
            updateFilter("ward", "");
        }
    }, [updateFilter]);

    function handleReset() {
        resetFilters();
        setActiveWard(null);
        setFeaturedPage(1);
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
                    <Panel defaultSize={50} minSize={25} maxSize={75} className="relative overflow-hidden">
                        <div className="h-full overflow-y-auto p-4">
                            {/* Panel header */}
                            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold">{activeWard ? "Properties" : "Featured Properties"}</h1>
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
                                <div className="flex items-center gap-3">
                                    <select
                                        value={`${filters.sortBy}-${filters.sortOrder}`}
                                        onChange={(e) => {
                                            const [by, order] = e.target.value.split("-");
                                            updateFilter("sortBy", by);
                                            updateFilter("sortOrder", order);
                                        }}
                                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer hover:border-muted-foreground/30 transition-colors"
                                    >
                                        <option value="id-asc">Sort: Default</option>
                                        <option value="rent-asc">Rent: Low to High</option>
                                        <option value="rent-desc">Rent: High to Low</option>
                                        <option value="area-asc">Area: Small to Large</option>
                                        <option value="area-desc">Area: Large to Small</option>
                                        <option value="bhk-asc">BHK: Low to High</option>
                                        <option value="bhk-desc">BHK: High to Low</option>
                                    </select>
                                    {!displayLoading && (
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {activeWard ? (
                                                <>{properties.length} rental{properties.length !== 1 ? "s" : ""} in {activeWard}</>
                                            ) : (
                                                <>{featuredTotal} featured rentals</>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Loading skeletons */}
                            {displayLoading && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {[...Array(4)].map((_, i) => (
                                        <Card key={i}>
                                            <Skeleton className="h-48 w-full rounded-t-xl" />
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
                            {!displayLoading && !isError && properties.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                                    <p className="text-sm">
                                        {activeWard
                                            ? `No verified rentals in ${activeWard} ward yet.`
                                            : "No featured properties listed yet."}
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
                            {!displayLoading && !isError && properties.length > 0 && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {properties.map((property) => (
                                        <Card
                                            key={property.id}
                                            className="flex flex-col hover:shadow-lg transition-all duration-200 overflow-hidden border-none shadow-sm cursor-pointer"
                                            onMouseEnter={() => setHighlightedPinId(property.id)}
                                            onMouseLeave={() => setHighlightedPinId(null)}
                                        >
                                            {!activeWard && property.listing_id ? (
                                                <div className="h-48 overflow-hidden rounded-t-xl">
                                                    <PropertyImageCarousel 
                                                        propertyId={property.listing_id} 
                                                        propertyName={property.title} 
                                                        propertyCity={property.city || "Ahmedabad"} 
                                                        propertyType={property.property_type || "apartment"} 
                                                    />
                                                </div>
                                            ) : (
                                                <PropertyImage propertyId={property.id} />
                                            )}
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

                            {/* Pagination (Featured only) */}
                            {!activeWard && !displayLoading && featuredTotal > 20 && (
                                <div className="mt-8 mb-4">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious 
                                                    onClick={() => setFeaturedPage(p => Math.max(1, p - 1))} 
                                                    className={featuredPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>
                                            <PaginationItem>
                                                <span className="text-sm text-muted-foreground px-4">
                                                    Page {featuredPage} of {Math.ceil(featuredTotal / 20)}
                                                </span>
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationNext 
                                                    onClick={() => setFeaturedPage(p => Math.min(Math.ceil(featuredTotal / 20), p + 1))}
                                                    className={featuredPage >= Math.ceil(featuredTotal / 20) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </div>

                        {/* Embedded Listing Detail View */}
                        <ListingDetailView
                            listingId={selectedPin?.id ?? null}
                            showRent={filters.showRent}
                            showSale={filters.showSale}
                            onClose={() => setSelectedPin(null)}
                        />
                    </Panel>
                </PanelGroup>
            </div>

        </div>
    );
};