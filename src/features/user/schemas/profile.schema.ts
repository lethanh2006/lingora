import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự").max(80),
});
