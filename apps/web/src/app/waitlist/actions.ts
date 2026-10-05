'use server';

import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

export interface WaitlistState {
  status: 'idle' | 'ok' | 'error';
  message?: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  // Honeypot field: bots fill it, humans do not see it.
  if (String(formData.get('website') ?? '')) return { status: 'ok', message: 'Thanks, you are on the list.' };
  if (!EMAIL.test(email) || email.length > 254) return { status: 'error', message: 'Please enter a valid email address.' };

  const referer = (await headers()).get('referer') ?? '';
  const { error } = await supabase().from('waitlist').insert({ email, source: referer.slice(0, 200) || 'website' });
  if (error) {
    // Unique violation = already subscribed; treat as success and never leak the list.
    if (error.code === '23505') return { status: 'ok', message: 'You are already on the list. Thanks!' };
    console.error(error);
    return { status: 'error', message: 'Something went wrong. Please try again.' };
  }
  return { status: 'ok', message: 'Thanks, you are on the list.' };
}
