'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, {
    message: 'Please enter an amount greater than $0.00.',
  }), //input elements with type="number" actually return a string, not a number!
  status: z.enum(['paid', 'pending'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // console.log(`validatedFields:`, JSON.stringify(validatedFields, null, 2)); //test it out

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100; //convert to cents
  const date = new Date().toISOString().split('T')[0]; //get today's date

  // Insert data into the database
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

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
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
