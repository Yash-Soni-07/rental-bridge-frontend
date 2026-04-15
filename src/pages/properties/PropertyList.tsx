import { useList } from "@refinedev/core";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface Property {
    id: number;
    title: string;
    description: string | null;
    address: string;
    bedrooms: number;
    bathrooms: number;
    area_sqft: number;
    monthly_rent: number;
}

export const PropertyList = () => {
    const navigate = useNavigate();

    const { result, query } = useList<Property>({
        resource: "properties",
    });

    const { isLoading, isError, error } = query;
    const properties = result?.data ?? [];

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Properties</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-2/3" />
                            </CardContent>
                            <CardFooter>
                                <Skeleton className="h-10 w-full" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="container mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Properties</h1>
                <div className="text-destructive">
                    Failed to load properties: {error?.message ?? "Something went wrong"}
                </div>
            </div>
        );
    }

    if (properties.length === 0) {
        return (
            <div className="container mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Properties</h1>
                <div className="text-muted-foreground">No properties found.</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Properties</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                    <Card key={property.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="line-clamp-1">
                                {property.title}
                            </CardTitle>

                            <div className="text-2xl font-bold text-primary">
                                ₹{property.monthly_rent}/month
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1">
                            <p className="text-muted-foreground line-clamp-2 mb-2">
                                {property.description || "No description available"}
                            </p>

                            <div className="text-sm text-muted-foreground">
                                {property.address}
                            </div>

                            <div className="flex gap-4 mt-2 text-sm">
                                <span>{property.bedrooms} beds</span>
                                <span>{property.bathrooms} baths</span>
                                <span>{property.area_sqft} sqft</span>
                            </div>
                        </CardContent>

                        <CardFooter>
                            <Button
                                className="w-full"
                                onClick={() => navigate(`/properties/${property.id}`)}
                            >
                                View Details
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
};