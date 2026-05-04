// src/pages/layout/AuthenticatedLayout.tsx
import { ReactNode, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarContent } from "./Sidebar";

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

const SIDEBAR_W_EXPANDED = "w-[240px]";
const SIDEBAR_W_COLLAPSED = "w-[64px]";

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-background">
            {/* ── Desktop Sidebar ── */}
            <aside
                className={`
                    hidden md:flex flex-col flex-shrink-0
                    border-r bg-card transition-all duration-200
                    ${collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED}
                    relative
                `}
            >
                <SidebarContent collapsed={collapsed} />

                {/* Collapse toggle button */}
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="
                        absolute -right-3 top-[72px] z-10
                        h-6 w-6 rounded-full border bg-background shadow-md
                        flex items-center justify-center
                        hover:bg-accent transition-colors cursor-pointer
                    "
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed
                        ? <ChevronRight className="h-3 w-3" />
                        : <ChevronLeft className="h-3 w-3" />
                    }
                </button>
            </aside>

            {/* ── Mobile Sheet ── */}
            <div className="md:hidden fixed top-3 left-3 z-50">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Open navigation">
                            <Menu className="h-4 w-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[260px] p-0">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Navigation</SheetTitle>
                            <SheetDescription>App navigation menu</SheetDescription>
                        </SheetHeader>
                        <SidebarContent onNavigate={() => setMobileOpen(false)} />
                    </SheetContent>
                </Sheet>
            </div>

            {/* ── Page content ── */}
            <main className="flex-1 overflow-auto">
                {/* Spacer for mobile menu button */}
                <div className="md:hidden h-14" />
                {children}
            </main>
        </div>
    );
};
