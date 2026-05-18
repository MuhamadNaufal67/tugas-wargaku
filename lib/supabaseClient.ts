import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "user";

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          category: string;
          content: string;
          created_at: string;
          created_by: string | null;
          id: string;
          title: string;
        };
        Insert: {
          category: string;
          content: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          message: string;
          metadata: Json | null;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          message: string;
          metadata?: Json | null;
          read?: boolean;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          message?: string;
          metadata?: Json | null;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      pengajuan_surat: {
        Row: {
          alamat: string;
          alasan_penolakan: string | null;
          created_at: string | null;
          dokumen: string | null;
          file_surat: string | null;
          id: number;
          jenis_surat: string;
          nama: string;
          nik: string;
          parent_pengajuan_id: number | null;
          status: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          alamat: string;
          alasan_penolakan?: string | null;
          created_at?: string | null;
          dokumen?: string | null;
          file_surat?: string | null;
          id?: number;
          jenis_surat: string;
          nama: string;
          nik: string;
          parent_pengajuan_id?: number | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          alamat?: string;
          alasan_penolakan?: string | null;
          created_at?: string | null;
          dokumen?: string | null;
          file_surat?: string | null;
          id?: number;
          jenis_surat?: string;
          nama?: string;
          nik?: string;
          parent_pengajuan_id?: number | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          alamat: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          nik: string | null;
          role: AppRole;
          updated_at: string | null;
        };
        Insert: {
          alamat?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          nik?: string | null;
          role?: AppRole;
          updated_at?: string | null;
        };
        Update: {
          alamat?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          nik?: string | null;
          role?: AppRole;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];
export type PengajuanRow = Database["public"]["Tables"]["pengajuan_surat"]["Row"];
export type AnnouncementRow =
  Database["public"]["Tables"]["announcements"]["Row"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return supabaseClient;
}
