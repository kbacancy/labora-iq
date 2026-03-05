"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/src/context/AuthContext";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(6, "Password must have at least 6 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid login payload.");
      return;
    }

    setSubmitting(true);
    const response = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);

    if (response.error) {
      setErrorMessage(response.error);
      return;
    }

    router.replace("/dashboard");
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-100">Welcome to LaboraIQ</h1>
        <p className="mt-2 text-sm text-gray-400">Sign in to continue to your laboratory dashboard.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Email</label>
            <input
              type="email"
              {...register("email")}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100"
              placeholder="name@laboraiq.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Password</label>
            <input
              type="password"
              {...register("password")}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100"
              placeholder="••••••••"
            />
          </div>

          {(errorMessage || formState.errors.email?.message || formState.errors.password?.message) && (
            <p className="text-sm text-red-400">
              {errorMessage ?? formState.errors.email?.message ?? formState.errors.password?.message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
