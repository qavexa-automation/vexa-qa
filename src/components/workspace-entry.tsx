"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import CommandCenter from "./command-center";
import { supabase } from "@/lib/supabase";

export default function WorkspaceEntry() {
  const router = useRouter();
  const [ready, setReady] = useState(!supabase);
  useEffect(() => {
    if (!supabase) return;
    const local = new URLSearchParams(window.location.search).get("mode") === "local";
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session || local) setReady(true);
      else {
        setReady(false);
        router.replace("/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);
  if (!ready)
    return (
      <main className="auth-loading" role="status">
        <img src="/icon.svg" width="44" height="44" alt="VEXA" />
        <LoaderCircle size={20} className="spin" />
        <p>Opening your workspace…</p>
      </main>
    );
  return <CommandCenter />;
}
