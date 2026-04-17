// src/pages/layout/AuthenticatedLayout.tsx
import { ReactNode, useState } from "react";
import { useLogout, useGetIdentity, useGo, usePermissions } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "@/types";

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

// Hamburger icon (inline SVG, no extra deps)
const HamburgerIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
    const { mutate: logout } = useLogout();
    const { data: user } = useGetIdentity<User>();
    const { data: role } = usePermissions<string>({});
    const go = useGo();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleNav = (path: string) => {
        setMobileOpen(false);
        go({ to: path, type: "push" });
    };

    // Derive initials for Avatar
    const initials = user?.full_name
        ? user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        : (user?.email?.[0] ?? "U").toUpperCase();

    const displayName = user?.full_name || user?.email || "User";

    // Role-aware nav links
    const navLinks = [
        { label: "Properties", path: "/properties", always: true },
        { label: "Dashboard", path: "/dashboard", always: true },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* ── Navbar ── */}
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">

                    {/* Left: Logo + Desktop Nav */}
                    <div className="flex items-center gap-6">
                        {/* Brand */}
                        <button
                            onClick={() => handleNav("/properties")}
                            className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
                        >
                            Rental Bridge
                        </button>

                        {/* Desktop nav links — hidden on mobile */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <button
                                    key={link.path}
                                    onClick={() => handleNav(link.path)}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    {link.label}
                                </button>
                            ))}
                            {/* Landlord-only: Add Property shortcut */}
                            {role === "landlord" && (
                                <button
                                    onClick={() => handleNav("/properties/new")}
                                    className="text-sm font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-md hover:bg-primary/10 transition-colors bg-transparent border-none cursor-pointer"
                                >
                                    + Add Property
                                </button>
                            )}
                        </nav>
                    </div>

                    {/* Right: Theme Toggle + Avatar dropdown + Mobile hamburger */}
                    <div className="flex items-center gap-2">
                        <ModeToggle />

                        {/* Desktop: Avatar dropdown */}
                        <div className="hidden md:block">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 rounded-full hover:bg-accent px-2 py-1 transition-colors bg-transparent border-none cursor-pointer">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                            <p className="text-sm font-medium leading-none">{displayName}</p>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuLabel className="flex flex-col gap-1">
                                        <span className="text-sm font-medium">{displayName}</span>
                                        <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                                        {role && (
                                            <Badge variant="secondary" className="capitalize w-fit text-xs mt-1">
                                                {role}
                                            </Badge>
                                        )}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleNav("/dashboard")}>
                                        Dashboard
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleNav("/properties")}>
                                        Browse Properties
                                    </DropdownMenuItem>
                                    {role === "landlord" && (
                                        <DropdownMenuItem onClick={() => handleNav("/properties/new")}>
                                            Add Property
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => logout()}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Mobile: Hamburger Sheet */}
                        <div className="md:hidden">
                            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Open menu">
                                        <HamburgerIcon />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[280px] p-0">
                                    <SheetHeader className="px-6 pt-6 pb-4">
                                        <SheetTitle className="text-left text-lg font-bold">
                                            Rental Bridge
                                        </SheetTitle>
                                        <SheetDescription className="sr-only">
                                            Navigation Menu
                                        </SheetDescription>
                                        {/* User info inside sheet */}
                                        <div className="flex items-center gap-3 mt-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="text-sm font-semibold bg-primary text-primary-foreground">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{displayName}</p>
                                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                                                {role && (
                                                    <Badge variant="secondary" className="capitalize text-xs mt-0.5">
                                                        {role}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </SheetHeader>
                                    <Separator />
                                    {/* Mobile nav links */}
                                    <nav className="flex flex-col px-3 py-4 gap-1">
                                        {navLinks.map((link) => (
                                            <button
                                                key={link.path}
                                                onClick={() => handleNav(link.path)}
                                                className="w-full text-left text-sm font-medium px-3 py-2.5 rounded-md hover:bg-accent transition-colors bg-transparent border-none cursor-pointer"
                                            >
                                                {link.label}
                                            </button>
                                        ))}
                                        {role === "landlord" && (
                                            <button
                                                onClick={() => handleNav("/properties/new")}
                                                className="w-full text-left text-sm font-medium text-primary px-3 py-2.5 rounded-md hover:bg-primary/10 transition-colors bg-transparent border-none cursor-pointer"
                                            >
                                                + Add Property
                                            </button>
                                        )}
                                    </nav>
                                    <Separator />
                                    <div className="px-3 py-4">
                                        <button
                                            onClick={() => { setMobileOpen(false); logout(); }}
                                            className="w-full text-left text-sm font-medium text-destructive px-3 py-2.5 rounded-md hover:bg-destructive/10 transition-colors bg-transparent border-none cursor-pointer"
                                        >
                                            Log out
                                        </button>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Page content ── */}
            <main className="flex-1">{children}</main>
        </div>
    );
};