/**
 * formatPrice.ts
 * Price formatting utilities for Indian currency display.
 * All values stored in DB as exact INR numbers — these helpers make them
 * human-readable in the UI.
 */

/**
 * Format an INR number (stored as exact rupees) for display.
 * Examples:
 *   12300000  → "₹1.23 Cr"
 *   9900000   → "₹99 L"
 *   450000    → "₹4.5 L"
 *   12500     → "₹12,500"
 */
export function formatINR(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return "—";
    const n = typeof value === "string" ? parseFloat(value) : value;
    if (!isFinite(n)) return "—";

    if (n >= 10_000_000) {
        const cr = n / 10_000_000;
        return `₹${parseFloat(cr.toFixed(2))} Cr`;
    }
    if (n >= 100_000) {
        const l = n / 100_000;
        return `₹${parseFloat(l.toFixed(2))} L`;
    }
    return `₹${n.toLocaleString("en-IN")}`;
}

/**
 * Format price_in_cr (already stored in Crores) for display.
 * Examples:
 *   1.23  → "₹1.23 Cr"
 *   0.99  → "₹99 L"
 *   0.45  → "₹45 L"
 *   0.03  → "₹3 L"
 */
export function formatCr(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return "—";
    const cr = typeof value === "string" ? parseFloat(value) : value;
    if (!isFinite(cr)) return "—";

    if (cr >= 1) {
        return `₹${parseFloat(cr.toFixed(2))} Cr`;
    }
    const lakhs = cr * 100;
    return `₹${parseFloat(lakhs.toFixed(2))} L`;
}

/**
 * Format a monthly rent figure (INR) for display.
 * Examples:
 *   24750   → "₹24,750/mo"
 *   125000  → "₹1.25 L/mo"
 *   8200    → "₹8,200/mo"
 */
export function formatRent(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return "—";
    const n = typeof value === "string" ? parseFloat(value) : value;
    if (!isFinite(n)) return "—";

    if (n >= 100_000) {
        const l = n / 100_000;
        return `₹${parseFloat(l.toFixed(2))} L/mo`;
    }
    return `₹${n.toLocaleString("en-IN")}/mo`;
}

/**
 * Format a per-sqft rate for display.
 * Examples:
 *   10123  → "₹10,123/sqft"
 *   4377   → "₹4,377/sqft"
 */
export function formatPerSqft(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return "—";
    const n = typeof value === "string" ? parseFloat(value) : value;
    if (!isFinite(n)) return "—";
    return `₹${Math.round(n).toLocaleString("en-IN")}/sqft`;
}
