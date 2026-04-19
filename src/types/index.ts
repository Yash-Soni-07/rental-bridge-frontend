// src/types/index.ts

export interface User {
    id: number;
    email: string;
    name: string;         // Refine identity display name
    full_name: string;    // Backend field: users.full_name
    username: string;     // Backend field: users.username
    role: "admin" | "landlord" | "tenant";
    is_active?: boolean;
    is_verified?: boolean;
    profile_image?: string | null;
    
    // Aligned with app.ts
    phone?: string | null;
    address?: string | null;
    date_of_birth?: string | null;
}

export interface PropertyImage {
    id: number;
    property_id: number;
    image_url: string;
    is_primary: boolean;
    caption?: string | null;
    created_at: string;
}

export interface Property {
    id: number;
    title: string;
    description: string;
    address: string;
    bedrooms: number;
    bathrooms: number;
    owner_id: number;
    created_at: string;
    updated_at: string;

    // Legacy fields kept to prevent breaking existing UI components
    price?: number; 
    area?: number;  

    // --- Strictly aligned with backend app.ts ---
    property_type: "apartment" | "house" | "condo" | "studio" | "townhouse" | "villa";
    city: string;
    state: string;
    zip_code: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    area_sqft: number;
    monthly_rent: string | number; // Drizzle numeric returns string
    security_deposit: string | number;
    is_furnished?: boolean;
    pets_allowed?: boolean;
    smoking_allowed?: boolean;
    parking_available?: boolean;
    status?: "available" | "rented" | "maintenance" | "pending";
    available_from: string;
    lease_duration_months?: number;

    // Optional relation payload
    images?: PropertyImage[];
}

export interface Application {
    id: number;
    property_id: number;
    applicant_id: number;
    move_in_date: string;
    monthly_income: string | number; // Drizzle numeric returns string
    employment_status: string;
    references?: string | null;
    status: "pending" | "approved" | "rejected" | "withdrawn";
    created_at: string;
    updated_at: string;
    
    // Aligned with app.ts
    message?: string | null;
    previous_address?: string | null;
    
    // Relational fields (if backend populates them)
    property?: Property;
    applicant?: User;
}

export interface Booking {
    id: number;
    property_id: number;
    tenant_id: number;
    status: "pending" | "confirmed" | "cancelled" | "completed";
    start_date: string;
    end_date: string;
    monthly_rent: string | number;
    security_deposit: string | number;
    total_amount: string | number;
    payment_status: string;
    lease_document?: string | null;
    created_at: string;
    updated_at: string;
    
    // Relational fields
    property?: Property;
    tenant?: User;
}

export interface Payment {
    id: number;
    booking_id: number;
    amount: string | number;
    payment_type: string;
    payment_method: string;
    transaction_id?: string | null;
    status: string;
    due_date: string;
    paid_date?: string | null;
    created_at: string;
}

export interface MaintenanceRequest {
    id: number;
    property_id: number;
    tenant_id: number;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "emergency" | string;
    status: "open" | "in_progress" | "resolved" | "closed" | string;
    estimated_cost?: string | number | null;
    actual_cost?: string | number | null;
    assigned_to?: string | null;
    completed_date?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Review {
    id: number;
    property_id: number;
    reviewer_id: number;
    rating: number;
    title: string;
    comment?: string | null;
    is_verified: boolean;
    created_at: string;
}