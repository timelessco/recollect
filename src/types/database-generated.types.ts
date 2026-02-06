export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	pgmq_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
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
					to: "message_record";
					isOneToOne: false;
					isSetofReturn: true;
				};
			};
			read: {
				Args: { n: number; queue_name: string; sleep_seconds: number };
				Returns: unknown[];
				SetofOptions: {
					from: "*";
					to: "message_record";
					isOneToOne: false;
					isSetofReturn: true;
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
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			bookmark_categories: {
				Row: {
					bookmark_id: number;
					category_id: number;
					created_at: string;
					id: number;
					user_id: string;
				};
				Insert: {
					bookmark_id: number;
					category_id: number;
					created_at?: string;
					id?: number;
					user_id: string;
				};
				Update: {
					bookmark_id?: number;
					category_id?: number;
					created_at?: string;
					id?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "bookmark_categories_bookmark_id_fkey";
						columns: ["bookmark_id"];
						isOneToOne: false;
						referencedRelation: "everything";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "bookmark_categories_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "categories";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "bookmark_categories_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			bookmark_tags: {
				Row: {
					bookmark_id: number;
					created_at: string | null;
					id: number;
					tag_id: number;
					user_id: string | null;
				};
				Insert: {
					bookmark_id: number;
					created_at?: string | null;
					id?: number;
					tag_id: number;
					user_id?: string | null;
				};
				Update: {
					bookmark_id?: number;
					created_at?: string | null;
					id?: number;
					tag_id?: number;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "bookmark_tags_bookmark_id_fkey";
						columns: ["bookmark_id"];
						isOneToOne: false;
						referencedRelation: "everything";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "bookmark_tags_tag_id_fkey";
						columns: ["tag_id"];
						isOneToOne: false;
						referencedRelation: "tags";
						referencedColumns: ["id"];
					},
				];
			};
			categories: {
				Row: {
					category_name: string | null;
					category_slug: string;
					category_views: Json | null;
					created_at: string | null;
					icon: string | null;
					icon_color: string | null;
					id: number;
					is_public: boolean;
					order_index: number | null;
					user_id: string | null;
				};
				Insert: {
					category_name?: string | null;
					category_slug: string;
					category_views?: Json | null;
					created_at?: string | null;
					icon?: string | null;
					icon_color?: string | null;
					id?: number;
					is_public?: boolean;
					order_index?: number | null;
					user_id?: string | null;
				};
				Update: {
					category_name?: string | null;
					category_slug?: string;
					category_views?: Json | null;
					created_at?: string | null;
					icon?: string | null;
					icon_color?: string | null;
					id?: number;
					is_public?: boolean;
					order_index?: number | null;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "categories_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			everything: {
				Row: {
					category_id: number;
					description: string | null;
					id: number;
					inserted_at: string;
					make_discoverable: string | null;
					meta_data: Json | null;
					ogImage: string | null;
					screenshot: string | null;
					sort_index: string | null;
					title: string | null;
					trash: string | null;
					type: string | null;
					url: string | null;
					user_id: string;
				};
				Insert: {
					category_id?: number;
					description?: string | null;
					id?: number;
					inserted_at?: string;
					make_discoverable?: string | null;
					meta_data?: Json | null;
					ogImage?: string | null;
					screenshot?: string | null;
					sort_index?: string | null;
					title?: string | null;
					trash?: string | null;
					type?: string | null;
					url?: string | null;
					user_id: string;
				};
				Update: {
					category_id?: number;
					description?: string | null;
					id?: number;
					inserted_at?: string;
					make_discoverable?: string | null;
					meta_data?: Json | null;
					ogImage?: string | null;
					screenshot?: string | null;
					sort_index?: string | null;
					title?: string | null;
					trash?: string | null;
					type?: string | null;
					url?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "everything_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			profiles: {
				Row: {
					api_key: string | null;
					bookmark_count: number | null;
					bookmarks_view: Json | null;
					category_order: number[] | null;
					display_name: string | null;
					email: string | null;
					id: string;
					preferred_og_domains: string[] | null;
					profile_pic: string | null;
					provider: string | null;
					user_name: string | null;
				};
				Insert: {
					api_key?: string | null;
					bookmark_count?: number | null;
					bookmarks_view?: Json | null;
					category_order?: number[] | null;
					display_name?: string | null;
					email?: string | null;
					id: string;
					preferred_og_domains?: string[] | null;
					profile_pic?: string | null;
					provider?: string | null;
					user_name?: string | null;
				};
				Update: {
					api_key?: string | null;
					bookmark_count?: number | null;
					bookmarks_view?: Json | null;
					category_order?: number[] | null;
					display_name?: string | null;
					email?: string | null;
					id?: string;
					preferred_og_domains?: string[] | null;
					profile_pic?: string | null;
					provider?: string | null;
					user_name?: string | null;
				};
				Relationships: [];
			};
			shared_categories: {
				Row: {
					category_id: number;
					category_views: Json;
					created_at: string | null;
					edit_access: boolean;
					email: string | null;
					id: number;
					is_accept_pending: boolean | null;
					user_id: string;
				};
				Insert: {
					category_id: number;
					category_views?: Json;
					created_at?: string | null;
					edit_access?: boolean;
					email?: string | null;
					id?: number;
					is_accept_pending?: boolean | null;
					user_id: string;
				};
				Update: {
					category_id?: number;
					category_views?: Json;
					created_at?: string | null;
					edit_access?: boolean;
					email?: string | null;
					id?: number;
					is_accept_pending?: boolean | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "shared_categories_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "categories";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "shared_categories_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			tags: {
				Row: {
					created_at: string | null;
					id: number;
					name: string | null;
					user_id: string | null;
				};
				Insert: {
					created_at?: string | null;
					id?: number;
					name?: string | null;
					user_id?: string | null;
				};
				Update: {
					created_at?: string | null;
					id?: number;
					name?: string | null;
					user_id?: string | null;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			add_category_to_bookmarks: {
				Args: { p_bookmark_ids: number[]; p_category_id: number };
				Returns: Array<{
					out_bookmark_id: number;
					out_category_id: number;
				}>;
			};
			admin_get_instagram_archives: {
				Args: never;
				Returns: Array<{
					archived_at: string;
					failure_reason: string;
					msg_id: number;
					url: string;
					user_id: string;
				}>;
			};
			admin_retry_all_instagram_archives: { Args: never; Returns: Json };
			admin_retry_instagram_import: {
				Args: { p_msg_ids: number[] };
				Returns: Json;
			};
			archive_with_reason: {
				Args: { p_msg_id: number; p_queue_name: string; p_reason: string };
				Returns: boolean;
			};
			create_and_assign_tag: {
				Args: { p_bookmark_id: number; p_tag_name: string };
				Returns: Array<{
					bookmark_tag_bookmark_id: number;
					bookmark_tag_created_at: string;
					bookmark_tag_id: number;
					bookmark_tag_tag_id: number;
					bookmark_tag_user_id: string;
					tag_created_at: string;
					tag_id: number;
					tag_name: string;
					tag_user_id: string;
				}>;
			};
			enqueue_raindrop_bookmarks: {
				Args: { p_bookmarks: Json; p_user_id: string };
				Returns: Json;
			};
			get_instagram_sync_status: { Args: { p_user_id: string }; Returns: Json };
			get_instagram_worker_failures: {
				Args: { p_since_minutes?: number };
				Returns: Array<{
					created_at: string;
					error_body: string;
					request_id: number;
					status_code: number;
				}>;
			};
			get_raindrop_sync_status: { Args: { p_user_id: string }; Returns: Json };
			invoke_instagram_worker: { Args: never; Returns: number };
			invoke_raindrop_worker: { Args: never; Returns: number };
			process_instagram_bookmark: {
				Args: {
					p_collection_names?: string[];
					p_description?: string;
					p_meta_data?: Json;
					p_msg_id?: number;
					p_og_image?: string;
					p_saved_at?: string;
					p_title?: string;
					p_type: string;
					p_url: string;
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
			remove_category_from_bookmark: {
				Args: { p_bookmark_id: number; p_category_id: number };
				Returns: Array<{
					added_uncategorized: boolean;
					deleted_category_id: number;
				}>;
			};
			retry_all_instagram_imports: {
				Args: { p_user_id: string };
				Returns: Json;
			};
			retry_all_raindrop_imports: {
				Args: { p_user_id: string };
				Returns: Json;
			};
			retry_instagram_import: {
				Args: { p_msg_ids: number[]; p_user_id: string };
				Returns: Json;
			};
			retry_raindrop_import: {
				Args: { p_msg_ids: number[]; p_user_id: string };
				Returns: Json;
			};
			search_bookmarks: {
				Args: { search_text: string };
				Returns: Array<{
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
				}>;
			};
			search_bookmarks_debug: {
				Args: { search_text: string };
				Returns: Array<{
					caption: string;
					has_meta: boolean;
					id: number;
					title: string;
				}>;
			};
			search_bookmarks_debugging:
				| {
						Args: { search_text: string };
						Returns: Array<{
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
						}>;
				  }
				| {
						Args: { search_text: string; url_scope: string };
						Returns: Array<{
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
						}>;
				  };
			search_bookmarks_url_tag_scope:
				| {
						Args: {
							search_text?: string;
							tag_scope?: string[];
							url_scope?: string;
						};
						Returns: Array<{
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
						}>;
				  }
				| {
						Args: {
							category_scope?: number;
							search_text?: string;
							tag_scope?: string[];
							url_scope?: string;
						};
						Returns: Array<{
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
						}>;
				  };
			set_bookmark_categories: {
				Args: { p_bookmark_id: number; p_category_ids: number[] };
				Returns: Array<{
					bookmark_id: number;
					category_id: number;
					created_at: string;
					id: number;
					user_id: string;
				}>;
				SetofOptions: {
					from: "*";
					to: "bookmark_categories";
					isOneToOne: false;
					isSetofReturn: true;
				};
			};
			toggle_preferred_og_domain: {
				Args: { p_domain: string };
				Returns: Array<{
					out_id: string;
					out_preferred_og_domains: string[];
				}>;
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
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
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
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
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
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
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
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
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
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
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
