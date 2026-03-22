export type Json = { [key: string]: Json | undefined } | boolean | Json[] | null | number | string;

export interface Database {
  pgmq_public: {
    CompositeTypes: Record<never, never>;
    Enums: Record<never, never>;
    Functions: {
      archive: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      delete: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      pop: {
        Args: { queue_name: string };
        Returns: unknown[];
        SetofOptions: {
          from: "*";
          isOneToOne: false;
          isSetofReturn: true;
          to: "message_record";
        };
      };
      read: {
        Args: { n: number; queue_name: string; sleep_seconds: number };
        Returns: unknown[];
        SetofOptions: {
          from: "*";
          isOneToOne: false;
          isSetofReturn: true;
          to: "message_record";
        };
      };
      send: {
        Args: { message: Json; queue_name: string; sleep_seconds?: number };
        Returns: number[];
      };
      send_batch: {
        Args: { messages: Json[]; queue_name: string; sleep_seconds?: number };
        Returns: number[];
      };
    };
    Tables: Record<never, never>;
    Views: Record<never, never>;
  };
  public: {
    CompositeTypes: Record<never, never>;
    Enums: Record<never, never>;
    Functions: {
      add_category_to_bookmarks: {
        Args: { p_bookmark_ids: number[]; p_category_id: number };
        Returns: {
          out_bookmark_id: number;
          out_category_id: number;
        }[];
      };
      admin_get_instagram_archives: {
        Args: never;
        Returns: {
          archived_at: string;
          failure_reason: string;
          msg_id: number;
          url: string;
          user_id: string;
        }[];
      };
      admin_get_twitter_archives: {
        Args: never;
        Returns: {
          archived_at: string;
          failure_reason: string;
          msg_id: number;
          url: string;
          user_id: string;
        }[];
      };
      admin_retry_ai_embeddings_archives: {
        Args: { p_count?: number };
        Returns: Json;
      };
      admin_retry_all_instagram_archives: { Args: never; Returns: Json };
      admin_retry_all_twitter_archives: { Args: never; Returns: Json };
      admin_retry_instagram_import: {
        Args: { p_msg_ids: number[] };
        Returns: Json;
      };
      admin_retry_twitter_import: {
        Args: { p_msg_ids: number[] };
        Returns: Json;
      };
      archive_with_reason: {
        Args: { p_msg_id: number; p_queue_name: string; p_reason: string };
        Returns: boolean;
      };
      auto_assign_collections: {
        Args: {
          p_bookmark_id: number;
          p_category_ids: number[];
          p_user_id: string;
        };
        Returns: undefined;
      };
      check_bookmarks_view_keyed_shape: { Args: { v: Json }; Returns: boolean };
      create_and_assign_tag: {
        Args: { p_bookmark_id: number; p_tag_name: string };
        Returns: {
          bookmark_tag_bookmark_id: number;
          bookmark_tag_created_at: string;
          bookmark_tag_id: number;
          bookmark_tag_tag_id: number;
          bookmark_tag_user_id: string;
          tag_created_at: string;
          tag_id: number;
          tag_name: string;
          tag_user_id: string;
        }[];
      };
      enqueue_instagram_bookmarks: {
        Args: { p_bookmarks: Json; p_user_id: string };
        Returns: Json;
      };
      enqueue_raindrop_bookmarks: {
        Args: { p_bookmarks: Json; p_user_id: string };
        Returns: Json;
      };
      enqueue_twitter_bookmarks: {
        Args: { p_bookmarks: Json; p_user_id: string };
        Returns: Json;
      };
      get_instagram_sync_status: { Args: { p_user_id: string }; Returns: Json };
      get_instagram_worker_failures: {
        Args: { p_since_minutes?: number };
        Returns: {
          created_at: string;
          error_body: string;
          request_id: number;
          status_code: number;
        }[];
      };
      get_raindrop_sync_status: { Args: { p_user_id: string }; Returns: Json };
      get_twitter_sync_status: { Args: { p_user_id: string }; Returns: Json };
      get_twitter_worker_failures: {
        Args: { p_since_minutes?: number };
        Returns: {
          created_at: string;
          error_body: string;
          request_id: number;
          status_code: number;
        }[];
      };
      invoke_instagram_worker: { Args: never; Returns: number };
      invoke_raindrop_worker: { Args: never; Returns: number };
      invoke_twitter_worker: { Args: never; Returns: number };
      link_twitter_bookmark_category: {
        Args: {
          p_category_name: string;
          p_msg_id?: number;
          p_url: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      process_instagram_bookmark: {
        Args: {
          p_bookmark_id: number;
          p_collection_names?: string[];
          p_msg_id?: number;
          p_user_id: string;
        };
        Returns: Json;
      };
      process_raindrop_bookmark: {
        Args: {
          p_bookmark_id: number;
          p_category_name?: string;
          p_favicon?: string;
          p_inserted_at?: string;
          p_media_type?: string;
          p_msg_id?: number;
          p_og_image?: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      remove_category_from_all_favorites: {
        Args: { p_category_id: number };
        Returns: undefined;
      };
      remove_category_from_bookmark: {
        Args: { p_bookmark_id: number; p_category_id: number };
        Returns: {
          added_uncategorized: boolean;
          deleted_category_id: number;
        }[];
      };
      remove_favorite_category_for_user: {
        Args: { p_category_id: number };
        Returns: undefined;
      };
      retry_ai_embeddings_archive: {
        Args: { p_msg_ids: number[] };
        Returns: Json;
      };
      retry_all_instagram_imports: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      retry_all_raindrop_imports: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      retry_all_twitter_imports: { Args: { p_user_id: string }; Returns: Json };
      retry_instagram_import: {
        Args: { p_msg_ids: number[]; p_user_id: string };
        Returns: Json;
      };
      retry_raindrop_import: {
        Args: { p_msg_ids: number[]; p_user_id: string };
        Returns: Json;
      };
      retry_twitter_import: {
        Args: { p_msg_ids: number[]; p_user_id: string };
        Returns: Json;
      };
      search_bookmarks: {
        Args: { search_text: string };
        Returns: {
          category_id: number;
          description: string;
          id: number;
          inserted_at: string;
          meta_data: Json;
          ogimage: string;
          screenshot: string;
          sort_index: string;
          title: string;
          trash: boolean;
          type: string;
          url: string;
          user_id: string;
        }[];
      };
      search_bookmarks_debug: {
        Args: { search_text: string };
        Returns: {
          caption: string;
          has_meta: boolean;
          id: number;
          title: string;
        }[];
      };
      search_bookmarks_debugging:
        | {
            Args: { search_text: string; url_scope: string };
            Returns: {
              category_id: number;
              description: string;
              id: number;
              inserted_at: string;
              meta_data: Json;
              ogimage: string;
              screenshot: string;
              sort_index: string;
              title: string;
              trash: boolean;
              type: string;
              url: string;
              user_id: string;
            }[];
          }
        | {
            Args: { search_text: string };
            Returns: {
              category_id: number;
              description: string;
              id: number;
              inserted_at: string;
              meta_data: Json;
              ogimage: string;
              screenshot: string;
              sort_index: string;
              title: string;
              trash: boolean;
              type: string;
              url: string;
              user_id: string;
            }[];
          };
      search_bookmarks_url_tag_scope:
        | {
            Args: {
              category_scope?: number;
              search_text?: string;
              tag_scope?: string[];
              url_scope?: string;
            };
            Returns: {
              added_categories: Json;
              added_tags: Json;
              description: string;
              id: number;
              inserted_at: string;
              make_discoverable: string;
              meta_data: Json;
              ogimage: string;
              screenshot: string;
              sort_index: string;
              title: string;
              trash: string;
              type: string;
              url: string;
              user_id: string;
            }[];
          }
        | {
            Args: {
              search_text?: string;
              tag_scope?: string[];
              url_scope?: string;
            };
            Returns: {
              added_tags: Json;
              category_id: number;
              description: string;
              id: number;
              inserted_at: string;
              meta_data: Json;
              ogimage: string;
              screenshot: string;
              sort_index: string;
              title: string;
              trash: boolean;
              type: string;
              url: string;
              user_id: string;
            }[];
          };
      set_bookmark_categories: {
        Args: { p_bookmark_id: number; p_category_ids: number[] };
        Returns: {
          bookmark_id: number;
          category_id: number;
          created_at: string;
          id: number;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          isOneToOne: false;
          isSetofReturn: true;
          to: "bookmark_categories";
        };
      };
      toggle_favorite_category: {
        Args: { p_category_id: number };
        Returns: {
          out_favorite_categories: number[];
          out_id: string;
        }[];
      };
      toggle_preferred_og_domain: {
        Args: { p_domain: string };
        Returns: {
          out_id: string;
          out_preferred_og_domains: string[];
        }[];
      };
      update_queue_message_error: {
        Args: { p_error: string; p_msg_id: number; p_queue_name: string };
        Returns: undefined;
      };
      user_owns_bookmark: {
        Args: { p_bookmark_id: number; p_user_id: string };
        Returns: boolean;
      };
    };
    Tables: {
      bookmark_categories: {
        Insert: {
          bookmark_id: number;
          category_id: number;
          created_at?: string;
          id?: number;
          user_id: string;
        };
        Relationships: [
          {
            columns: ["bookmark_id"];
            foreignKeyName: "bookmark_categories_bookmark_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "everything";
          },
          {
            columns: ["category_id"];
            foreignKeyName: "bookmark_categories_category_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "categories";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "bookmark_categories_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
        Row: {
          bookmark_id: number;
          category_id: number;
          created_at: string;
          id: number;
          user_id: string;
        };
        Update: {
          bookmark_id?: number;
          category_id?: number;
          created_at?: string;
          id?: number;
          user_id?: string;
        };
      };
      bookmark_tags: {
        Insert: {
          bookmark_id: number;
          created_at?: null | string;
          id?: number;
          tag_id: number;
          user_id?: null | string;
        };
        Relationships: [
          {
            columns: ["bookmark_id"];
            foreignKeyName: "bookmark_tags_bookmark_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "everything";
          },
          {
            columns: ["tag_id"];
            foreignKeyName: "bookmark_tags_tag_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "tags";
          },
        ];
        Row: {
          bookmark_id: number;
          created_at: null | string;
          id: number;
          tag_id: number;
          user_id: null | string;
        };
        Update: {
          bookmark_id?: number;
          created_at?: null | string;
          id?: number;
          tag_id?: number;
          user_id?: null | string;
        };
      };
      categories: {
        Insert: {
          category_name?: null | string;
          category_slug: string;
          category_views?: Json | null;
          created_at?: null | string;
          icon?: null | string;
          icon_color?: null | string;
          id?: number;
          is_public?: boolean;
          order_index?: null | number;
          user_id?: null | string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "categories_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
        Row: {
          category_name: null | string;
          category_slug: string;
          category_views: Json | null;
          created_at: null | string;
          icon: null | string;
          icon_color: null | string;
          id: number;
          is_public: boolean;
          order_index: null | number;
          user_id: null | string;
        };
        Update: {
          category_name?: null | string;
          category_slug?: string;
          category_views?: Json | null;
          created_at?: null | string;
          icon?: null | string;
          icon_color?: null | string;
          id?: number;
          is_public?: boolean;
          order_index?: null | number;
          user_id?: null | string;
        };
      };
      everything: {
        Insert: {
          category_id?: number;
          description?: null | string;
          id?: number;
          inserted_at?: string;
          make_discoverable?: null | string;
          meta_data?: Json | null;
          ogImage?: null | string;
          screenshot?: null | string;
          sort_index?: null | string;
          title?: null | string;
          trash?: null | string;
          type?: null | string;
          url?: null | string;
          user_id: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "everything_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
        Row: {
          category_id: number;
          description: null | string;
          id: number;
          inserted_at: string;
          make_discoverable: null | string;
          meta_data: Json | null;
          ogImage: null | string;
          screenshot: null | string;
          sort_index: null | string;
          title: null | string;
          trash: null | string;
          type: null | string;
          url: null | string;
          user_id: string;
        };
        Update: {
          category_id?: number;
          description?: null | string;
          id?: number;
          inserted_at?: string;
          make_discoverable?: null | string;
          meta_data?: Json | null;
          ogImage?: null | string;
          screenshot?: null | string;
          sort_index?: null | string;
          title?: null | string;
          trash?: null | string;
          type?: null | string;
          url?: null | string;
          user_id?: string;
        };
      };
      profiles: {
        Insert: {
          ai_features_toggle?: Json;
          api_key?: null | string;
          bookmark_count?: null | number;
          bookmarks_view?: Json | null;
          category_order?: null | number[];
          display_name?: null | string;
          email?: null | string;
          favorite_categories?: number[];
          id: string;
          last_synced_instagram_id?: null | string;
          last_synced_twitter_id?: null | string;
          preferred_og_domains?: null | string[];
          profile_pic?: null | string;
          provider?: null | string;
          user_name?: null | string;
        };
        Relationships: [];
        Row: {
          ai_features_toggle: Json;
          api_key: null | string;
          bookmark_count: null | number;
          bookmarks_view: Json | null;
          category_order: null | number[];
          display_name: null | string;
          email: null | string;
          favorite_categories: number[];
          id: string;
          last_synced_instagram_id: null | string;
          last_synced_twitter_id: null | string;
          preferred_og_domains: null | string[];
          profile_pic: null | string;
          provider: null | string;
          user_name: null | string;
        };
        Update: {
          ai_features_toggle?: Json;
          api_key?: null | string;
          bookmark_count?: null | number;
          bookmarks_view?: Json | null;
          category_order?: null | number[];
          display_name?: null | string;
          email?: null | string;
          favorite_categories?: number[];
          id?: string;
          last_synced_instagram_id?: null | string;
          last_synced_twitter_id?: null | string;
          preferred_og_domains?: null | string[];
          profile_pic?: null | string;
          provider?: null | string;
          user_name?: null | string;
        };
      };
      shared_categories: {
        Insert: {
          category_id: number;
          category_views?: Json;
          created_at?: null | string;
          edit_access?: boolean;
          email?: null | string;
          id?: number;
          is_accept_pending?: boolean | null;
          user_id: string;
        };
        Relationships: [
          {
            columns: ["category_id"];
            foreignKeyName: "shared_categories_category_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "categories";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "shared_categories_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
        Row: {
          category_id: number;
          category_views: Json;
          created_at: null | string;
          edit_access: boolean;
          email: null | string;
          id: number;
          is_accept_pending: boolean | null;
          user_id: string;
        };
        Update: {
          category_id?: number;
          category_views?: Json;
          created_at?: null | string;
          edit_access?: boolean;
          email?: null | string;
          id?: number;
          is_accept_pending?: boolean | null;
          user_id?: string;
        };
      };
      tags: {
        Insert: {
          created_at?: null | string;
          id?: number;
          name?: null | string;
          user_id?: null | string;
        };
        Relationships: [];
        Row: {
          created_at: null | string;
          id: number;
          name: null | string;
          user_id: null | string;
        };
        Update: {
          created_at?: null | string;
          id?: number;
          name?: null | string;
          user_id?: null | string;
        };
      };
    };
    Views: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | { schema: keyof DatabaseWithoutInternals }
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | { schema: keyof DatabaseWithoutInternals }
    | keyof DefaultSchema["Tables"],
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | { schema: keyof DatabaseWithoutInternals }
    | keyof DefaultSchema["Tables"],
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | { schema: keyof DatabaseWithoutInternals }
    | keyof DefaultSchema["Enums"],
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | { schema: keyof DatabaseWithoutInternals }
    | keyof DefaultSchema["CompositeTypes"],
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  pgmq_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
