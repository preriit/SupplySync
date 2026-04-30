import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?\d{10,15}$/;

const toCompactPhone = (value) => (value || '').replace(/\s+/g, '');

export const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or mobile number is required'),
  password: z.string().min(1, 'Password is required'),
});

export const signUpFormSchema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required'),
  ownerName: z.string().trim().min(1, 'Owner name is required'),
  mobileNumber: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be 10 digits'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  postalCode: z.string().trim().regex(/^\d{6}$/, 'Postal code must be 6 digits'),
  fullAddress: z.string().optional(),
  email: z.string().trim().regex(emailRegex, 'Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const profileFormSchema = z.object({
  username: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().optional().refine((value) => {
    if (!value) {
      return true;
    }
    return /^\d{10}$/.test(value);
  }, 'Phone must be a 10-digit mobile number'),
  preferred_language: z.enum(['en', 'hi']),
});

export function buildLoginPayload(identifier, password) {
  const parsed = loginFormSchema.parse({
    identifier,
    password,
  });
  const normalizedIdentifier = parsed.identifier.trim();
  const compactPhone = toCompactPhone(normalizedIdentifier);

  if (emailRegex.test(normalizedIdentifier)) {
    return {
      email: normalizedIdentifier,
      phone: undefined,
      password: parsed.password,
    };
  }

  if (phoneRegex.test(compactPhone)) {
    return {
      email: undefined,
      phone: compactPhone,
      password: parsed.password,
    };
  }

  throw new z.ZodError([
    {
      code: z.ZodIssueCode.custom,
      path: ['identifier'],
      message: 'Enter a valid email or mobile number',
    },
  ]);
}

export function toFieldErrors(zodError) {
  return zodError.issues.reduce((acc, issue) => {
    const field = issue.path?.[0];
    if (field && !acc[field]) {
      acc[field] = issue.message;
    }
    return acc;
  }, {});
}
