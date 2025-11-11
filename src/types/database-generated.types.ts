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
						referencedRelation: "bookmarks_table";
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
			bookmarks_table: {
				Row: {
					category_id: number;
					description: string | null;
					id: number;
					inserted_at: string;
					meta_data: Json | null;
					ogImage: string | null;
					screenshot: string | null;
					sort_index: string | null;
					title: string | null;
					trash: boolean;
					type: string | null;
					url: string | null;
					user_id: string;
				};
				Insert: {
					category_id?: number;
					description?: string | null;
					id?: number;
					inserted_at?: string;
					meta_data?: Json | null;
					ogImage?: string | null;
					screenshot?: string | null;
					sort_index?: string | null;
					title?: string | null;
					trash?: boolean;
					type?: string | null;
					url?: string | null;
					user_id: string;
				};
				Update: {
					category_id?: number;
					description?: string | null;
					id?: number;
					inserted_at?: string;
					meta_data?: Json | null;
					ogImage?: string | null;
					screenshot?: string | null;
					sort_index?: string | null;
					title?: string | null;
					trash?: boolean;
					type?: string | null;
					url?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "bookmarks_table_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "categories";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "bookmarks_table_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
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
			documents: {
				Row: {
					content: string | null;
					embedding: string | null;
					id: number;
					metadata: Json | null;
				};
				Insert: {
					content?: string | null;
					embedding?: string | null;
					id?: number;
					metadata?: Json | null;
				};
				Update: {
					content?: string | null;
					embedding?: string | null;
					id?: number;
					metadata?: Json | null;
				};
				Relationships: [];
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
			match_documents: {
				Args: { filter?: Json; match_count?: number; query_embedding: string };
				Returns: Array<{
					content: string;
					embedding: Json;
					id: number;
					metadata: Json;
					similarity: number;
				}>;
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
			search_bookmarks_debugging: {
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
	public: {
		Enums: {},
	},
} as const;
