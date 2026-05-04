// src/pages/layout/Sidebar.tsx
import { useState } from "react";
import { useLocation } from "react-router";
import { useLogout, useGetIdentity, useGo, usePermissions } from "@refinedev/core";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Building2,
    LayoutDashboard,
    CalendarCheck,
    CreditCard,
    Wrench,
    PlusCircle,
    LogOut,
    Menu,
    ChevronLeft,
    ChevronRight,
    Home,
} from "lucide-react";
import { User } from "@/types";

interface NavItem {
    label: string;
    path: string;
    icon: React.ElementType;
    color: string;           // tailwind text color class
    bgColor: string;         // tailwind bg color class for active
    roles: ("admin" | "landlord" | "tenant" | "all")[];
}

const NAV_ITEMS: NavItem[] = [
    {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        color: "text-violet-500",
        bgColor: "bg-violet-500/10",
        roles: ["all"],
    },
    {
        label: "Properties",
        path: "/properties",
        icon: Building2,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        roles: ["all"],
    },
    {
        label: "My Bookings",
        path: "/bookings",
        icon: CalendarCheck,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        roles: ["tenant", "admin"],
    },
    {
        label: "Bookings",
        path: "/bookings",
        icon: CalendarCheck,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        roles: ["landlord"],
    },
    {
        label: "Payments",
        path: "/payments",
        icon: CreditCard,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        roles: ["all"],
    },
    {
        label: "Maintenance",
        path: "/maintenance",
        icon: Wrench,
        color: "text-rose-500",
        bgColor: "bg-rose-500/10",
        roles: ["all"],
    },
    {
        label: "Add Property",
        path: "/properties/new",
        icon: PlusCircle,
        color: "text-primary",
        bgColor: "bg-primary/10",
        roles: ["landlord"],
    },
];

function useFilteredNav(role: string | null | undefined) {
    return NAV_ITEMS.filter((item) => {
        if (item.roles.includes("all")) return true;
        if (!role) return false;
        return item.roles.includes(role as any);
    }).filter((item, index, arr) => {
        // Deduplicate "Bookings" — only show one entry per path for the current role
        return arr.findIndex((i) => i.path === item.path && i.label === item.label) === index;
    });
}

interface SidebarContentProps {
    collapsed?: boolean;
    onNavigate?: () => void;
}

export function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
    const location = useLocation();
    const go = useGo();
    const { mutate: logout } = useLogout();
    const { data: user } = useGetIdentity<User>();
    const { data: role } = usePermissions<string>({});

    const navItems = useFilteredNav(role);

    const initials = user?.full_name
        ? user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        : (user?.email?.[0] ?? "U").toUpperCase();

    const displayName = user?.full_name || user?.email || "User";

    const handleNav = (path: string) => {
        onNavigate?.();
        go({ to: path, type: "push" });
    };

    const isActive = (path: string) => {
        if (path === "/properties") {
            // Active on /properties but NOT on /properties/new or /properties/:id
            return location.pathname === "/properties";
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Brand header */}
            <div
                className={`flex items-center gap-3 px-4 py-5 ${collapsed ? "justify-center" : ""}`}
            >
                <div className="flex-shrink-0 p-1.5 bg-primary rounded-lg">
                    <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                {!collapsed && (
                    <span className="text-base font-bold tracking-tight truncate">
                        Rental Bridge
                    </span>
                )}
            </div>

            <Separator />

            {/* User info */}
            {!collapsed && (
                <div className="px-4 py-4 flex items-center gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        {role && (
                            <Badge variant="secondary" className="capitalize text-[10px] mt-0.5 h-4 px-1.5">
                                {role}
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {collapsed && (
                <div className="px-2 py-3 flex justify-center">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>
            )}

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <button
                            key={`${item.path}-${item.label}`}
                            onClick={() => handleNav(item.path)}
                            title={collapsed ? item.label : undefined}
                            className={`
                                w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                                transition-all duration-150 cursor-pointer border-none
                                ${active
                                    ? `${item.bgColor} ${item.color} shadow-sm`
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                }
                                ${collapsed ? "justify-center px-2" : ""}
                            `}
                        >
                            <Icon
                                className={`h-4 w-4 flex-shrink-0 ${active ? item.color : ""}`}
                            />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            <Separator />

            {/* Bottom controls */}
            <div className={`px-2 py-3 flex items-center ${collapsed ? "flex-col gap-2" : "gap-2"}`}>
                <ModeToggle />
                <button
                    onClick={() => logout()}
                    title="Log out"
                    className={`
                        flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
                        text-destructive hover:bg-destructive/10 transition-colors cursor-pointer
                        border-none bg-transparent
                        ${collapsed ? "justify-center px-2 w-full" : "flex-1"}
                    `}
                >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span>Log out</span>}
                </button>
            </div>
        </div>
    );
}
