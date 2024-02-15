'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(), //input elements with type="number" actually return a string, not a number!
  status: z.enum(['paid', 'pending']),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  //Extract the data from formData

  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100; //convert to cents
  const date = new Date().toISOString().split('T')[0]; //get today's date
  //send the data to the server
  try {
    await sql`
  INSERT INTO invoices (customer_id, amount, status, date)
  VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
`;
  } catch (error) {
    return {
      message: 'Database Error: Failed to create invoice. Please try again.',
    };
  }

  revalidatePath('/dashboard/invoices'); //revalidate the invoices page
  redirect('/dashboard/invoices'); //redirect to the invoices page
  //test it out
  //   console.log(typeof amount);
}

//Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;

  try {
    await sql`
  UPDATE invoices
  SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
  WHERE id = ${id}
`;
  } catch (error) {
    return {
      message: 'Database Error: Failed to update invoice. Please try again.',
    };
  }

  revalidatePath('/dashboard/invoices'); //revalidate the invoices page
  redirect('/dashboard/invoices'); //redirect to the invoices page
}

//deleteInvoice function
export async function deleteInvoice(id: string) {
  try {
    await sql`
      DELETE FROM invoices
      WHERE id = ${id}
    `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to delete invoice. Please try again.',
    };
  }

  revalidatePath('/dashboard/invoices'); //revalidate the invoices page
  return { message: 'Invoice deleted successfully.' };
}
