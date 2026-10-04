import { z } from 'zod';

export const PASSWORD_MIN = 8;

export const SignInSchema = z.object({
  email: z.string().trim().email('auth.errors.email'),
  password: z.string().min(1, 'auth.errors.required'),
});
export type SignInValues = z.infer<typeof SignInSchema>;

export const SignUpSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email('auth.errors.email'),
  password: z.string().min(PASSWORD_MIN, 'auth.errors.passwordShort'),
  accept: z.literal(true, { message: 'auth.errors.acceptTerms' }),
});
export type SignUpValues = z.infer<typeof SignUpSchema>;

export const EmailSchema = z.object({ email: z.string().trim().email('auth.errors.email') });
export const NewPasswordSchema = z.object({
  password: z.string().min(PASSWORD_MIN, 'auth.errors.passwordShort'),
});
