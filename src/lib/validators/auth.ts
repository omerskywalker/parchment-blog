import { z } from "zod";

export const RegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z.email().trim().max(255),
  password: z.string().min(10).max(200),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
