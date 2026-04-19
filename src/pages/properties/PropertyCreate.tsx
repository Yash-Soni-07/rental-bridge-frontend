import React from "react";
import { useCreate, useGetIdentity, useGo } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Building } from "lucide-react";
import type { User, Property } from "@/types";

// Omit generated/backend-controlled fields. 
// We are now strictly using the updated backend-aligned fields.
type PropertyFormData = Omit<Property, "id" | "owner_id" | "created_at" | "updated_at" | "images" | "price" | "area">;

export const PropertyCreate = () => {
    const go = useGo();
    const { data: user } = useGetIdentity<User>();
    const { mutate: createProperty, mutation } = useCreate();
    
    const isSubmitting = mutation.status === "pending";
    const serverError = mutation.error?.message;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<PropertyFormData>({
        defaultValues: {
            property_type: "apartment",
            status: "available",
            country: "India", // Default country
        }
    });

    const onSubmit = (data: PropertyFormData) => {
        if (!user?.id) return;

        createProperty(
            {
                resource: "properties",
                values: {
                    ...data,
                    owner_id: user.id, // Enforced securely from the authenticated user
                },
            },
            {
                onSuccess: () => {
                    go({ to: "/properties", type: "push" });
                },
            }
        );
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <Button 
                variant="ghost" 
                onClick={() => go({ to: "/dashboard", type: "push" })}
                className="mb-6 -ml-4 text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>

            <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="space-y-1 pb-6 border-b border-border/40">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-primary/10 rounded-lg">
                            <Building className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight">List a New Property</CardTitle>
                            <CardDescription className="text-sm mt-1">
                                Enter the details of your property to attract tenants.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        {serverError && (
                            <Alert variant="destructive">
                                <AlertDescription>{serverError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Basic Info Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold tracking-tight">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="title">Property Title <span className="text-destructive">*</span></Label>
                                    <Input 
                                        id="title" 
                                        placeholder="e.g., Luxury 2BHK in South City" 
                                        {...register("title", { required: "Title is required" })}
                                        className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {errors.title && <p className="text-[11px] text-destructive mt-1">{errors.title.message}</p>}
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                                    <textarea 
                                        id="description" 
                                        rows={4}
                                        placeholder="Describe the key features and amenities..." 
                                        {...register("description", { required: "Description is required" })}
                                        className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.description ? "border-destructive focus-visible:ring-destructive" : "border-input"}`}
                                    />
                                    {errors.description && <p className="text-[11px] text-destructive mt-1">{errors.description.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="property_type">Property Type <span className="text-destructive">*</span></Label>
                                    <select
                                        id="property_type"
                                        {...register("property_type", { required: "Property type is required" })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                                    <Label htmlFor="available_from">Available From <span className="text-destructive">*</span></Label>
                                    <Input 
                                        id="available_from" 
                                        type="date"
                                        {...register("available_from", { required: "Availability date is required" })}
                                        className={errors.available_from ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {errors.available_from && <p className="text-[11px] text-destructive mt-1">{errors.available_from.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Location Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold tracking-tight">Location Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="address">Street Address <span className="text-destructive">*</span></Label>
                                    <Input 
                                        id="address" 
                                        placeholder="123 Main St, Apt 4B" 
                                        {...register("address", { required: "Address is required" })}
                                        className={errors.address ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {errors.address && <p className="text-[11px] text-destructive mt-1">{errors.address.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                                    <Input id="city" {...register("city", { required: "City is required" })} className={errors.city ? "border-destructive" : ""} />
                                    {errors.city && <p className="text-[11px] text-destructive mt-1">{errors.city.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">State/Region <span className="text-destructive">*</span></Label>
                                    <Input id="state" {...register("state", { required: "State is required" })} className={errors.state ? "border-destructive" : ""} />
                                    {errors.state && <p className="text-[11px] text-destructive mt-1">{errors.state.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="zip_code">ZIP / Postal Code <span className="text-destructive">*</span></Label>
                                    <Input id="zip_code" {...register("zip_code", { required: "ZIP is required" })} className={errors.zip_code ? "border-destructive" : ""} />
                                    {errors.zip_code && <p className="text-[11px] text-destructive mt-1">{errors.zip_code.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                                    <Input id="country" {...register("country", { required: "Country is required" })} className={errors.country ? "border-destructive" : ""} />
                                </div>
                            </div>
                        </div>

                        {/* Specifications & Pricing */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold tracking-tight">Specifications & Pricing</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="space-y-2 lg:col-span-1">
                                    <Label htmlFor="bedrooms">Bedrooms <span className="text-destructive">*</span></Label>
                                    <Input id="bedrooms" type="number" min="0" {...register("bedrooms", { required: "Required", valueAsNumber: true })} className={errors.bedrooms ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2 lg:col-span-1">
                                    <Label htmlFor="bathrooms">Bathrooms <span className="text-destructive">*</span></Label>
                                    <Input id="bathrooms" type="number" min="0" step="0.5" {...register("bathrooms", { required: "Required", valueAsNumber: true })} className={errors.bathrooms ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2 lg:col-span-1">
                                    <Label htmlFor="area_sqft">Area (Sq. Ft.) <span className="text-destructive">*</span></Label>
                                    <Input id="area_sqft" type="number" min="0" {...register("area_sqft", { required: "Required", valueAsNumber: true })} className={errors.area_sqft ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2 lg:col-span-1">
                                    <Label htmlFor="monthly_rent">Monthly Rent (₹) <span className="text-destructive">*</span></Label>
                                    <Input id="monthly_rent" type="number" min="0" {...register("monthly_rent", { required: "Required", valueAsNumber: true })} className={errors.monthly_rent ? "border-destructive" : ""} />
                                </div>
                                <div className="space-y-2 lg:col-span-1">
                                    <Label htmlFor="security_deposit">Security Deposit (₹) <span className="text-destructive">*</span></Label>
                                    <Input id="security_deposit" type="number" min="0" {...register("security_deposit", { required: "Required", valueAsNumber: true })} className={errors.security_deposit ? "border-destructive" : ""} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/40 flex justify-end gap-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => go({ to: "/dashboard", type: "push" })}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Publish Listing"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};