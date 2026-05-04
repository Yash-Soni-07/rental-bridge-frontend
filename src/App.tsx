// src/App.tsx
import { Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider, {
    DocumentTitleHandler,
    UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router";
import "./App.css";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";
import { dataProvider } from "./providers/data";
import { authProvider } from "./providers/auth";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { AuthenticatedLayout } from "./pages/layout/AuthenticatedLayout";
import { PropertyList } from "./pages/properties/PropertyList";
import { PropertyShow } from "./pages/properties/PropertyShow";
import { PropertyCreate } from "./pages/properties/PropertyCreate";
import { PropertyEdit } from "./pages/properties/PropertyEdit";
import { ApplicationCreate } from "./pages/applications/ApplicationCreate";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { BookingList } from "./pages/bookings/BookingList";
import { PaymentList } from "./pages/payments/PaymentList";
import { MaintenanceList } from "./pages/maintenance/MaintenanceList";
import { MaintenanceCreate } from "./pages/maintenance/MaintenanceCreate";

function App() {
    return (
        // @ts-expect-error - React Router v6 types don't officially support 'future' prop on BrowserRouter, but it is required at runtime to silence v7 console warnings.
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <RefineKbarProvider>
                <ThemeProvider>
                    <DevtoolsProvider>
                        <Refine
                            dataProvider={dataProvider}
                            authProvider={authProvider}
                            notificationProvider={useNotificationProvider()}
                            routerProvider={routerProvider}
                            options={{
                                syncWithLocation: true,
                                warnWhenUnsavedChanges: true,
                                projectId: "eWoIiM-xINDLu-iDFkQy",
                                title: { text: "Rental Bridge" },
                            }}
                        >
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />

                                <Route
                                    element={
                                        <AuthenticatedLayout>
                                            <Outlet />
                                        </AuthenticatedLayout>
                                    }
                                >
                                    {/* Properties */}
                                    <Route path="/properties" element={<PropertyList />} />
                                    <Route path="/properties/new" element={<PropertyCreate />} />
                                    <Route path="/properties/:id" element={<PropertyShow />} />
                                    <Route path="/properties/:id/edit" element={<PropertyEdit />} />

                                    {/* Dashboard */}
                                    <Route path="/dashboard" element={<Dashboard />} />

                                    {/* Applications */}
                                    <Route path="/applications/new" element={<ApplicationCreate />} />

                                    {/* Bookings */}
                                    <Route path="/bookings" element={<BookingList />} />

                                    {/* Payments */}
                                    <Route path="/payments" element={<PaymentList />} />

                                    {/* Maintenance */}
                                    <Route path="/maintenance" element={<MaintenanceList />} />
                                    <Route path="/maintenance/new" element={<MaintenanceCreate />} />
                                </Route>

                                <Route path="/" element={<Navigate to="/properties" />} />
                                <Route path="*" element={<Navigate to="/properties" />} />
                            </Routes>
                            <Toaster />
                            <RefineKbar />
                            <UnsavedChangesNotifier />
                            <DocumentTitleHandler
                                handler={({ action, resource, pathname }) => {
                                    const baseTitle = "Rental Bridge - Connecting Landlords and Tenants";
                                    if (pathname === "/" || pathname === "/dashboard") return `Dashboard | ${baseTitle}`;
                                    if (pathname === "/login") return `Login | ${baseTitle}`;
                                    if (pathname === "/register") return `Register | ${baseTitle}`;
                                    if (pathname === "/bookings") return `Bookings | ${baseTitle}`;
                                    if (pathname === "/payments") return `Payments | ${baseTitle}`;
                                    if (pathname === "/maintenance") return `Maintenance | ${baseTitle}`;
                                    if (pathname === "/maintenance/new") return `New Request | ${baseTitle}`;
                                    if (resource) {
                                        const resourceName = resource.meta?.label || resource.name || "";
                                        const formattedResource = resourceName
                                            ? resourceName.charAt(0).toUpperCase() + resourceName.slice(1)
                                            : "";
                                        if (formattedResource) {
                                            switch (action) {
                                                case "list": return `All ${formattedResource} | ${baseTitle}`;
                                                case "show": return `${formattedResource} Details | ${baseTitle}`;
                                                case "create": return `Add New ${formattedResource} | ${baseTitle}`;
                                                case "edit": return `Edit ${formattedResource} | ${baseTitle}`;
                                                default: return `${formattedResource} | ${baseTitle}`;
                                            }
                                        }
                                    }
                                    if (pathname && pathname !== "/") {
                                        const pathParts = pathname.split("/").filter(Boolean);
                                        if (pathParts.length > 0) {
                                            const rawName = pathParts[0];
                                            const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                                            if (pathParts.length > 1 && pathParts[1] === "new") return `Add New ${formattedName} | ${baseTitle}`;
                                            if (pathParts.length > 1 && pathParts[1] === "edit") return `Edit ${formattedName} | ${baseTitle}`;
                                            return `${formattedName} | ${baseTitle}`;
                                        }
                                    }
                                    return baseTitle;
                                }}
                            />
                        </Refine>
                        <DevtoolsPanel />
                    </DevtoolsProvider>
                </ThemeProvider>
            </RefineKbarProvider>
        </BrowserRouter>
    );
}

export default App;
