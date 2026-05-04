// src/pages/properties/PropertyEdit.tsx
import React from "react";
import { useOne, useUpdate, useDelete, useGetIdentity, usePermissions, useGo } from "@refinedev/core";
import { useParams } from "react-router";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowLeft, Building, Trash2 } from "lucide-react";
import type { User, Property } from "@/types";

type PropertyFormData = Omit<Property, "id" | "owner_id" | "created_at" | "updated_at" | "images" | "price" | "area">;

export const PropertyEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const go = useGo();
    const { data: user } = useGetIdentity<User>();
    const { data: role } = usePermissions<string>({});
    const { mutate: updateProperty, mutation: updateMutation } = useUpdate();
    const { mutate: deleteProperty, mutation: deleteMutation } = useDelete();

    const { result: property, query } = useOne<Property>({
        resource: "properties",
        id: id!,
        queryOptions: { enabled: !!id },
    });

    const isSubmitting = updateMutation.status === "pending";
    const isDeleting = deleteMutation.status === "pending";
    const serverError = updateMutation.error?.message;

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<PropertyFormData>();

    // Pre-populate form when property data arrives
    React.useEffect(() => {
        if (property) {
            const { id: _id, owner_id, created_at, updated_at, images, ...rest } = property as any;
            reset(rest);
        }
    }, [property, reset]);

    // Guard: only owner or admin can edit
    const canEdit = role === "admin" || (property && user?.id === (property as any).owner_id);

    const onSubmit = (data: PropertyFormData) => {
        if (!id || !canEdit) return;
        updateProperty(
            {
                resource: "properties",
                id: id,
                values: data,
            },
            {
                onSuccess: () => go({ to: `/properties/${id}`, type: "push" }),
            }
        );
    };

    const handleDelete = () => {
        if (!id || !canEdit) return;
        if (!window.confirm("Are you sure you want to delete this property? This cannot be undone.")) return;
        deleteProperty(
            {
                resource: "properties",
                id: id,
            },
            {
                onSuccess: () => go({ to: "/properties", type: "push" }),
            }
        );
    };

    if (query.isLoading) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[600px] w-full rounded-xl" />
            </div>
        );
    }

    if (query.isError || !property) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4">
                <Alert variant="destructive">
                    <AlertDescription>Property not found.</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => go({ to: "/properties", type: "push" })}>
                    Back
                </Button>
            </div>
        );
    }

    if (!canEdit) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4">
                <Alert variant="destructive">
                    <AlertDescription>You don't have permission to edit this property.</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => go({ to: `/properties/${id}`, type: "push" })}>
                    Back to Property
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Button
                variant="ghost"
                onClick={() => go({ to: `/properties/${id}`, type: "push" })}
                className="mb-6 -ml-4 text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Property
            </Button>

            <Card className="shadow-lg border-border/50">
                <CardHeader className="space-y-1 pb-6 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-primary/10 rounded-lg">
                                <Building className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight">Edit Property</CardTitle>
                                <CardDescription className="text-sm mt-1">
                                    Update the details of your listing.
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        {serverError && (
                            <Alert variant="destructive">
                                <AlertDescription>{serverError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold tracking-tight">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="title">Property Title <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="title"
                                        {...register("title", { required: "Title is required" })}
                                        className={errors.title ? "border-destructive" : ""}
                                    />
                                    {errors.title && <p className="text-[11px] text-destructive">{errors.title.message}</p>}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                                    <textarea
                                        id="description"
                                        rows={4}
                                        {...register("description", { required: "Description is required" })}
                                        className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none ${errors.description ? "border-destructive" : "border-input"}`}
                                    />
                                    {errors.description && <p className="text-[11px] text-destructive">{errors.description.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="property_type">Property Type <span className="text-destructive">*</span></Label>
                                    <select
                                        id="property_type"
                                        {...register("property_type", { required: true })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <option value="apartment">Apartment</option>
                                        <option value="house">House</option>
                                        <option value="condo">Condo</option>
                                        <option value="studio">Studio</option>
                                        <option value="townhouse">Townhouse</option>
                                        <option value="villa">Villa</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        {...register("status")}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <option value="available">Available</option>
                                        <option value="rented">Rented</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="available_from">Available From <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="available_from"
                                        type="date"
                                        {...register("available_from", { required: "Required" })}
                                        className={errors.available_from ? "border-destructive" : ""}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold tracking-tight">Location</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                                    <Input id="address" {...register("address", { required: "Address is required" })} className={errors.address ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                                    <Input id="city" {...register("city", { required: true })} className={errors.city ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
                                    <Input id="state" {...register("state", { required: true })} className={errors.state ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="zip_code">ZIP Code <span className="text-destructive">*</span></Label>
                                    <Input id="zip_code" {...register("zip_code", { required: true })} className={errors.zip_code ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input id="country" {...register("country")} />
                                </div>
                            </div>
                        </div>

                        {/* Specs & Pricing */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold tracking-tight">Specifications & Pricing</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bedrooms">Bedrooms <span className="text-destructive">*</span></Label>
                                    <Input id="bedrooms" type="number" min="0" {...register("bedrooms", { required: true, valueAsNumber: true })} className={errors.bedrooms ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bathrooms">Bathrooms <span className="text-destructive">*</span></Label>
                                    <Input id="bathrooms" type="number" min="0" step="0.5" {...register("bathrooms", { required: true, valueAsNumber: true })} className={errors.bathrooms ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="area_sqft">Area (Sq.Ft.) <span className="text-destructive">*</span></Label>
                                    <Input id="area_sqft" type="number" min="0" {...register("area_sqft", { required: true, valueAsNumber: true })} className={errors.area_sqft ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="monthly_rent">Rent (₹) <span className="text-destructive">*</span></Label>
                                    <Input id="monthly_rent" type="number" min="0" {...register("monthly_rent", { required: true, valueAsNumber: true })} className={errors.monthly_rent ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="security_deposit">Deposit (₹) <span className="text-destructive">*</span></Label>
                                    <Input id="security_deposit" type="number" min="0" {...register("security_deposit", { required: true, valueAsNumber: true })} className={errors.security_deposit ? "border-destructive" : ""} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/40 flex justify-end gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => go({ to: `/properties/${id}`, type: "push" })}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
