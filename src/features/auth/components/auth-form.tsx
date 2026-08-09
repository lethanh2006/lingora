"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { ZodError } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { emailSchema, loginSchema, registerSchema } from "@/features/auth/schemas/auth.schema";

type AuthMode = "login" | "register" | "forgot-password";

const copy = {
  login: {
    title: "Chào mừng trở lại",
    description: "Đăng nhập để tiếp tục hành trình học của bạn.",
    submit: "Đăng nhập",
  },
  register: {
    title: "Tạo tài khoản",
    description: "Bắt đầu học ngôn ngữ cùng Lingora.",
    submit: "Đăng ký",
  },
  "forgot-password": {
    title: "Khôi phục mật khẩu",
    description: "Chúng tôi sẽ gửi liên kết đặt lại mật khẩu đến email của bạn.",
    submit: "Gửi liên kết",
  },
} satisfies Record<AuthMode, { title: string; description: string; submit: string }>;

function friendlyAuthError(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  if (!(error instanceof Error)) return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "Email này đã được sử dụng.",
    "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
    "auth/invalid-email": "Email không hợp lệ.",
    "auth/popup-closed-by-user": "Cửa sổ đăng nhập đã bị đóng.",
    "auth/too-many-requests": "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    "auth/weak-password": "Mật khẩu chưa đủ mạnh.",
  };
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  return messages[code] ?? "Không thể xác thực. Vui lòng thử lại.";
}

async function createServerSession(idToken: string) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) throw new Error("Không thể tạo phiên đăng nhập.");
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function finishSignIn(idToken: string) {
    await createServerSession(idToken);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "");

    try {
      const auth = getFirebaseAuth();

      if (mode === "forgot-password") {
        const parsed = emailSchema.parse(email);
        await sendPasswordResetEmail(auth, parsed);
        setMessage("Đã gửi email khôi phục. Hãy kiểm tra hộp thư của bạn.");
        return;
      }

      if (mode === "register") {
        const parsed = registerSchema.parse({ email, password, displayName });
        const credential = await createUserWithEmailAndPassword(
          auth,
          parsed.email,
          parsed.password,
        );
        await updateProfile(credential.user, { displayName: parsed.displayName });
        await finishSignIn(await credential.user.getIdToken(true));
        return;
      }

      const parsed = loginSchema.parse({ email, password });
      const credential = await signInWithEmailAndPassword(auth, parsed.email, parsed.password);
      await finishSignIn(await credential.user.getIdToken());
    } catch (reason) {
      setError(friendlyAuthError(reason));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsLoading(true);
    try {
      const credential = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      await finishSignIn(await credential.user.getIdToken());
    } catch (reason) {
      setError(friendlyAuthError(reason));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{copy[mode].title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy[mode].description}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" && (
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">Tên hiển thị</label>
            <Input id="displayName" name="displayName" autoComplete="name" required />
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        {mode !== "forgot-password" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Mật khẩu</label>
              {mode === "login" && (
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              )}
            </div>
            <Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
          </div>
        )}

        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

        <Button className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : copy[mode].submit}
        </Button>
      </form>

      {mode !== "forgot-password" && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            hoặc
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
            Tiếp tục với Google
          </Button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
        <Link href={mode === "login" ? "/register" : "/login"} className="font-semibold text-foreground hover:underline">
          {mode === "login" ? "Đăng ký" : "Đăng nhập"}
        </Link>
      </p>
    </div>
  );
}
