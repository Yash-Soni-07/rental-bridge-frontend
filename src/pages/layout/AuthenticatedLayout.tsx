// src/pages/layout/AuthenticatedLayout.tsx
import { ReactNode } from "react";
import { useLogout, useGetIdentity, useGo } from "@refinedev/core"; // Added useGo
import { Button } from "@/components/ui/button";

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
    const { mutate: logout } = useLogout();
    const { data: user } = useGetIdentity();
    const go = useGo(); // Initialize useGo

    const handleNav = (path: string) => {
        go({ to: path, type: "push" });
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b bg-background px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold cursor-pointer" onClick={() => handleNav("/")}>
                        Rental Bridge
                    </h1>
                    <button
                        onClick={() => handleNav("/properties")}
                        className="text-sm hover:underline bg-transparent border-none cursor-pointer"
                    >
                        Properties
                    </button>
                    <button
                        onClick={() => handleNav("/dashboard")}
                        className="text-sm hover:underline bg-transparent border-none cursor-pointer"
                    >
                        Dashboard
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        {user?.name || user?.email}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => logout()}>
                        Logout
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-6">{children}</main>
        </div>
    );
};