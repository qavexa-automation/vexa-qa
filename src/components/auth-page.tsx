"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { QaIllustration } from "@/components/brand/qa-illustration";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(!!supabase);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.get("error_description")) {
      setError(fragment.get("error_description")!);
      setCanResend(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setChecking(false);
      if (session) router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || submitting.current) return;
    setError("");
    setMessage("");
    setCanResend(false);
    if (signup && password !== confirmation) {
      setError("Your passwords do not match. Please enter them again.");
      return;
    }
    if (signup && !name.trim()) {
      setError("Enter your name so your team can recognize you.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const credentials = { email: email.trim(), password };
      const result = signup
        ? await supabase.auth.signUp({
            ...credentials,
            options: {
              data: { full_name: name.trim() },
              emailRedirectTo: `${window.location.origin}/`,
            },
          })
        : await supabase.auth.signInWithPassword(credentials);
      if (result.error) {
        setError(result.error.message);
        setCanResend(result.error.code === "email_not_confirmed");
      } else if (signup && !result.data.session) {
        setConfirmEmail(true);
        setPassword("");
        setConfirmation("");
      } else {
        router.replace("/");
      }
    } catch {
      setError("We couldn’t connect. Check your connection and try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!supabase || submitting.current || !email.trim()) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (result.error) setError(result.error.message);
      else {
        setMessage(
          "If your account needs confirmation, a new link is on its way. Check your inbox.",
        );
        setCanResend(false);
      }
    } catch {
      setError("We couldn’t send the email. Check your connection and try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const fieldsDisabled = busy || checking || !supabase;

  return (
    <main className="vexa-auth m-0 grid min-h-svh max-w-none grid-cols-1 p-0 lg:grid-cols-[53fr_47fr]">
      <BrandPanel />
      <div className="flex items-center justify-center bg-(--auth-surface) px-6 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-[26rem]">
          <section aria-labelledby="auth-title">
            {confirmEmail ? (
              <div className="flex flex-col items-center text-center" role="status">
                <span
                  className="grid size-12 place-items-center rounded-full text-(--auth-emerald)"
                  style={{ background: "color-mix(in oklab, var(--auth-mint) 28%, white)" }}
                >
                  <Mail aria-hidden="true" className="size-6" />
                </span>
                <h1
                  className="mt-4 font-sans text-2xl leading-tight font-bold tracking-tight text-(--auth-ink)"
                  id="auth-title"
                >
                  Check your inbox
                </h1>
                <p className="mt-2 text-sm text-(--auth-muted)">
                  We sent a confirmation link to{" "}
                  <strong className="font-medium text-(--auth-ink) wrap-anywhere">
                    {email.trim()}
                  </strong>
                  . Confirm your email, then sign in.
                </p>
                <Link
                  className="vexa-auth-submit mt-6 flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-white transition-[background-image] focus-visible:ring-3 focus-visible:ring-(--auth-emerald)/40 focus-visible:outline-none"
                  href="/login"
                >
                  Back to sign in
                </Link>
                <Button
                  className="mt-2"
                  type="button"
                  variant="link"
                  onClick={() => {
                    setConfirmEmail(false);
                    setCanResend(true);
                  }}
                >
                  Use a different email
                </Button>
                <p className="mt-2 text-xs text-(--auth-muted)">
                  Can’t find it? Check your spam or junk folder.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h1
                    className="font-sans text-3xl leading-tight font-bold tracking-tight text-(--auth-ink)"
                    id="auth-title"
                  >
                    {signup ? "Create your account" : "Sign in"}
                  </h1>
                  <p className="mt-1.5 text-sm text-(--auth-muted)">
                    {signup
                      ? "Set up your VEXA account to start working with your team."
                      : "Use your VEXA account."}
                  </p>
                </div>

                {!supabase && (
                  <Alert className="mb-4">
                    <AlertDescription>
                      Cloud sign-in is not configured. You can still use VEXA on this device.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={submit}>
                  <fieldset
                    className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0"
                    disabled={fieldsDisabled}
                  >
                    {signup && (
                      <Field>
                        <FieldLabel className={labelClass} htmlFor="auth-name">
                          Full name
                        </FieldLabel>
                        <InputGroup className={groupClass}>
                          <InputGroupAddon>
                            <UserRound aria-hidden="true" className="size-4 text-(--auth-muted)" />
                          </InputGroupAddon>
                          <InputGroupInput
                            autoComplete="name"
                            id="auth-name"
                            maxLength={100}
                            name="name"
                            placeholder="Enter your full name"
                            required
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                          />
                        </InputGroup>
                      </Field>
                    )}
                    <Field>
                      <FieldLabel className={labelClass} htmlFor="auth-email">
                        Email
                      </FieldLabel>
                      <InputGroup className={groupClass}>
                        <InputGroupAddon>
                          <UserRound aria-hidden="true" className="size-4 text-(--auth-muted)" />
                        </InputGroupAddon>
                        <InputGroupInput
                          autoComplete="email"
                          id="auth-email"
                          name="email"
                          placeholder="Enter your email"
                          required
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                      </InputGroup>
                    </Field>
                    <Field>
                      <FieldLabel className={labelClass} htmlFor="auth-password">
                        Password
                      </FieldLabel>
                      <InputGroup className={groupClass}>
                        <InputGroupAddon>
                          <Lock aria-hidden="true" className="size-4 text-(--auth-muted)" />
                        </InputGroupAddon>
                        <InputGroupInput
                          placeholder="Enter your password"
                          aria-describedby={signup ? "auth-password-hint" : undefined}
                          autoComplete={signup ? "new-password" : "current-password"}
                          id="auth-password"
                          maxLength={128}
                          minLength={signup ? 8 : undefined}
                          name="password"
                          required
                          type={visible ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            aria-label={visible ? "Hide password" : "Show password"}
                            aria-pressed={visible}
                            size="icon-xs"
                            onClick={() => setVisible(!visible)}
                          >
                            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                      {signup && (
                        <FieldDescription className="text-(--auth-muted)" id="auth-password-hint">
                          At least 8 characters.
                        </FieldDescription>
                      )}
                    </Field>
                    {signup && (
                      <Field>
                        <FieldLabel className={labelClass} htmlFor="auth-confirm">
                          Confirm password
                        </FieldLabel>
                        <InputGroup className={groupClass}>
                          <InputGroupAddon>
                            <Lock aria-hidden="true" className="size-4 text-(--auth-muted)" />
                          </InputGroupAddon>
                          <InputGroupInput
                            autoComplete="new-password"
                            id="auth-confirm"
                            name="confirmation"
                            placeholder="Re-enter your password"
                            required
                            type={visible ? "text" : "password"}
                            value={confirmation}
                            onChange={(event) => setConfirmation(event.target.value)}
                          />
                        </InputGroup>
                      </Field>
                    )}

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription className="wrap-anywhere">{error}</AlertDescription>
                      </Alert>
                    )}
                    {message && (
                      <Alert role="status">
                        <AlertDescription>{message}</AlertDescription>
                      </Alert>
                    )}

                    {/* Keeps its width while pending, so the row never jumps as the label changes. */}
                    <button
                      className="vexa-auth-submit mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-[background-image] focus-visible:ring-3 focus-visible:ring-(--auth-emerald)/40 focus-visible:outline-none disabled:opacity-70"
                      type="submit"
                    >
                      {(busy || checking) && <Spinner aria-hidden="true" className="size-4" />}
                      {checking
                        ? "Checking session…"
                        : busy
                          ? "Please wait…"
                          : signup
                            ? "Create account"
                            : "Sign In"}
                      {!busy && !checking && <ArrowRight aria-hidden="true" className="size-4" />}
                    </button>
                    {canResend && email.trim() && (
                      <Button
                        className="self-center text-(--auth-emerald)"
                        type="button"
                        variant="link"
                        onClick={() => void resendConfirmation()}
                      >
                        Resend confirmation email
                      </Button>
                    )}
                  </fieldset>
                </form>

                {!signup && (
                  <p className="mt-6 text-sm leading-relaxed text-(--auth-muted)">
                    Can’t sign in? Ask your system administrator to reset your account.
                  </p>
                )}

                {!supabase && (
                  <Link
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-lg border border-(--auth-border) text-sm font-semibold text-(--auth-ink) transition-colors hover:bg-(--auth-border)/30 focus-visible:ring-3 focus-visible:ring-(--auth-emerald)/40 focus-visible:outline-none"
                    href="/?mode=local"
                  >
                    Continue on this device
                  </Link>
                )}
              </>
            )}
          </section>

          {signup && !confirmEmail && (
            <p className="mt-6 text-sm text-(--auth-muted)">
              Already have an account?{" "}
              <Link
                className="font-semibold text-(--auth-emerald) underline-offset-4 hover:underline"
                href="/login"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

const labelClass = "text-sm font-semibold text-(--auth-ink)";
// Focus and border colors come from the tokens rebound on .vexa-auth, so the primitives keep
// their own focus behavior and simply resolve to this page's emerald.
const groupClass = "h-11 rounded-lg";

/**
 * The branding half: wordmark, tagline, and what the product is for. The form keeps the
 * page's only heading.
 */
function BrandPanel() {
  return (
    <div className="vexa-auth-brand relative isolate flex flex-col justify-between overflow-hidden px-7 py-9 text-white sm:px-10 sm:py-12 lg:px-14 lg:py-14">
      <p className="text-xl font-bold tracking-[0.18em]">VEXA</p>
      <div className="my-7 flex flex-col gap-4 lg:my-4 lg:gap-6">
        <p className="font-sans text-[2.1rem] leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-[3.4rem]">
          Track. Verify.
          <span className="block text-(--auth-mint-bright)">Execute.</span>
        </p>
        <QaIllustration />
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-white/85 sm:text-base">
        A centralized platform for tracking QA tasks, developer updates, and client modification
        requests.
      </p>
    </div>
  );
}
