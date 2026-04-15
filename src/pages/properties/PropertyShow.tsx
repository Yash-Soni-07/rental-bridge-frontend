import { useOne, useGetIdentity, usePermissions } from "@refinedev/core";
import { useParams, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Property {
    id: number;
    title: string;
    description: string;
    property_type: string;
    address: string;
    city: string;
    state: string;
    country: string;
    bedrooms: number;
    bathrooms: number;
    area_sqft: number;
    monthly_rent: string;
    security_deposit: string;
    available_from: string;
    owner_id: number;
    created_at: string;
    updated_at: string;
}

export const PropertyShow = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: user } = useGetIdentity();
    const { data: permissions } = usePermissions({});
    if (!id) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Alert variant="destructive">
                    <AlertDescription>Invalid property ID</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/properties")}>
                    Back to Properties
                </Button>
            </div>
        );
    }

    const { result, query } = useOne<Property>({
        resource: "properties",
        id: id!,
    });

    const { isLoading, isError, error } = query;

    const property = result;

    // const property = data?.data;
    const isTenant = user && permissions === "tenant";

    const handleApplyNow = () => {
        if (property) {
            navigate(`/applications/new?propertyId=${property.id}`);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-6" />
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
        );
    }

    if (error || !property) {
        console.error("PropertyShow error:", error);
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Alert variant="destructive">
                    <AlertDescription>
                        {error?.message || "Property not found"}
                    </AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/properties")}>
                    Back to Properties
                </Button>
            </div>
        );
    }

    const formattedAvailableDate = new Date(property.available_from).toLocaleDateString();

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Button variant="ghost" className="mb-4" onClick={() => navigate("/properties")}>
                ← Back to Properties
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{property.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {property.property_type}
            </span>
                        <span className="text-2xl font-bold text-primary">₹{property.monthly_rent}/month</span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{property.description}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Location</h3>
                        <p className="text-muted-foreground">
                            {property.address}, {property.city}, {property.state}, {property.country}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <div className="font-semibold">{property.bedrooms}</div>
                            <div className="text-sm text-muted-foreground">Bedrooms</div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <div className="font-semibold">{property.bathrooms}</div>
                            <div className="text-sm text-muted-foreground">Bathrooms</div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <div className="font-semibold">{property.area_sqft} sqft</div>
                            <div className="text-sm text-muted-foreground">Area</div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <div className="font-semibold">₹{property.security_deposit}</div>
                            <div className="text-sm text-muted-foreground">Security Deposit</div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Available From</h3>
                        <p className="text-muted-foreground">{formattedAvailableDate}</p>
                    </div>

                    {isTenant && (
                        <Button onClick={handleApplyNow} className="w-full md:w-auto">
                            Apply Now
                        </Button>
                    )}

                    {!user && (
                        <Alert>
                            <AlertDescription>
                                Please{" "}
                                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/login")}>
                                    login
                                </Button>{" "}
                                as a tenant to apply for this property.
                            </AlertDescription>
                        </Alert>
                    )}

                    {user && !isTenant && (
                        <Alert>
                            <AlertDescription>
                                Only tenants can apply for properties. Your role is {permissions || "unknown"}.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};