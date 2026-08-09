import { z } from "zod";

export const emailSchema = z.email("Email không hợp lệ").trim();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự").max(80),
});

export const sessionSchema = z.object({
  idToken: z.string().min(1),
});
