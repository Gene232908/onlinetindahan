import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  cost_price: z.coerce.number().min(0, 'Cost price must be 0 or greater'),
  selling_price: z.coerce.number().min(0, 'Selling price must be 0 or greater'),
  quantity: z.coerce.number().int('Quantity must be a whole number').min(0, 'Stock cannot be negative'),
  low_stock_alert: z.coerce.number().int().min(0).default(3).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const saleSchema = z.object({
  quantity: z.coerce.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
  sold_price: z.coerce.number().min(0, 'Selling price cannot be negative'),
});

export type SaleFormData = z.infer<typeof saleSchema>;

export const restockSchema = z.object({
  quantity_added: z.coerce.number().int('Quantity must be a whole number').min(1, 'Add at least 1 unit'),
  cost_price: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0, 'Cost price cannot be negative').optional()
  ),
});

export type RestockFormData = z.infer<typeof restockSchema>;

export const authSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type AuthFormData = z.infer<typeof authSchema>;
