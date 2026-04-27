import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const sellerLoginSchema = loginSchema; // Same for now

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').regex(/^[A-Za-z\s]+$/, 'Only letters and spaces are allowed'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').regex(/^[A-Za-z\s]+$/, 'Only letters and spaces are allowed'),
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required'),
  phone: z.string().regex(/^(\+63|0)?9\d{9}$/, 'Please enter a valid PH phone number (e.g. 09123456789)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/\d/, 'Must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>\-_[\]\\/`~+=;']/, 'Must contain at least one special character')
    .refine((val) => !/\s/.test(val), 'Password must not contain spaces'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const sellerSignupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/\d/, 'Must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>\-_[\]\\/`~+=;']/, 'Must contain at least one special character')
    .refine((val) => !/\s/.test(val), 'Password must not contain spaces'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  phone: z.string().optional(),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
}).refine((data) => data.password === data.confirmPassword, {

  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type SellerSignupFormData = z.infer<typeof sellerSignupSchema>;

export const becomeSellerSchema = z.object({
  storeName: z.string().min(3, 'Store name must be at least 3 characters'),
  phone: z.string().regex(/^(\+63|0)?9\d{9}$/, 'Please enter a valid PH phone number (e.g. 09123456789)'),
  storeAddress: z.string().min(5, 'Please enter a valid store address'),
  storeDescription: z.string().optional(),
});

export const becomeSellerTwoStepSchema = z.object({
  storeName: z.string().min(3, 'Store name must be at least 3 characters'),
  phone: z.string().regex(/^(\+63|0)?9\d{9}$/, 'Please enter a valid PH phone number (e.g. 09123456789)'),
  storeAddress: z.string().min(5, 'Please enter a valid store address'),
  storeDescription: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/\d/, 'Must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>\-_[\]\\/`~+=;']/, 'Must contain at least one special character')
    .refine((val) => !/\s/.test(val), 'Password must not contain spaces'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type BecomeSellerTwoStepFormData = z.infer<typeof becomeSellerTwoStepSchema>;
