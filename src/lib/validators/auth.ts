import { z } from "zod";

const emailSchema = z.string().trim().max(255).pipe(z.email());

export const RegisterSchema = z.object({
  email: emailSchema,
  password: z.string().min(10).max(200),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
