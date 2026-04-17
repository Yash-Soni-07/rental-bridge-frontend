import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PropertyCreate: React.FC = () => {
    return (
        <div className="container mx-auto p-6 space-y-8">
            <header>
                <h1 className="text-4xl font-extrabold tracking-tight">Add New Property</h1>
                <p className="text-muted-foreground mt-2">
                    Create a new property listing.
                </p>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Property creation form coming soon...</p>
                </CardContent>
            </Card>
        </div>
    );
};
