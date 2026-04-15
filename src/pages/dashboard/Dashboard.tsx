import React from "react";
import { useList, usePermissions, useGetIdentity, useUpdate, useGo } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { User } from "@/types";

interface Application {
    id: number;
    property_id: number;
    applicant_id: number;
    status: "pending" | "approved" | "rejected" | "withdrawn";
    monthly_income: string;
    employment_status: string;
    move_in_date: string;
}

export const Dashboard: React.FC = () => {
    const go = useGo();
    const { data: role, isLoading: permissionsLoading } = usePermissions<string>({});
    const { data: user, isLoading: identityLoading } = useGetIdentity<User>();
    const { mutate: updateApplication } = useUpdate();

    /** * Resource Resolver:
     * Tenants fetch their specific applications.
     * Landlords/Admins fetch the global list (filtered by backend logic).
     */
    const getResource = () => {
        if (!role || !user?.id) return null;
        if (role === "tenant") return `applications/tenant/${user.id}`;
        return "applications";
    };

    const resourcePath = getResource();

    const { result, query } = useList<Application>({
        resource: resourcePath ?? "",
        queryOptions: {
            enabled: !!resourcePath && !permissionsLoading && !identityLoading
        },
    });

    const handleStatusUpdate = (id: number, newStatus: "approved" | "rejected") => {
        updateApplication({
            resource: "applications",
            id,
            values: { status: newStatus },
            successNotification: {
                message: `Application #${id} has been ${newStatus}.`,
                type: "success"
            }
        });
    };

    if (permissionsLoading || identityLoading || query.isLoading) {
        return (
            <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-[220px] w-full rounded-xl" />)}
            </div>
        );
    }

    const getStatusBadge = (status: Application["status"]) => {
        const variants = {
            pending: "secondary",
            approved: "default",
            rejected: "destructive",
            withdrawn: "outline"
        } as const;
        return <Badge variant={variants[status] || "outline"} className="capitalize">{status}</Badge>;
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            <header>
                <h1 className="text-4xl font-extrabold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Welcome back, <span className="font-semibold text-foreground">{user?.email}</span>.
                    You are viewing as <Badge className="ml-1 capitalize">{role}</Badge>
                </p>
            </header>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">
                        {role === "tenant" ? "Your Submissions" : "Incoming Applications"}
                    </h2>
                    <div className="text-sm text-muted-foreground">
                        Showing {result?.data.length || 0} applications
                    </div>
                </div>

                {result?.data.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 bg-muted/10 border-dashed">
                        <p className="text-muted-foreground">No applications to display.</p>
                        {role === "tenant" && (
                            <Button variant="link" onClick={() => go({ to: "/properties", type: "push" })}>
                                Browse properties to apply
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {result?.data.map((app) => (
                            <Card key={app.id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-medium">Application #{app.id}</CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            Property ID: <span className="text-foreground font-mono">{app.property_id}</span>
                                        </p>
                                    </div>
                                    {getStatusBadge(app.status)}
                                </CardHeader>

                                <CardContent className="flex-1 text-sm space-y-3">
                                    <div className="flex justify-between items-center py-1 border-b border-muted">
                                        <span className="text-muted-foreground">Applicant Income</span>
                                        <span className="font-bold text-green-600">₹{parseFloat(app.monthly_income).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-muted">
                                        <span className="text-muted-foreground">Employment</span>
                                        <span className="capitalize">{app.employment_status}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-muted">
                                        <span className="text-muted-foreground">Move-in Date</span>
                                        <span>{new Date(app.move_in_date).toLocaleDateString()}</span>
                                    </div>
                                </CardContent>

                                {/* Management Actions: Visible only to Landlords/Admins for Pending apps */}
                                {(role === "landlord" || role === "admin") && app.status === "pending" && (
                                    <CardFooter className="grid grid-cols-2 gap-3 pt-4 border-t bg-muted/5">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => handleStatusUpdate(app.id, "approved")}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => handleStatusUpdate(app.id, "rejected")}
                                        >
                                            Reject
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};