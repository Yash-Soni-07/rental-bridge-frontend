// src/pages/bookings/BookingList.tsx
import React from "react";
import { useList, useUpdate, useGetIdentity, usePermissions } from "@refinedev/core";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarCheck, Home, IndianRupee } from "lucide-react";
import { Booking, User } from "@/types";

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatCurrency(amount: string | number) {
    return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export const BookingList: React.FC = () => {
    const { data: user, isLoading: userLoading } = useGetIdentity<User>();
    const { data: role, isLoading: roleLoading } = usePermissions<string>({});
    const { mutate: updateBooking } = useUpdate();

    // Resolve resource path based on role
    const resourcePath = React.useMemo(() => {
        if (!user?.id || !role) return null;
        if (role === "tenant") return `bookings/tenant/${user.id}`;
        // landlord/admin get all bookings — backend returns them all
        return "bookings";
    }, [user?.id, role]);

    const { result, query } = useList<Booking>({
        resource: resourcePath ?? "",
        queryOptions: { enabled: !!resourcePath },
    });

    const handleCancel = (id: number) => {
        updateBooking({
            resource: "bookings",
            id,
            values: { status: "cancelled" },
            successNotification: { message: "Booking cancelled.", type: "success" },
        });
    };

    const handleConfirm = (id: number) => {
        updateBooking({
            resource: "bookings",
            id,
            values: { status: "confirmed" },
            successNotification: { message: "Booking confirmed.", type: "success" },
        });
    };

    const isLoading = userLoading || roleLoading || query.isLoading;

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
                </div>
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive">
                    <AlertDescription>Failed to load bookings. Please try again.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const bookings = result?.data ?? [];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <CalendarCheck className="h-7 w-7 text-emerald-500" />
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {role === "tenant" ? "My Bookings" : "All Bookings"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            {bookings.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 border-dashed bg-muted/10">
                    <CalendarCheck className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium">No bookings found</p>
                    {role === "tenant" && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Browse properties and get your application approved to book.
                        </p>
                    )}
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {bookings.map((booking) => (
                        <Card
                            key={booking.id}
                            className="flex flex-col shadow-sm hover:shadow-md transition-shadow"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <CardTitle className="text-sm font-semibold truncate">
                                            Booking #{booking.id}
                                        </CardTitle>
                                    </div>
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${STATUS_STYLES[booking.status] ?? "bg-secondary text-secondary-foreground"}`}
                                    >
                                        {booking.status}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Property ID: <span className="font-mono text-foreground">{booking.property_id}</span>
                                </p>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-2 text-sm">
                                <div className="flex justify-between items-center py-1 border-b border-muted">
                                    <span className="text-muted-foreground">Period</span>
                                    <span className="font-medium text-right text-xs">
                                        {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-muted">
                                    <span className="text-muted-foreground">Monthly Rent</span>
                                    <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                                        <IndianRupee className="h-3 w-3" />
                                        {Number(booking.monthly_rent).toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-muted">
                                    <span className="text-muted-foreground">Total Amount</span>
                                    <span className="font-medium">{formatCurrency(booking.total_amount)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-muted-foreground">Payment</span>
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PAYMENT_STATUS_STYLES[booking.payment_status] ?? "bg-secondary text-secondary-foreground"}`}
                                    >
                                        {booking.payment_status}
                                    </span>
                                </div>
                            </CardContent>

                            {/* Actions */}
                            {booking.status === "pending" && (
                                <CardFooter className="pt-3 border-t gap-2">
                                    {(role === "landlord" || role === "admin") && (
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleConfirm(booking.id)}
                                        >
                                            Confirm
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => handleCancel(booking.id)}
                                    >
                                        Cancel
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
