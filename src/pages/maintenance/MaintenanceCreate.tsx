// src/pages/maintenance/MaintenanceCreate.tsx
import React from "react";
import { useCreate, useGetIdentity, useGo, useList } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Wrench } from "lucide-react";
import { User, Booking } from "@/types";

interface MaintenanceFormData {
    property_id: number;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "emergency";
}

export const MaintenanceCreate: React.FC = () => {
    const go = useGo();
    const { data: user } = useGetIdentity<User>();
    const { mutate: createRequest, mutation } = useCreate();

    const isSubmitting = mutation.status === "pending";
    const serverError = mutation.error?.message;

    // Fetch tenant's active bookings so they can pick which property
    const { result: bookingsResult, query: bookingsQuery } = useList<Booking>({
        resource: user?.id ? `bookings/tenant/${user.id}` : "",
        queryOptions: { enabled: !!user?.id },
    });

    const activeBookings = (bookingsResult?.data ?? []).filter(
        (b) => b.status === "confirmed" || b.status === "pending"
    );

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<MaintenanceFormData>({
        defaultValues: { priority: "medium" },
    });

    const onSubmit = (data: MaintenanceFormData) => {
        if (!user?.id) return;
        createRequest(
            {
                resource: "maintenance",
                values: {
                    ...data,
                    property_id: Number(data.property_id),
                    tenant_id: user.id,
                },
            },
            {
                onSuccess: () => go({ to: "/maintenance", type: "push" }),
            }
        );
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
            <Button
                variant="ghost"
                onClick={() => go({ to: "/maintenance", type: "push" })}
                className="mb-6 -ml-4 text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Maintenance
            </Button>

            <Card className="shadow-lg border-border/50">
                <CardHeader className="pb-6 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-500/10 rounded-lg">
                            <Wrench className="h-6 w-6 text-rose-500" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">Submit Maintenance Request</CardTitle>
                            <CardDescription className="mt-1">
                                Describe the issue and we'll notify your landlord.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {serverError && (
                            <Alert variant="destructive">
                                <AlertDescription>{serverError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Property selector */}
                        <div className="space-y-2">
                            <Label htmlFor="property_id">
                                Property <span className="text-destructive">*</span>
                            </Label>
                            {bookingsQuery.isLoading ? (
                                <div className="h-10 rounded-md border border-input bg-muted animate-pulse" />
                            ) : activeBookings.length === 0 ? (
                                <Alert>
                                    <AlertDescription>
                                        You have no active bookings. Maintenance requests require an active booking.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <select
                                    id="property_id"
                                    {...register("property_id", { required: "Please select a property" })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <option value="">— Select Property —</option>
                                    {activeBookings.map((b) => (
                                        <option key={b.id} value={b.property_id}>
                                            Property #{b.property_id} (Booking #{b.id})
                                        </option>
                                    ))}
                                </select>
                            )}
                            {errors.property_id && (
                                <p className="text-xs text-destructive">{errors.property_id.message}</p>
                            )}
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                Issue Title <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="title"
                                placeholder="e.g., Leaking pipe in bathroom"
                                {...register("title", { required: "Title is required" })}
                                className={errors.title ? "border-destructive" : ""}
                            />
                            {errors.title && (
                                <p className="text-xs text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <Label htmlFor="priority">
                                Priority <span className="text-destructive">*</span>
                            </Label>
                            <select
                                id="priority"
                                {...register("priority", { required: "Priority is required" })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <option value="low">Low — Minor inconvenience</option>
                                <option value="medium">Medium — Affects daily use</option>
                                <option value="high">High — Urgent repair needed</option>
                                <option value="emergency">Emergency — Immediate danger</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">
                                Description <span className="text-destructive">*</span>
                            </Label>
                            <textarea
                                id="description"
                                rows={5}
                                placeholder="Provide as much detail as possible about the issue, when it started, and its impact..."
                                {...register("description", {
                                    required: "Description is required",
                                    minLength: { value: 20, message: "Please provide at least 20 characters" },
                                })}
                                className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${errors.description ? "border-destructive" : "border-input"}`}
                            />
                            {errors.description && (
                                <p className="text-xs text-destructive">{errors.description.message}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => go({ to: "/maintenance", type: "push" })}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || activeBookings.length === 0}
                                className="min-w-[160px]"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    "Submit Request"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
