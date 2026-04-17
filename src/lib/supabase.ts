import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 用于客户端（浏览器）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 用于服务器端（API 路由）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);