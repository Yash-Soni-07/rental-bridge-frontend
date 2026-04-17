import { DataProvider, BaseKey } from "@refinedev/core";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Helper to get auth headers
const getHeaders = (): HeadersInit => {
    const token = localStorage.getItem("auth_token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// Generic request helper
const fetchJson = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem("auth_token");
    
    // Prevent unauthenticated network requests to known private endpoints
    // This stops the browser from logging 401 network errors during logout transitions
    const isPublicRoute = 
        (url.includes("/properties") && (!options.method || options.method === "GET")) || 
        url.includes("/auth/");
        
    if (!token && !isPublicRoute) {
        const error = new Error("Unauthorized: No token provided");
        (error as any).status = 401;
        throw error;
    }

    const response = await fetch(url, {
        ...options,
        headers: { ...getHeaders(), ...options.headers },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const error = new Error(errorData.error || `Request failed with status ${response.status}`);
        (error as any).status = response.status;
        throw error;
    }

    return response.json();
};

export const dataProvider: DataProvider = {
    getList: async ({ resource }) => {
        const url = `${API_URL}/${resource}`;
        const response = await fetchJson<any[]>(url);

        return {
            data: response,
            total: response.length,
        };
    },

    getOne: async ({ resource, id }) => {
        const url = `${API_URL}/${resource}/${id}`;
        const data = await fetchJson<any>(url);

        return {
            data,
        };
    },

    create: async ({ resource, variables }) => {
        const url = `${API_URL}/${resource}`;
        const data = await fetchJson<any>(url, {
            method: "POST",
            body: JSON.stringify(variables),
        });

        return {
            data,
        };
    },

    update: async ({ resource, id, variables }) => {
        const url = `${API_URL}/${resource}/${id}`;
        const data = await fetchJson<any>(url, {
            method: "PUT",
            body: JSON.stringify(variables),
        });

        return {
            data,
        };
    },

    deleteOne: async ({ resource, id }) => {
        const url = `${API_URL}/${resource}/${id}`;
        await fetchJson(url, { method: "DELETE" });

        return {
            data: {
                id,
            } as any, // ✅ required for generic compatibility
        };
    },

    getApiUrl: () => API_URL,
};