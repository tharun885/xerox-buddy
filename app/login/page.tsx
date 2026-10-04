"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage("");
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    try {
      const supabase = createClient();
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: name },
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
              },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setErrorMessage(result.error.message);
      } else if (mode === "signup" && !result.data.session) {
        setNotice("Check your email for a confirmation link to finish signing up.");
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch {
      setErrorMessage("We couldn't connect to authentication. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setPending(true);
    setErrorMessage("");
    setNotice("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data.url) {
        window.location.assign(data.url);
      } else {
        setErrorMessage("Google sign-in did not return a redirect. Please try again.");
      }
    } catch {
      setErrorMessage("We couldn't connect to authentication. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage("");
    setNotice("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f4ef] px-4 py-10 text-[#18241f] sm:px-6">
      <section className="w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#49765d]">
            Ready when you are
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">XEROX BUDDY</h1>
          <p className="mt-3 text-base leading-6 text-[#52615a]">
            Print before you reach. Pick up when it&apos;s ready.
          </p>
        </header>

        <div className="rounded-lg border border-[#d9dfd8] bg-white p-5 shadow-[0_16px_50px_-35px_rgba(24,36,31,0.45)] sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-md bg-[#eef1ec] p-1" role="group" aria-label="Account mode">
            <button
              type="button"
              aria-pressed={mode === "login"}
              onClick={() => changeMode("login")}
              className={`min-h-11 rounded px-4 text-sm font-semibold transition-colors ${mode === "login" ? "bg-white text-[#18241f] shadow-sm" : "text-[#65716b] hover:text-[#18241f]"}`}
            >
              Login
            </button>
            <button
              type="button"
              aria-pressed={mode === "signup"}
              onClick={() => changeMode("signup")}
              className={`min-h-11 rounded px-4 text-sm font-semibold transition-colors ${mode === "signup" ? "bg-white text-[#18241f] shadow-sm" : "text-[#65716b] hover:text-[#18241f]"}`}
            >
              Sign up
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="name">
                  Name
                </label>
                <input
                  autoComplete="name"
                  className="h-12 w-full rounded-md border border-[#cfd7d0] bg-white px-3 outline-none transition focus:border-[#49765d] focus:ring-2 focus:ring-[#49765d]/20"
                  id="name"
                  name="name"
                  required
                  type="text"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="email">
                Email
              </label>
              <input
                autoComplete="email"
                className="h-12 w-full rounded-md border border-[#cfd7d0] bg-white px-3 outline-none transition focus:border-[#49765d] focus:ring-2 focus:ring-[#49765d]/20"
                id="email"
                name="email"
                required
                type="email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="password">
                Password
              </label>
              <input
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="h-12 w-full rounded-md border border-[#cfd7d0] bg-white px-3 outline-none transition focus:border-[#49765d] focus:ring-2 focus:ring-[#49765d]/20"
                id="password"
                minLength={6}
                name="password"
                required
                type="password"
              />
            </div>

            {errorMessage && (
              <p className="rounded-md bg-[#fff0ed] px-3 py-2.5 text-sm text-[#a3311d]" role="alert">
                {errorMessage}
              </p>
            )}
            {notice && (
              <p className="rounded-md bg-[#edf6ef] px-3 py-2.5 text-sm text-[#285c3b]" role="status">
                {notice}
              </p>
            )}

            <button
              className="min-h-12 w-full rounded-md bg-[#236443] px-4 font-semibold text-white transition hover:bg-[#194f34] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236443] disabled:cursor-wait disabled:opacity-65"
              disabled={pending}
              type="submit"
            >
              {pending ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-[#7b8580]">
            <span className="h-px flex-1 bg-[#e1e5e0]" />
            or
            <span className="h-px flex-1 bg-[#e1e5e0]" />
          </div>

          <button
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-[#cfd7d0] bg-white px-4 font-semibold transition hover:bg-[#f7f9f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#49765d] disabled:cursor-wait disabled:opacity-65"
            disabled={pending}
            onClick={handleGoogleSignIn}
            type="button"
          >
            <span aria-hidden="true" className="text-lg font-bold text-[#4285f4]">G</span>
            Continue with Google
          </button>
        </div>
      </section>
    </main>
  );
}