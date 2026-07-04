import { useState } from "react";
import { Mail, Phone, User, MessageSquare, CheckCircle2, Send, Loader2 } from "lucide-react";
import type { ListingDetail } from "./useMapListings";

interface InquiryCardProps {
    property: ListingDetail;
}

export function InquiryCard({ property }: InquiryCardProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        if (!name || !phone || !email) {
            setError("Please fill out your name, phone, and email.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const baseUrl = import.meta.env.VITE_API_URL 
                ? import.meta.env.VITE_API_URL.replace(/\/api$/, "") 
                : "http://localhost:3000";

            const res = await fetch(`${baseUrl}/api/inquiries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    phone,
                    email,
                    message,
                    property: {
                        name: property.name,
                        type: property.property_type,
                        location: [property.locality, property.city].filter(Boolean).join(", "),
                        price: property.price_in_cr ? `${property.price_in_cr} Cr` : property.est_monthly_rent ? `₹${property.est_monthly_rent}/mo` : "Price on request",
                    }
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to send inquiry");
            }
            
            // If the backend sent a preview URL (because Ethereal was used), we can log it
            const data = await res.json();
            if (data.previewUrl) {
                console.log("Mock Email Preview URL:", data.previewUrl);
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="mx-6 mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-5 flex flex-col items-center text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">Inquiry Sent Successfully!</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    We've emailed you a confirmation and the owner has been notified.
                </p>
                <button 
                    onClick={() => {
                        setSuccess(false);
                        setName("");
                        setPhone("");
                        setEmail("");
                        setMessage("");
                    }}
                    className="mt-4 text-[11px] font-medium text-emerald-700 hover:underline"
                >
                    Send another inquiry
                </button>
            </div>
        );
    }

    return (
        <div className="mx-6 mb-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Interested? Send Inquiry
                </span>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
                {error && (
                    <div className="px-3 py-2 text-[11px] font-medium bg-red-50 text-red-600 border border-red-100 rounded-md">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    <div className="relative">
                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="relative">
                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="tel"
                            placeholder="Phone Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="relative">
                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="relative">
                        <MessageSquare className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <textarea
                            placeholder="I'm interested in this property..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-background min-h-[80px] resize-none"
                            disabled={loading}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4" /> Send Inquiry
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
