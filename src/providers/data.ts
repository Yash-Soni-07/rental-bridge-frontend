import { DataProvider, BaseKey } from "@refinedev/core";

const API_URL = "http://localhost:3000/api";

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
    const response = await fetch(url, {
        ...options,
        headers: { ...getHeaders(), ...options.headers },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
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