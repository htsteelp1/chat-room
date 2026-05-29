import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field";

async function loginHandle(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append("action", e.nativeEvent.submitter.value);
    const params = new URLSearchParams(fd);
    const response = await fetch("/login", {
        method: "POST",
        body: params,
    });
    if (response.ok) {
        location.reload();
    }
}

/**
 * LoginPage
 *
 * Add to your router:
 *   <Route path="/login" element={<LoginPage />} />
 */
export default function LoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);



    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm">
                <form action={"/login"} method={"post"} autoComplete="off">
                    <FieldGroup>
                        <FieldSet>
                            <FieldLegend>Welcome</FieldLegend>
                            <FieldDescription>
                                Sign in to your account or create a new one.
                            </FieldDescription>

                            <Field>
                                <FieldLabel htmlFor="username">Username</FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="username"
                                        name="username"
                                        placeholder="username"
                                        autoComplete="username"
                                        disabled={loading}
                                    />
                                </FieldContent>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="password"
                                        autoComplete="current-password"
                                        disabled={loading}
                                    />
                                </FieldContent>
                            </Field>
                        </FieldSet>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <Field orientation="horizontal">
                            <Button
                                type="submit"
                                name="action"
                                value="login"
                                disabled={loading}
                                className="flex-1"
                                formaction={"/login"}
                            >
                                {loading ? "Signing in…" : "Login"}
                            </Button>
                            <Button
                                type="submit"
                                name="action"
                                value="register"
                                variant="outline"
                                disabled={loading}
                                className="flex-1"
                                formaction={"/register"}
                            >
                                {loading ? "Registering…" : "Register"}
                            </Button>
                        </Field>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
}