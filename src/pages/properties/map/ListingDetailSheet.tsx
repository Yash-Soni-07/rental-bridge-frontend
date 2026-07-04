import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, AlertTriangle, MapPin } from "lucide-react";
import { fetchListingDetail, type ListingDetail } from "./useMapListings";
import { formatCr, formatRent, formatPerSqft } from "@/lib/formatPrice";
import { WorkspaceCommuteCard } from "./WorkspaceCommuteCard";
import { NearbyAmenitiesCard } from "./NearbyAmenitiesCard";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ListingDetailSheetProps {
    listingId: number | null;
    showRent: boolean;
    showSale: boolean;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ListingDetailSheet({
    listingId,
    showRent,
    showSale,
    onClose,
}: ListingDetailSheetProps) {
    const [detail, setDetail] = useState<ListingDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Fetch full detail whenever the selected listing changes
    useEffect(() => {
        if (!listingId) {
            setDetail(null);
            return;
        }
        setIsLoading(true);
        setFetchError(null);
        fetchListingDetail(listingId)
            .then(setDetail)
            .catch((err: Error) => setFetchError(err.message))
            .finally(() => setIsLoading(false));
    }, [listingId]);

    const googleMapsUrl =
        detail?.latitude && detail?.longitude
            ? `https://www.google.com/maps?q=${detail.latitude},${detail.longitude}`
            : null;

    return (
        <Sheet open={listingId !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                className="w-[380px] sm:w-[420px] overflow-y-auto p-0"
            >
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : fetchError ? (
                    <div className="p-6 flex flex-col items-center gap-3 text-center">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <p className="text-sm text-muted-foreground">{fetchError}</p>
                    </div>
                ) : detail ? (
                    <div className="flex flex-col">
                        {/* ── Header ── */}
                        <div className="px-6 pt-6 pb-4 border-b">
                            <SheetHeader className="text-left space-y-1">
                                <SheetTitle className="text-lg font-bold leading-tight line-clamp-2">
                                    {detail.name}
                                </SheetTitle>
                                <SheetDescription className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                    {[detail.locality, detail.city].filter(Boolean).join(", ")}
                                </SheetDescription>
                            </SheetHeader>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                <Badge variant="secondary" className="capitalize">
                                    {detail.property_type}
                                </Badge>
                                {detail.bhk_type && (
                                    <Badge variant="secondary">{detail.bhk_type} BHK</Badge>
                                )}
                                {detail.area_type && (
                                    <Badge variant="outline" className="capitalize text-xs">
                                        {detail.area_type.replace("_", " ")} area
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* ── Area info ── */}
                        {(detail.area_sqft_raw || detail.area_sqft_super) && (
                            <div className="px-6 py-4 border-b bg-muted/30">
                                <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-2">
                                    Area
                                </p>
                                <div className="flex items-baseline gap-2 text-sm">
                                    {detail.area_sqft_raw && (
                                        <span className="font-semibold">
                                            {detail.area_sqft_raw.toLocaleString("en-IN")} sqft
                                        </span>
                                    )}
                                    {detail.area_sqft_raw && detail.area_sqft_super &&
                                        detail.area_type !== "super" && (
                                            <>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="text-muted-foreground">
                                                    {Math.round(detail.area_sqft_super).toLocaleString("en-IN")} sqft super BU
                                                </span>
                                            </>
                                        )}
                                </div>
                            </div>
                        )}

                        {/* ── Pricing ── */}
                        <div className="px-6 py-4 space-y-5">

                            {/* Estimated Rent */}
                            {showRent && detail.est_monthly_rent && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-4">
                                    <p className="text-xs uppercase font-semibold tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
                                        Estimated Monthly Rent
                                    </p>
                                    <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                                        {formatRent(detail.est_monthly_rent)}
                                    </div>
                                    {detail.est_monthly_rent_min && detail.est_monthly_rent_max && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                            Range: {formatRent(detail.est_monthly_rent_min)} –{" "}
                                            {formatRent(detail.est_monthly_rent_max)}
                                        </p>
                                    )}
                                    {detail.rent_per_sqft && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            {formatPerSqft(detail.rent_per_sqft)}/mo
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Sale Price */}
                            {showSale && detail.price_in_cr && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4">
                                    <p className="text-xs uppercase font-semibold tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                                        Sale Price
                                    </p>
                                    <div className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                                        {formatCr(detail.price_in_cr)}
                                    </div>
                                    {detail.rate_per_sqft_super && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            {formatPerSqft(detail.rate_per_sqft_super)} (super BU)
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            {detail.description && (
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1.5">
                                        About
                                    </p>
                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">
                                        {detail.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ── Workspace Commute Card ── */}
                        {detail.latitude && detail.longitude && (
                            <WorkspaceCommuteCard
                                propertyLat={detail.latitude}
                                propertyLng={detail.longitude}
                            />
                        )}

                        {/* ── Nearby Amenities Card ── */}
                        {detail.latitude && detail.longitude && (
                            <NearbyAmenitiesCard
                                propertyLat={detail.latitude}
                                propertyLng={detail.longitude}
                            />
                        )}

                        {/* ── Footer actions ── */}
                        <div className="px-6 py-4 border-t space-y-3">
                            {googleMapsUrl && (
                                <a
                                    href={googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View on Google Maps
                                </a>
                            )}

                            {/* Data source disclaimer */}
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                <AlertTriangle className="inline h-3 w-3 mr-1 text-amber-500" />
                                Rent is estimated at 3% annual yield on market value.
                                Source: 99acres (2023–24). Prices are indicative.
                            </p>
                        </div>
                    </div>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
