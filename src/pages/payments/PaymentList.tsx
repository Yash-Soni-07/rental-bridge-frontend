// src/pages/payments/PaymentList.tsx
import React, { useState } from "react";
import { useList, useGetIdentity, usePermissions } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { CreditCard, Search, IndianRupee, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Payment, Booking, User } from "@/types";

const PAYMENT_STATUS_ICON: Record<string, React.ReactNode> = {
    paid: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    pending: <Clock className="h-4 w-4 text-amber-500" />,
    overdue: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

const PAYMENT_STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    paid: "default",
    pending: "secondary",
    overdue: "destructive",
};

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatCurrency(amount: string | number) {
    return `₹${Number(amount).toLocaleString("en-IN")}`;
}

/**
 * Strategy:
 * - For tenants: fetch their bookings first, then all payments per booking
 * - For landlord/admin: fetch all payments directly from /payments
 *
 * Since the backend has /payments (admin list) we use that for admin.
 * Tenants use /bookings/tenant/:id → then /payments/booking/:bookingId per booking.
 *
 * To keep it simple and avoid N+1 waterfalls we show payments differently per role:
 * - Tenant: list bookings → expand to show payments inline
 * - Admin/Landlord: direct /payments list
 */
export const PaymentList: React.FC = () => {
    const { data: user, isLoading: userLoading } = useGetIdentity<User>();
    const { data: role, isLoading: roleLoading } = usePermissions<string>({});
    const [search, setSearch] = useState("");

    const isAdmin = role === "admin" || role === "landlord";
    const isTenant = role === "tenant";

    // Fetch bookings for tenants
    const bookingsResource = user?.id && isTenant ? `bookings/tenant/${user.id}` : "";
    const { result: bookingsResult, query: bookingsQuery } = useList<Booking>({
        resource: bookingsResource,
        queryOptions: { enabled: !!bookingsResource },
    });

    // For admin/landlord, fetch all payments
    const { result: allPaymentsResult, query: allPaymentsQuery } = useList<Payment>({
        resource: "payments",
        queryOptions: { enabled: isAdmin },
    });

    const isLoading =
        userLoading ||
        roleLoading ||
        (isTenant && bookingsQuery.isLoading) ||
        (isAdmin && allPaymentsQuery.isLoading);

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
                </div>
            </div>
        );
    }

    // Tenant view: show bookings as grouped containers
    if (isTenant) {
        const bookings = bookingsResult?.data ?? [];
        return (
            <TenantPaymentView
                bookings={bookings}
                userId={user?.id}
                search={search}
                setSearch={setSearch}
            />
        );
    }

    // Admin/Landlord view: flat payment list
    const allPayments = (allPaymentsResult?.data ?? []).filter((p) => {
        const term = search.toLowerCase();
        return (
            !term ||
            String(p.id).includes(term) ||
            String(p.booking_id).includes(term) ||
            p.payment_type?.toLowerCase().includes(term) ||
            p.status?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <CreditCard className="h-7 w-7 text-amber-500" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">All Payments</h1>
                        <p className="text-sm text-muted-foreground">{allPayments.length} records</p>
                    </div>
                </div>
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by booking ID, type..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {allPayments.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 border-dashed bg-muted/10">
                    <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium">No payments found</p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {allPayments.map((payment) => (
                        <PaymentCard key={payment.id} payment={payment} />
                    ))}
                </div>
            )}
        </div>
    );
};

/** Tenant-specific view: show each booking with a nested payment fetcher */
function TenantPaymentView({
    bookings,
    userId,
    search,
    setSearch,
}: {
    bookings: Booking[];
    userId: number | undefined;
    search: string;
    setSearch: (s: string) => void;
}) {
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <CreditCard className="h-7 w-7 text-amber-500" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">My Payments</h1>
                        <p className="text-sm text-muted-foreground">Payments across your bookings</p>
                    </div>
                </div>
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search bookings..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {bookings.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 border-dashed bg-muted/10">
                    <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium">No bookings — no payments yet.</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {bookings.map((booking) => (
                        <BookingPaymentSection key={booking.id} booking={booking} />
                    ))}
                </div>
            )}
        </div>
    );
}

/** Fetches and renders payments for a single booking */
function BookingPaymentSection({ booking }: { booking: Booking }) {
    const { result, query } = useList<Payment>({
        resource: `payments/booking/${booking.id}`,
    });

    const payments = result?.data ?? [];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Booking #{booking.id} — Property {booking.property_id}
                </span>
                <div className="h-px flex-1 bg-border" />
            </div>
            {query.isLoading ? (
                <Skeleton className="h-32 rounded-xl" />
            ) : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">No payments recorded for this booking.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {payments.map((p) => <PaymentCard key={p.id} payment={p} />)}
                </div>
            )}
        </div>
    );
}

/** Reusable payment card */
function PaymentCard({ payment }: { payment: Payment }) {
    const statusIcon = PAYMENT_STATUS_ICON[payment.status] ?? null;
    const badgeVariant = PAYMENT_STATUS_BADGE[payment.status] ?? "outline";

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">
                        Payment #{payment.id}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                        {statusIcon}
                        <Badge variant={badgeVariant} className="capitalize text-xs">
                            {payment.status}
                        </Badge>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Booking #{payment.booking_id}
                </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-muted">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {Number(payment.amount).toLocaleString("en-IN")}
                    </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-muted">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize font-medium">{payment.payment_type}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-muted">
                    <span className="text-muted-foreground">Method</span>
                    <span className="capitalize">{payment.payment_method}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-muted">
                    <span className="text-muted-foreground">Due</span>
                    <span>{new Date(payment.due_date).toLocaleDateString("en-IN")}</span>
                </div>
                {payment.paid_date && (
                    <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">Paid On</span>
                        <span className="text-emerald-600 font-medium">
                            {new Date(payment.paid_date).toLocaleDateString("en-IN")}
                        </span>
                    </div>
                )}
                {payment.transaction_id && (
                    <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">Txn ID</span>
                        <span className="font-mono text-xs truncate max-w-[120px]" title={payment.transaction_id}>
                            {payment.transaction_id}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
