import { ReactNode } from "react";
import { useLogout, useGetIdentity } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
    const { mutate: logout } = useLogout();
    const { data: user } = useGetIdentity();

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b bg-background px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold">Rental Bridge</h1>
                    <Link to="/properties" className="text-sm hover:underline">
                        Properties
                    </Link>
                    <Link to="/dashboard" className="text-sm hover:underline">
                        Dashboard
                    </Link>
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