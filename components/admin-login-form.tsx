"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { loginAction, type LoginState } from "@/app/admin/actions";

const initialState: LoginState = {};

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-xs font-extrabold text-[#45515b]">Username</span>
        <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#2c3038]/10 bg-white px-4 focus-within:border-[#0066ff]/45 focus-within:ring-4 focus-within:ring-[#0066ff]/8">
          <UserRound className="size-4 text-[#889198]" />
          <input
            name="username"
            autoComplete="username"
            required
            disabled={!configured || pending}
            className="w-full bg-transparent text-sm font-semibold outline-none disabled:opacity-50"
            placeholder="Masukkan username"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-extrabold text-[#45515b]">Password</span>
        <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#2c3038]/10 bg-white px-4 focus-within:border-[#0066ff]/45 focus-within:ring-4 focus-within:ring-[#0066ff]/8">
          <LockKeyhole className="size-4 text-[#889198]" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={!configured || pending}
            className="w-full bg-transparent text-sm font-semibold outline-none disabled:opacity-50"
            placeholder="Masukkan password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="grid size-8 shrink-0 place-items-center text-[#7b858b]"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>

      {!configured && (
        <div className="flex gap-3 rounded-xl bg-[#fff3e9] p-4 text-xs leading-5 text-[#98451f]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Kredensial admin belum dikonfigurasi pada server. Isi environment variable yang tercantum di `.env.example`.
        </div>
      )}

      {state.error && (
        <div aria-live="polite" className="flex gap-3 rounded-xl bg-[#fff0ef] p-4 text-xs font-semibold text-[#b33b31]">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={!configured || pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066ff] text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,102,255,0.22)] transition hover:bg-[#0056d6] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
        {pending ? "Memeriksa..." : "Masuk ke dashboard"}
      </button>
    </form>
  );
}
