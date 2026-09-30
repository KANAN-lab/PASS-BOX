export type UserRole = 'admin' | 'checker';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface PassBoxLog {
  id: number;
  no_pro: string;
  tanggal: string; // YYYY-MM-DD
  pass_box: string;
  user_id: string;
  user_name: string;
  created_at: string;
  updated_at?: string;
}

export interface CheckerSummary {
  checker_name: string;
  user_id: string;
  total_input: number;
  hari_aktif: number;
  input_terakhir: string;
}
