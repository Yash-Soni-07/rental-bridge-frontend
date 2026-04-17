import { useLogin, useGo } from "@refinedev/core";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Loader2 } from "lucide-react";

type LoginFormValues = {
    email: string;
    password: string;
};

export const Login = () => {
    const { mutate: login } = useLogin();
    const go = useGo();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>();

    const onSubmit = (data: LoginFormValues) => {
        setIsLoading(true);
        setError(null);
        login(data, {
            onError: (error: any) => {
                setError(error?.message || "Login failed. Please check your credentials.");
                setIsLoading(false);
            },
            onSuccess: () => {
                setIsLoading(false);
            },
        });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-muted/20 p-4 transition-colors">
            {/* Absolute positioned Theme Toggle for unauthenticated users */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8">
                <ModeToggle />
            </div>

            <Card className="w-full max-w-md shadow-xl border-none bg-card">
                <CardHeader className="space-y-2 text-center pb-6">
                    <div className="flex justify-center mb-2">
                        <img src="/favicon.svg" alt="Logo" className="h-14 w-14" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold tracking-tight">Welcome back</CardTitle>
                    <CardDescription className="text-base">
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-5">
                        {error && (
                            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                className={`h-11 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: "Invalid email address",
                                    },
                                })}
                                aria-invalid={!!errors.email}
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="text-sm font-medium text-destructive animate-in fade-in">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                {/* Future extension: Forgot password */}
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className={`h-11 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                {...register("password", {
                                    required: "Password is required",
                                    minLength: {
                                        value: 6,
                                        message: "Password must be at least 6 characters",
                                    },
                                })}
                                aria-invalid={!!errors.password}
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <p className="text-sm font-medium text-destructive animate-in fade-in">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 mt-2">
                        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Logging in...
                                </>
                            ) : (
                                "Log in"
                            )}
                        </Button>
                        <p className="text-sm text-muted-foreground text-center">
                            Don't have an account?{" "}
                            <Button 
                                type="button"
                                variant="link" 
                                className="p-0 h-auto font-semibold" 
                                onClick={() => go({ to: "/register" })}
                                disabled={isLoading}
                            >
                                Sign up
                            </Button>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};