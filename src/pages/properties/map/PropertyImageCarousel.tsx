import { useEffect, useState, useCallback, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

interface PropertyImageCarouselProps {
    propertyId: number;
    propertyName: string;
    propertyCity: string;
    propertyType: string;
}

export function PropertyImageCarousel({ propertyId, propertyName, propertyCity, propertyType }: PropertyImageCarouselProps) {
    const isFlatOrApartment = propertyType.toLowerCase() === "flat" || propertyType.toLowerCase() === "apartment";

    const [images, setImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

    // Lightbox viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerScale, setViewerScale] = useState(1);
    const [viewerOffset, setViewerOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const closeViewer = () => {
        setViewerOpen(false);
        setViewerScale(1);
        setViewerOffset({ x: 0, y: 0 });
    };

    const handleWheel = (e: React.WheelEvent) => {
        const zoomSensitivity = 0.005;
        const delta = -e.deltaY * zoomSensitivity;
        setViewerScale(s => Math.min(Math.max(0.5, s + delta), 5));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - viewerOffset.x, y: e.clientY - viewerOffset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setViewerOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const autoplayRef = useRef(
        Autoplay({ delay: 3500, stopOnInteraction: true, stopOnMouseEnter: true })
    );

    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" }, [autoplayRef.current]);

    // Sync dot state with carousel scroll position
    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        setScrollSnaps(emblaApi.scrollSnapList());
        emblaApi.on("select", onSelect);
        onSelect();
        return () => { emblaApi.off("select", onSelect); };
    }, [emblaApi, onSelect]);

    // Keyboard arrow key navigation — only when carousel is in focus or hovered
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!emblaApi) return;
            // Only handle if the detail panel (or carousel) is the active area
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                emblaApi.scrollPrev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                emblaApi.scrollNext();
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener("keydown", handleKey);
        }
        return () => {
            if (container) container.removeEventListener("keydown", handleKey);
        };
    }, [emblaApi]);

    // Fetch photos
    useEffect(() => {
        if (!propertyId || !isFlatOrApartment) return;

        let isMounted = true;
        setIsLoading(true);
        setError(null);
        setImages([]);
        setSelectedIndex(0);

        const params = new URLSearchParams({
            propertyType,
            name: propertyName || "",
            city: propertyCity || "",
        });

        fetch(`${import.meta.env.VITE_API_URL}/properties/${propertyId}/photos?${params.toString()}`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch photos");
                return res.json();
            })
            .then(data => { if (isMounted) setImages(data || []); })
            .catch(err => { if (isMounted) setError(err.message); })
            .finally(() => { if (isMounted) setIsLoading(false); });

        return () => { isMounted = false; };
    }, [propertyId, propertyType, propertyName, propertyCity, isFlatOrApartment]);

    if (!isFlatOrApartment) {
        return (
            <div className="px-6 py-4 border-b">
                <p className="text-xs text-muted-foreground text-center italic">
                    📷 Contact the owner for property photos
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="px-6 py-4 border-b">
                <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-3">Photos</p>
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-6 py-4 border-b flex items-center justify-center text-muted-foreground gap-2 text-sm bg-muted/10">
                <AlertCircle className="h-4 w-4" />
                <span>Could not load photos</span>
            </div>
        );
    }

    if (!images || images.length === 0) return null;

    return (
        <div
            className="px-6 py-4 border-b overflow-hidden outline-none"
            ref={containerRef}
            // Make div focusable so keydown events fire
            tabIndex={0}
        >
            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-3">
                Photos
            </p>

            {/* Carousel wrapper */}
            <div className="relative group">
                <div className="overflow-hidden rounded-xl bg-muted/30 border shadow-sm cursor-grab active:cursor-grabbing" ref={emblaRef}>
                    <div className="flex touch-pan-y select-none">
                        {images.map((src, index) => (
                            <div className="flex-[0_0_100%] min-w-0 aspect-video" key={index}>
                                <img
                                    src={src}
                                    alt={`${propertyName} photo ${index + 1}`}
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    draggable={false}
                                    onClick={() => {
                                        setSelectedIndex(index);
                                        emblaApi?.scrollTo(index);
                                        setViewerScale(1);
                                        setViewerOffset({ x: 0, y: 0 });
                                        setViewerOpen(true);
                                    }}
                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Prev/Next arrow buttons — visible on hover */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={() => emblaApi?.scrollPrev()}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            aria-label="Previous photo"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => emblaApi?.scrollNext()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            aria-label="Next photo"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Dot navigation */}
            {scrollSnaps.length > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-3">
                    {scrollSnaps.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => emblaApi?.scrollTo(index)}
                            aria-label={`Go to photo ${index + 1}`}
                            className={[
                                "rounded-full transition-all duration-200",
                                index === selectedIndex
                                    ? "w-4 h-2 bg-foreground"
                                    : "w-2 h-2 bg-muted-foreground/40 hover:bg-muted-foreground/70",
                            ].join(" ")}
                        />
                    ))}
                </div>
            )}

            {/* Footer hint */}
            <p className="text-[11px] text-muted-foreground text-center mt-2 italic">
                For more photos, contact the owner
            </p>

            {/* Fullscreen Photo Viewer */}
            {viewerOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute top-4 right-4 flex items-center gap-4 z-50">
                        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-full backdrop-blur-sm">
                            <button 
                                onClick={() => setViewerScale(s => Math.max(0.5, s - 0.25))}
                                className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                                aria-label="Zoom out"
                            >
                                <ZoomOut className="h-5 w-5" />
                            </button>
                            <span className="text-white/90 text-sm font-medium w-12 text-center">
                                {Math.round(viewerScale * 100)}%
                            </span>
                            <button 
                                onClick={() => setViewerScale(s => Math.min(3, s + 0.25))}
                                className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                                aria-label="Zoom in"
                            >
                                <ZoomIn className="h-5 w-5" />
                            </button>
                        </div>
                        <button 
                            onClick={closeViewer}
                            className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
                            aria-label="Close viewer"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div 
                        className="flex-1 w-full flex items-center justify-center overflow-hidden p-4"
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img 
                            src={images[selectedIndex]} 
                            alt={`${propertyName} fullscreen view`}
                            className={`max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
                            style={{ transform: `translate(${viewerOffset.x}px, ${viewerOffset.y}px) scale(${viewerScale})` }}
                            draggable={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
