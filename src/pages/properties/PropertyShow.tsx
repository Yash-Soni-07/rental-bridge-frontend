import { useOne, useGetIdentity, usePermissions, useGo } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PropertyGallery } from "@/components/PropertyGallery";
import { useList, useCreate } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import React from "react";


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
                        <div className="text-right flex flex-col items-end gap-2">
                            <div className="text-3xl font-bold text-primary">₹{property.monthly_rent}</div>
                            <div className="text-sm text-muted-foreground">per month</div>
                            {/* Edit button for property owner or admin */}
                            {(role === "admin" || (user && (user as any).id === property.owner_id)) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => go({ to: `/properties/${id}/edit`, type: "push" })}
                                    className="gap-2 mt-1"
                                >
                                    Edit Property
                                </Button>
                            )}
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

            {/* ── Reviews Section ── */}
            <ReviewsSection propertyId={Number(id)} currentUser={user as any} role={role} />
        </div>
    );
};


// ─── Reviews Section Component ────────────────────────────────────────────────
interface ReviewsSectionProps {
    propertyId: number;
    currentUser: any;
    role: string | null | undefined;
}

interface ReviewFormData {
    title: string;
    rating: number;
    comment: string;
}

interface Review {
    id: number;
    property_id: number;
    reviewer_id: number;
    rating: number;
    title: string;
    comment?: string | null;
    is_verified: boolean;
    created_at: string;
}

function StarRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange?.(star)}
                    className={`p-0.5 rounded transition-colors ${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} bg-transparent border-none`}
                >
                    <Star
                        className={`h-5 w-5 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                    />
                </button>
            ))}
        </div>
    );
}

function ReviewsSection({ propertyId, currentUser, role }: ReviewsSectionProps) {
    const [showForm, setShowForm] = React.useState(false);
    const [selectedRating, setSelectedRating] = React.useState(5);
    const { mutate: createReview, mutation } = useCreate();
    const isSubmitting = mutation.status === "pending";

    const { result, query } = useList<Review>({
        resource: `reviews/property/${propertyId}`,
    });

    const reviews = result?.data ?? [];
    const avgRating = reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ReviewFormData>();

    const onSubmitReview = (data: ReviewFormData) => {
        if (!currentUser?.id) return;
        createReview(
            {
                resource: "reviews",
                values: {
                    property_id: propertyId,
                    reviewer_id: currentUser.id,
                    rating: selectedRating,
                    title: data.title,
                    comment: data.comment || null,
                },
            },
            {
                onSuccess: () => {
                    reset();
                    setSelectedRating(5);
                    setShowForm(false);
                },
            }
        );
    };

    return (
        <div className="mt-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">
                        Reviews
                        {reviews.length > 0 && (
                            <span className="text-muted-foreground text-base font-normal ml-2">
                                ({reviews.length})
                            </span>
                        )}
                    </h2>
                    {reviews.length > 0 && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <StarRating rating={Math.round(avgRating)} />
                            <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                        </div>
                    )}
                </div>
                {currentUser && role === "tenant" && !showForm && (
                    <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-2 self-start">
                        <Star className="h-4 w-4" /> Write a Review
                    </Button>
                )}
            </div>

            {/* Review form */}
            {showForm && (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Your Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Rating <span className="text-destructive">*</span></Label>
                                <StarRating rating={selectedRating} onChange={setSelectedRating} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="review-title">Title <span className="text-destructive">*</span></Label>
                                <Input
                                    id="review-title"
                                    placeholder="Summarize your experience"
                                    {...register("title", { required: "Title is required" })}
                                    className={errors.title ? "border-destructive" : ""}
                                />
                                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="review-comment">Comment (optional)</Label>
                                <Textarea
                                    id="review-comment"
                                    placeholder="Share details of your experience..."
                                    rows={4}
                                    {...register("comment")}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={isSubmitting} className="gap-2">
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Submit Review
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowForm(false); reset(); }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Reviews list */}
            {query.isLoading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
            ) : reviews.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-10 border-dashed bg-muted/10">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <Card key={review.id} className="shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-sm">{review.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {new Date(review.created_at).toLocaleDateString("en-IN", {
                                                day: "numeric", month: "long", year: "numeric"
                                            })}
                                        </p>
                                    </div>
                                    <StarRating rating={review.rating} />
                                </div>
                            </CardHeader>
                            {review.comment && (
                                <CardContent>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {review.comment}
                                    </p>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
