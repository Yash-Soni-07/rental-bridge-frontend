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
import { AuthenticatedLayout } from "./pages/layout/AuthenticatedLayout";
import { PropertyList } from "./pages/properties/PropertyList";
import { PropertyShow } from "./pages/properties/PropertyShow";
import { ApplicationCreate } from "./pages/applications/ApplicationCreate";
import { Dashboard } from "./pages/dashboard/Dashboard";

function App() {
    return (
        <BrowserRouter>
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
                            }}
                        >
                            <Routes>
                                <Route path="/login" element={<Login />} />

                                {/* Everything inside this Route element will now have
                                    the Nav Bar from AuthenticatedLayout
                                */}
                                <Route
                                    element={
                                        <AuthenticatedLayout>
                                            <Outlet />
                                        </AuthenticatedLayout>
                                    }
                                >
                                    <Route path="/properties" element={<PropertyList />} />
                                    <Route path="/properties/:id" element={<PropertyShow />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/applications/new" element={<ApplicationCreate />} />
                                </Route>

                                <Route path="/" element={<Navigate to="/properties" />} />
                                <Route path="*" element={<Navigate to="/properties" />} />
                            </Routes>
                            <Toaster />
                            <RefineKbar />
                            <UnsavedChangesNotifier />
                            <DocumentTitleHandler />
                        </Refine>
                        <DevtoolsPanel />
                    </DevtoolsProvider>
                </ThemeProvider>
            </RefineKbarProvider>
        </BrowserRouter>
    );
}

export default App;