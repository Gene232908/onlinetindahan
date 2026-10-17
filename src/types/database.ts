export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          cost_price: number;
          selling_price: number;
          quantity: number;
          low_stock_alert: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          cost_price: number;
          selling_price: number;
          quantity?: number;
          low_stock_alert?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          cost_price?: number;
          selling_price?: number;
          quantity?: number;
          low_stock_alert?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      sales: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          cost_price: number;
          sold_price: number;
          sold_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          cost_price: number;
          sold_price: number;
          sold_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          cost_price?: number;
          sold_price?: number;
          sold_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      restocks: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity_added: number;
          cost_price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          product_id: string;
          quantity_added: number;
          cost_price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity_added?: number;
          cost_price?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restocks_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restocks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_sale: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_sold_price: number;
        };
        Returns: Json;
      };
      undo_sale: {
        Args: {
          p_sale_id: string;
        };
        Returns: Json;
      };
      restock_product: {
        Args: {
          p_product_id: string;
          p_quantity_added: number;
          p_cost_price?: number | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Product = Database['public']['Tables']['products']['Row'];
export type Sale = Database['public']['Tables']['sales']['Row'];
export type Restock = Database['public']['Tables']['restocks']['Row'];
