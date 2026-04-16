import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PropertyGalleryProps {
    propertyId: number;
}

interface ImageResource {
    id: number;
    image_url: string;
    is_primary: boolean;
    caption?: string;
}

export const PropertyGallery = ({ propertyId }: PropertyGalleryProps) => {
    const [images, setImages] = useState<ImageResource[]>([]);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const response = await fetch(`${API_URL}/property-assets/images/${propertyId}`);
                if (response.ok) {
                    const data: ImageResource[] = await response.json();
                    setImages(data);
                    // Priority: Primary image > First image found
                    const primary = data.find((img) => img.is_primary) || data[0];
                    if (primary) setActiveImage(primary.image_url);
                }
            } catch (error) {
                console.error("Error fetching gallery:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, [propertyId, API_URL]);

    if (loading) {
        return (
            <div className="space-y-4 h-full w-full">
                <Skeleton className="h-full w-full rounded-xl" />
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-muted rounded-xl text-muted-foreground italic">
                No Images Available
            </div>
        );
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Main Display */}
            <div className="flex-1 overflow-hidden rounded-xl bg-muted relative border border-border">
                {activeImage && (
                    <img
                        src={activeImage}
                        alt="Property Main"
                        className="h-full w-full object-cover transition-all duration-500"
                    />
                )}
            </div>

            {/* Thumbnails Row */}
            {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-primary">
                    {images.map((img) => (
                        <button
                            key={img.id}
                            onClick={() => setActiveImage(img.image_url)}
                            className={`relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                                activeImage === img.image_url
                                    ? "border-primary ring-2 ring-primary/20"
                                    : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                        >
                            <img src={img.image_url} className="h-full w-full object-cover" alt="Thumbnail" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};