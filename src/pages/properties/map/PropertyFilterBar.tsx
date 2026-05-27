import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X } from "lucide-react";
import type { MapFilters } from "./useMapListings";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PropertyFilterBarProps {
    filters: MapFilters;
    totalCount: number;
    isLoading: boolean;
    onFilterChange: <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => void;
    onReset: () => void;
}

// ─── BHK options ─────────────────────────────────────────────────────────────

const BHK_OPTIONS = [1, 2, 3, 4, 5];

// ─── Component ────────────────────────────────────────────────────────────────

export function PropertyFilterBar({
    filters,
    totalCount,
    isLoading,
    onFilterChange,
    onReset,
}: PropertyFilterBarProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    // ── Local slider state ────────────────────────────────────────────────────
    // Sliders update local state on every drag frame (smooth visual feedback).
    // The actual filter update (→ API call) fires only on onValueCommit,
    // i.e. when the user releases the slider thumb.
    const [localRent,  setLocalRent]  = useState<[number, number]>([filters.rentMin,  filters.rentMax]);
    const [localPrice, setLocalPrice] = useState<[number, number]>([filters.priceMin, filters.priceMax]);

    // Sync local state when global filters change externally (e.g. Reset button).
    // During drag: global filters don't change (onValueCommit not fired yet), so
    // this effect is a no-op — no interference with the live drag.
    useEffect(() => {
        setLocalRent([filters.rentMin, filters.rentMax]);
    }, [filters.rentMin, filters.rentMax]);

    useEffect(() => {
        setLocalPrice([filters.priceMin, filters.priceMax]);
    }, [filters.priceMin, filters.priceMax]);

    const hasActiveFilters =
        !filters.showRent ||
        !filters.showSale ||
        filters.bhk.length > 0 ||
        filters.rentMin > 0 ||
        filters.rentMax < 150000 ||
        filters.priceMin > 0 ||
        filters.priceMax < 20 ||
        filters.locality.trim().length > 0;

    function toggleBhk(bhk: number) {
        const current = filters.bhk;
        const next = current.includes(bhk)
            ? current.filter((b) => b !== bhk)
            : [...current, bhk];
        onFilterChange("bhk", next);
    }

    return (
        <div className="border-b bg-card px-4 py-2 flex-shrink-0">
            {/* ── Main filter row ── */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">

                {/* Listing type checkboxes */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="filter-show-rent"
                            checked={filters.showRent}
                            onCheckedChange={(v) => onFilterChange("showRent", !!v)}
                        />
                        <Label htmlFor="filter-show-rent" className="text-sm cursor-pointer select-none">
                            Show Rent
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="filter-show-sale"
                            checked={filters.showSale}
                            onCheckedChange={(v) => onFilterChange("showSale", !!v)}
                        />
                        <Label htmlFor="filter-show-sale" className="text-sm cursor-pointer select-none">
                            Show Sale
                        </Label>
                    </div>
                </div>

                {/* Separator */}
                <div className="h-5 w-px bg-border hidden sm:block" />

                {/* BHK toggle buttons */}
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">BHK:</span>
                    {BHK_OPTIONS.map((bhk) => {
                        const active = filters.bhk.includes(bhk);
                        return (
                            <button
                                key={bhk}
                                onClick={() => toggleBhk(bhk)}
                                className={`
                                    h-7 min-w-[2rem] px-2 rounded-full text-xs font-medium border transition-colors
                                    ${active
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-foreground border-border hover:bg-accent"
                                    }
                                `}
                            >
                                {bhk === 5 ? "5+" : bhk}
                            </button>
                        );
                    })}
                    {filters.bhk.length > 0 && (
                        <button
                            onClick={() => onFilterChange("bhk", [])}
                            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground"
                            title="Clear BHK filter"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* Separator */}
                <div className="h-5 w-px bg-border hidden sm:block" />

                {/* Advanced filters toggle */}
                <button
                    onClick={() => setShowAdvanced((p) => !p)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {showAdvanced ? "Less filters" : "More filters"}
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Results count + reset */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                        {isLoading ? (
                            <span className="animate-pulse">Loading…</span>
                        ) : (
                            <span>
                                <span className="font-semibold text-foreground">
                                    {totalCount.toLocaleString("en-IN")}
                                </span>{" "}
                                listings
                            </span>
                        )}
                    </span>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onReset}
                            className="h-7 text-xs text-muted-foreground"
                        >
                            <X className="h-3 w-3 mr-1" />
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Advanced filters (expanded) ── */}
            {showAdvanced && (
                <div className="mt-3 pt-3 border-t flex flex-wrap gap-6">

                    {/* Locality search */}
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <Label className="text-xs text-muted-foreground">Locality</Label>
                        <Input
                            placeholder="e.g. Ghatlodia, Bopal…"
                            value={filters.locality}
                            onChange={(e) => onFilterChange("locality", e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>

                    {/* Rent range — only when showRent is active */}
                    {filters.showRent && (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                            <Label className="text-xs text-muted-foreground">
                                Monthly Rent:{" "}
                                <span className="text-foreground font-medium">
                                    {/* Display uses localRent — updates every frame for smooth label */}
                                    ₹{(localRent[0] / 1000).toFixed(0)}k – ₹{(localRent[1] / 1000).toFixed(0)}k
                                </span>
                            </Label>
                            <Slider
                                min={0}
                                max={150000}
                                step={1000}
                                value={localRent}
                                onValueChange={([min, max]) => {
                                    // Updates label only — no API call yet
                                    setLocalRent([min, max]);
                                }}
                                onValueCommit={([min, max]) => {
                                    // User released thumb — now trigger the filter + API
                                    onFilterChange("rentMin", min);
                                    onFilterChange("rentMax", max);
                                }}
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* Price range — only when showSale is active */}
                    {filters.showSale && (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                            <Label className="text-xs text-muted-foreground">
                                Sale Price:{" "}
                                <span className="text-foreground font-medium">
                                    {/* Display uses localPrice — updates every frame for smooth label */}
                                    ₹{localPrice[0].toFixed(1)} Cr – ₹{localPrice[1].toFixed(1)} Cr
                                </span>
                            </Label>
                            <Slider
                                min={0}
                                max={20}
                                step={0.1}
                                value={localPrice}
                                onValueChange={([min, max]) => {
                                    // Updates label only — no API call yet
                                    setLocalPrice([min, max]);
                                }}
                                onValueCommit={([min, max]) => {
                                    // User released thumb — now trigger the filter + API
                                    onFilterChange("priceMin", min);
                                    onFilterChange("priceMax", max);
                                }}
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
