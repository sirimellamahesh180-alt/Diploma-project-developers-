import { z } from 'zod';
export const requestSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.email(), phone: z.string().trim().min(8).max(20),
  category: z.string().trim().min(2).max(60), title: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(5000), budget: z.number().int().min(500).max(10000000),
  paymentPreference: z.enum(['online','later']), company: z.string().max(0).optional().default('')
});
export const ideaSchema = z.object({ name:z.string().trim().min(2).max(80), category:z.string().trim().min(2).max(40), content:z.string().trim().min(8).max(1000) });
export const announcementSchema = z.object({ title:z.string().trim().min(4).max(140), content:z.string().trim().min(10).max(5000), category:z.string().trim().min(2).max(40), imageUrl:z.union([z.url(),z.literal('')]).optional().default('') });
