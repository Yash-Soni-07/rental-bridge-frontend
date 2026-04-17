import React, { useState } from "react";
import { useRegister, useGo } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Home, User, Loader2 } from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";

export const Register = () => {
    const go = useGo();
    const { mutate: register, isPending: isLoading } = useRegister();
    const [apiError, setApiError] = useState<string | null>(null);

    // Track role separately to style the role buttons nicely
    const [role, setRole] = useState<"tenant" | "landlord">("tenant");

    const {
        register: formRegister,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            name: "",
            username: "",
            email: "",
            password: "",
        }
    });

    const onSubmit = (data: any) => {
        setApiError(null);
        register({ ...data, role }, {
            onError: (error: any) => {
                setApiError(error?.message || "Registration failed. Please try again.");
            },
        });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-muted/20 p-4 transition-colors">
            {/* Absolute positioned Theme Toggle for unauthenticated users */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8">
                <ModeToggle />
            </div>

            <Card className="w-full max-w-md shadow-xl border-none bg-card my-8">
                <CardHeader className="space-y-2 text-center pb-6">
                    <div className="flex justify-center mb-2">
                        <img src="/favicon.svg" alt="Logo" className="h-14 w-14" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold tracking-tight">Create an account</CardTitle>
                    <CardDescription className="text-base">Join Rental Bridge today.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {apiError && (
                            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
                                <AlertDescription>{apiError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Side-by-Side Role Selection */}
                        <div className="space-y-3 mb-2">
                            <Label className="text-sm font-semibold text-muted-foreground">I am a...</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setRole("tenant")}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${role === "tenant"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50"
                                        }`}
                                >
                                    <User className={`h-6 w-6 mb-2 ${role === "tenant" ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className={`text-sm font-bold ${role === "tenant" ? "text-primary" : "text-muted-foreground"}`}>Tenant</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRole("landlord")}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${role === "landlord"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50"
                                        }`}
                                >
                                    <Home className={`h-6 w-6 mb-2 ${role === "landlord" ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className={`text-sm font-bold ${role === "landlord" ? "text-primary" : "text-muted-foreground"}`}>Landlord</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input 
                                id="name" 
                                placeholder="John Doe" 
                                className={`h-11 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                {...formRegister("name", { required: "Full Name is required" })} 
                                disabled={isLoading}
                            />
                            {errors.name && (
                                <p className="text-sm font-medium text-destructive animate-in fade-in">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input 
                                id="username" 
                                placeholder="johndoe123" 
                                className={`h-11 ${errors.username ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                {...formRegister("username", { 
                                    required: "Username is required",
                                    minLength: { value: 3, message: "Username must be at least 3 characters" }
                                })} 
                                disabled={isLoading}
                            />
                            {errors.username && (
                                <p className="text-sm font-medium text-destructive animate-in fade-in">
                                    {errors.username.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="name@example.com" 
                                className={`h-11 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                {...formRegister("email", { 
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: "Invalid email address",
                                    }
                                })} 
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="text-sm font-medium text-destructive animate-in fade-in">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="••••••••"
                                className={`h-11 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                {...formRegister("password", { 
                                    required: "Password is required",
                                    minLength: { value: 6, message: "Password must be at least 6 characters" }
                                })} 
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <p className="text-sm font-medium text-destructive animate-in fade-in">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-semibold mt-6" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                "Sign Up"
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center pt-2 pb-6">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Button 
                            variant="link" 
                            className="p-0 h-auto font-semibold" 
                            onClick={() => go({ to: "/login" })}
                            disabled={isLoading}
                        >
                            Log in here
                        </Button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};