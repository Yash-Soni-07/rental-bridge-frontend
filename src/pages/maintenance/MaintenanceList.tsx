// src/pages/maintenance/MaintenanceList.tsx
import React, { useState } from "react";
import { useList, useUpdate, useDelete, useGetIdentity, usePermissions, useGo } from "@refinedev/core";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wrench, AlertTriangle, Clock, CheckCircle2, PlusCircle, Trash2, RefreshCw } from "lucide-react";
import { MaintenanceRequest, User } from "@/types";

const PRIORITY_STYLES: Record<string, string> = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    emergency: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    open: <Clock className="h-4 w-4 text-amber-500" />,
    in_progress: <RefreshCw className="h-4 w-4 text-blue-500" />,
    resolved: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    closed: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
};

const STATUS_LABEL: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
};

export const MaintenanceList: React.FC = () => {
    const go = useGo();
    const { data: user, isLoading: userLoading } = useGetIdentity<User>();
    const { data: role, isLoading: roleLoading } = usePermissions<string>({});
    const { mutate: updateRequest } = useUpdate();
    const { mutate: deleteRequest } = useDelete();

    const resourcePath = React.useMemo(() => {
        if (!user?.id || !role) return null;
        if (role === "tenant") return `maintenance/tenant/${user.id}`;
        return "maintenance";
    }, [user?.id, role]);

    const { result, query } = useList<MaintenanceRequest>({
        resource: resourcePath ?? "",
        queryOptions: { enabled: !!resourcePath },
    });

    const isLoading = userLoading || roleLoading || query.isLoading;

    const handleStatusChange = (id: number, status: string) => {
        updateRequest({
            resource: "maintenance",
            id,
            values: { status },
            successNotification: { message: `Status updated to ${status}.`, type: "success" },
        });
    };

    const handleDelete = (id: number) => {
        deleteRequest({
            resource: "maintenance",
            id,
            successNotification: { message: "Request deleted.", type: "success" },
        });
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-56" />
                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
                </div>
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive">
                    <AlertDescription>Failed to load maintenance requests.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const requests = result?.data ?? [];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Wrench className="h-7 w-7 text-rose-500" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {role === "tenant" ? "My Maintenance Requests" : "All Maintenance Requests"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {requests.length} request{requests.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                {role === "tenant" && (
                    <Button
                        onClick={() => go({ to: "/maintenance/new", type: "push" })}
                        className="gap-2 self-start sm:self-auto"
                    >
                        <PlusCircle className="h-4 w-4" />
                        New Request
                    </Button>
                )}
            </div>

            {requests.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 border-dashed bg-muted/10">
                    <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium">No maintenance requests</p>
                    {role === "tenant" && (
                        <Button
                            variant="link"
                            className="mt-2"
                            onClick={() => go({ to: "/maintenance/new", type: "push" })}
                        >
                            Submit your first request
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {requests.map((req) => (
                        <Card key={req.id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base font-semibold truncate">
                                            {req.title}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Property #{req.property_id} · Request #{req.id}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${PRIORITY_STYLES[req.priority] ?? "bg-secondary text-secondary-foreground"}`}
                                    >
                                        {req.priority === "emergency" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                        {req.priority}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                    {STATUS_ICON[req.status]}
                                    <span className="text-sm text-muted-foreground">
                                        {STATUS_LABEL[req.status] ?? req.status}
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {req.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-3">
                                    Submitted {new Date(req.created_at).toLocaleDateString("en-IN")}
                                </p>
                            </CardContent>

                            {/* Admin/Landlord actions */}
                            {(role === "admin" || role === "landlord") && req.status !== "closed" && (
                                <CardFooter className="pt-3 border-t gap-2 flex-wrap">
                                    {req.status === "open" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            onClick={() => handleStatusChange(req.id, "in_progress")}
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1" /> In Progress
                                        </Button>
                                    )}
                                    {(req.status === "open" || req.status === "in_progress") && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                            onClick={() => handleStatusChange(req.id, "resolved")}
                                        >
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(req.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </CardFooter>
                            )}

                            {/* Tenant: cancel open request */}
                            {role === "tenant" && req.status === "open" && (
                                <CardFooter className="pt-3 border-t">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-destructive border-destructive/30"
                                        onClick={() => handleStatusChange(req.id, "closed")}
                                    >
                                        Cancel Request
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
