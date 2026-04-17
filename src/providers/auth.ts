import { AuthProvider } from "@refinedev/core";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const authProvider: AuthProvider = {
    // 1. REGISTRATION LOGIC
    // Inside src/providers/auth.ts -> register method

    register: async ({ name, username, email, password, role }) => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    username,
                    full_name: name, // Maps frontend 'name' to backend 'full_name'
                    password,
                    role
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: {
                        name: "RegisterError",
                        message: data.error || "Registration failed.",
                    },
                };
            }

            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            return {
                success: true,
                redirectTo: "/dashboard",
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    name: "NetworkError",
                    message: "Network error during registration.",
                },
            };
        }
    },

    login: async ({ email, password }) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: {
                        name: "LoginError",
                        message: data.error || "Invalid email or password",
                    },
                };
            }

            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            return {
                success: true,
                redirectTo: "/dashboard",
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    name: "NetworkError",
                    message: "Network error, please try again",
                },
            };
        }
    },

    logout: async () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        return {
            success: true,
            redirectTo: "/login",
        };
    },

    check: async () => {
        const token = localStorage.getItem("auth_token");
        if (token) {
            return {
                authenticated: true,
            };
        }
        return {
            authenticated: false,
            redirectTo: "/login",
        };
    },

    getPermissions: async () => {
        const user = localStorage.getItem("user");
        if (user) {
            const parsedUser = JSON.parse(user);
            return parsedUser.role; // "admin", "landlord", "tenant"
        }
        return null;
    },

    getIdentity: async () => {
        const user = localStorage.getItem("user");
        if (user) {
            return JSON.parse(user);
        }
        return null;
    },

    onError: async (error) => {
        if (error?.status === 401 || error?.response?.status === 401) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
            return {
                logout: true,
                redirectTo: "/login",
            };
        }
        return {};
    },
};