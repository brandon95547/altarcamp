import { z } from 'zod';
import { userRole, uuid } from './common.js';

export const password = z
  .string()
  .min(12, 'Use at least 12 characters — this account holds your contracts.')
  .max(200);

export const signupRequest = z.object({
  legalName: z.string().min(2).max(200),
  artistName: z.string().min(1).max(200),
  email: z.email(),
  phone: z.string().max(40).optional(),
  password,
  country: z.string().min(2).max(100),
  region: z.string().max(100).optional(),
  isOfAge: z.literal(true, 'You must confirm you are 18 or older, or have guardian consent.'),
  website: z.url().optional().or(z.literal('')),
  socialProfiles: z
    .array(z.object({ platform: z.string().max(60), url: z.string().max(300) }))
    .max(10)
    .optional(),
});
export type SignupRequest = z.infer<typeof signupRequest>;

export const loginRequest = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequest>;

export const sessionUser = z.object({
  id: uuid,
  email: z.string(),
  legalName: z.string(),
  role: userRole,
  artistId: uuid.nullable(),
  artistName: z.string().nullable(),
  emailVerified: z.boolean(),
  mfaRequired: z.boolean(),
});
export type SessionUser = z.infer<typeof sessionUser>;

export const sessionResponse = z.object({ user: sessionUser });
