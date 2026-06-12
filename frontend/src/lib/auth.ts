import { apiGet } from './api';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'operator' | 'admin';
  is_active: boolean;
  created_at: string;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await apiGet<User>('/api/auth/me');
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/auth/logout`,
    { method: 'POST', credentials: 'include' }
  );
}
