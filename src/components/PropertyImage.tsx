import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PropertyImageProps {
    propertyId: number;
}

interface ImageResource {
    id: number;
    image_url: string;
    is_primary: boolean;
}

export const PropertyImage = ({ propertyId }: PropertyImageProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

    useEffect(() => {
        const fetchImage = async () => {
            try {
                const response = await fetch(`${API_URL}/property-assets/images/${propertyId}`);
                if (response.ok) {
                    const data: ImageResource[] = await response.json();
                    // Priority: Primary image > First image found
                    const primary = data.find((img) => img.is_primary) || data[0];
                    if (primary) setImageUrl(primary.image_url);
                }
            } catch (error) {
                console.error("Error fetching property image:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchImage();
    }, [propertyId, API_URL]);

    if (loading) {
        return <Skeleton className="h-full w-full rounded-t-xl" />;
    }

    return (
        <div className="h-full w-full overflow-hidden rounded-t-xl bg-muted">
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt="Property"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
            ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
                    No Image Available
                </div>
            )}
        </div>
    );
};