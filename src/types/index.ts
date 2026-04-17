// src/types/index.ts
export interface User {
    id: number;
    email: string;
    name: string;         // Refine identity display name (mapped from full_name in authProvider)
    full_name: string;    // Backend field: users.full_name
    username: string;     // Backend field: users.username
    role: "admin" | "landlord" | "tenant";
    is_active?: boolean;
    is_verified?: boolean;
    profile_image?: string | null;
}

export interface Property {
    id: number;
    title: string;
    description: string;
    price: number;
    address: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    owner_id: number;
    created_at: string;
    updated_at: string;
}
// ... User and Property interfaces remain the same

// src/types/index.ts

export interface Application {
    id: number;
    property_id: number;
    applicant_id: number;
    move_in_date: string;
    monthly_income: string; // Drizzle numeric returns string
    employment_status: string;
    references?: string;
    status: "pending" | "approved" | "rejected" | "withdrawn";
    created_at: string;
    updated_at: string;
    // property?: Property; // Commented out because backend doesn't send it yet
}