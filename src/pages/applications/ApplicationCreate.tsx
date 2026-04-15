import { useCreate, useOne, useGetIdentity } from "@refinedev/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface ApplicationFormValues {
    move_in_date: string;
    monthly_income: number;
    employment_status: string;
    references?: string;
}

interface Property {
    id: number;
    title: string;
    address: string;
    city: string;
    monthly_rent: string;
}

export const ApplicationCreate = () => {
    const [searchParams] = useSearchParams();
    const propertyId = searchParams.get("propertyId");
    const navigate = useNavigate();
    const { data: user } = useGetIdentity();
    const { mutate: createApplication, mutation } = useCreate();
    // ADD THIS ABOVE (after useCreate)

    const isLoading = mutation?.status === "pending";    // Fetch property details for display
    const { result: property, query } = useOne<Property>({
        resource: "properties",
        id: propertyId!,
        queryOptions: { enabled: !!propertyId },
    });

    const propertyLoading = query?.isLoading;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ApplicationFormValues>();

    // Redirect if no propertyId
    if (!propertyId) {
        return (
            <div className="container mx-auto p-6 max-w-2xl">
                <Alert variant="destructive">
                    <AlertDescription>No property selected. Please go back and try again.</AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => navigate("/properties")}>
                    Browse Properties
                </Button>
            </div>
        );
    }

    const onSubmit = (values: ApplicationFormValues) => {
        createApplication(
            {
                resource: "applications",
                values: {
                    property_id: parseInt(propertyId),
                    move_in_date: values.move_in_date,
                    monthly_income: values.monthly_income,
                    employment_status: values.employment_status,
                    references: values.references || undefined,
                },
            },
            {
                onSuccess: () => {
                    navigate("/dashboard");
                },
                onError: (error) => {
                    console.error("Application submission error:", error);
                },
            }
        );
    };

    if (propertyLoading) {
        return (
            <div className="container mx-auto p-6 max-w-2xl">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-6" />
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="container mx-auto p-6 max-w-2xl">
                <Alert variant="destructive">
                    <AlertDescription>Property not found.</AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => navigate("/properties")}>
                    Back to Properties
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <Button variant="ghost" className="mb-4" onClick={() => navigate(`/properties/${propertyId}`)}>
                ← Back to Property
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Apply for {property.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {property.address}, {property.city} · ₹{property.monthly_rent}/month
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="move_in_date">Preferred Move-in Date *</Label>
                            <Input
                                id="move_in_date"
                                type="date"
                                {...register("move_in_date", { required: "Move-in date is required" })}
                                aria-invalid={!!errors.move_in_date}
                            />
                            {errors.move_in_date && (
                                <p className="text-sm text-destructive">{errors.move_in_date.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="monthly_income">Monthly Income (₹) *</Label>
                            <Input
                                id="monthly_income"
                                type="number"
                                placeholder="e.g., 50000"
                                {...register("monthly_income", {
                                    required: "Monthly income is required",
                                    min: { value: 0, message: "Income must be positive" },
                                })}
                                aria-invalid={!!errors.monthly_income}
                            />
                            {errors.monthly_income && (
                                <p className="text-sm text-destructive">{errors.monthly_income.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="employment_status">Employment Status *</Label>
                            <Input
                                id="employment_status"
                                placeholder="e.g., Employed, Self-employed, Student"
                                {...register("employment_status", { required: "Employment status is required" })}
                                aria-invalid={!!errors.employment_status}
                            />
                            {errors.employment_status && (
                                <p className="text-sm text-destructive">{errors.employment_status.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="references">References (Optional)</Label>
                            <Textarea
                                id="references"
                                placeholder="Provide contact information for references..."
                                {...register("references")}
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Submitting..." : "Submit Application"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => navigate("/properties")}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};