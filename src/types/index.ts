// src/types/index.ts
export interface User {
    id: number;
    email: string;
    name: string;
    role: "admin" | "landlord" | "tenant";
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

export interface Application {
    id: number;
    property_id: number;
    applicant_id: number;
    move_in_date: string;
    monthly_income: number;
    employment_status: string;
    references?: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    updated_at: string;
}