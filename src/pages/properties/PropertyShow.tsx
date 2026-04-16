import { useOne, useGetIdentity, usePermissions, useGo } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PropertyGallery } from "@/components/PropertyGallery";


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
    const go = useGo();
    const { data: user } = useGetIdentity();
    const { data: role } = usePermissions<string>({});

    if (!id) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Alert variant="destructive">
                    <AlertDescription>Invalid property ID</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => go({ to: "/properties", type: "push" })}>
                    Back to Properties
                </Button>
            </div>
        );
    }

    // 1. Destructure the two properties Refine is actually providing: query and result
    const { query, result } = useOne<Property>({
        resource: "properties",
        id: id,
    });

    // 2. Access the loading/error states from the 'query' object
    const { isLoading, isError, error } = query;
    // 3. The data is directly in the 'result' property (as shown in your tooltip)
    const property = result;

    const isTenant = user && role === "tenant";

    const handleApplyNow = () => {
        if (property) {
            go({
                to: `/applications/new`,
                query: { propertyId: property.id },
                type: "push"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-96 w-full mb-6 rounded-xl" />
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                </div>
            </div>
        );
    }

    if (isError || !property) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Alert variant="destructive">
                    <AlertDescription>{error?.message || "Property not found"}</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => go({ to: "/properties", type: "push" })}>
                    Back to Properties
                </Button>
            </div>
        );
    }

    const formattedAvailableDate = new Date(property.available_from).toLocaleDateString();

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Button variant="ghost" className="mb-4" onClick={() => go({ to: "/properties", type: "push" })}>
                ← Back to Properties
            </Button>

            <Card className="overflow-hidden border-none shadow-lg">
                {/* Hero Gallery Section */}
                <div className="h-[450px] md:h-[550px] w-full relative mb-4">
                    <PropertyGallery propertyId={Number(id)} />
                </div>

                <CardHeader className="pt-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-4xl font-bold">{property.title}</CardTitle>
                            <p className="text-muted-foreground mt-1">{property.address}, {property.city}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">₹{property.monthly_rent}</div>
                            <div className="text-sm text-muted-foreground">per month</div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary uppercase tracking-wider">
                            {property.property_type}
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="space-y-8 pb-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-secondary/50 p-4 rounded-xl text-center border border-border">
                            <div className="text-xl font-bold">{property.bedrooms}</div>
                            <div className="text-xs text-muted-foreground uppercase">Bedrooms</div>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-xl text-center border border-border">
                            <div className="text-xl font-bold">{property.bathrooms}</div>
                            <div className="text-xs text-muted-foreground uppercase">Bathrooms</div>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-xl text-center border border-border">
                            <div className="text-xl font-bold">{property.area_sqft}</div>
                            <div className="text-xs text-muted-foreground uppercase">Sq. Ft.</div>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-xl text-center border border-border">
                            <div className="text-sm font-bold">₹{property.security_deposit}</div>
                            <div className="text-xs text-muted-foreground uppercase">Deposit</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold border-b pb-2">Details</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {property.description}
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                            <span className="text-sm text-muted-foreground">Available From</span>
                            <div className="font-medium">{formattedAvailableDate}</div>
                        </div>
                        {isTenant && (
                            <Button onClick={handleApplyNow} size="lg" className="px-8">
                                Apply Now
                            </Button>
                        )}
                    </div>

                    {!user && (
                        <Alert className="bg-primary/5 border-primary/20">
                            <AlertDescription>
                                Interested in this property? Please{" "}
                                <Button variant="link" className="p-0 h-auto font-bold underline" onClick={() => go({ to: "/login", type: "push" })}>
                                    login
                                </Button>{" "}
                                as a tenant to submit an application.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};