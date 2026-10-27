export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "14.18";
	};
	public: {
		Tables: {
			bets: {
				Row: {
					answer_config: Json;
					answer_type: string;
					buy_in: number;
					closes_at: string;
					created_at: string;
					created_by: string;
					description: string | null;
					group_id: string;
					id: string;
					outcome_at: string | null;
					resolved_at: string | null;
					status: string;
					title: string;
					winner_id: string | null;
				};
				Insert: {
					answer_config: Json;
					answer_type?: string;
					buy_in: number;
					closes_at: string;
					created_at?: string;
					created_by?: string;
					description?: string | null;
					group_id: string;
					id?: string;
					outcome_at?: string | null;
					resolved_at?: string | null;
					status?: string;
					title: string;
					winner_id?: string | null;
				};
				Update: {
					answer_config?: Json;
					answer_type?: string;
					buy_in?: number;
					closes_at?: string;
					created_at?: string;
					created_by?: string;
					description?: string | null;
					group_id?: string;
					id?: string;
					outcome_at?: string | null;
					resolved_at?: string | null;
					status?: string;
					title?: string;
					winner_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "bets_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "bets_group_id_fkey";
						columns: ["group_id"];
						isOneToOne: false;
						referencedRelation: "groups";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "bets_winner_id_fkey";
						columns: ["winner_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					}
				];
			};
			group_invites: {
				Row: {
					group_id: string;
					token: string;
				};
				Insert: {
					group_id: string;
					token?: string;
				};
				Update: {
					group_id?: string;
					token?: string;
				};
				Relationships: [
					{
						foreignKeyName: "group_invites_group_id_fkey";
						columns: ["group_id"];
						isOneToOne: true;
						referencedRelation: "groups";
						referencedColumns: ["id"];
					}
				];
			};
			group_members: {
				Row: {
					group_id: string;
					joined_at: string;
					role: string;
					user_id: string;
				};
				Insert: {
					group_id: string;
					joined_at?: string;
					role?: string;
					user_id: string;
				};
				Update: {
					group_id?: string;
					joined_at?: string;
					role?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "group_members_group_id_fkey";
						columns: ["group_id"];
						isOneToOne: false;
						referencedRelation: "groups";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "group_members_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					}
				];
			};
			groups: {
				Row: {
					created_at: string;
					description: string | null;
					id: string;
					members_can_create_bets: boolean;
					name: string;
					owner_id: string;
					visibility: string;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					id?: string;
					members_can_create_bets?: boolean;
					name: string;
					owner_id?: string;
					visibility?: string;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					id?: string;
					members_can_create_bets?: boolean;
					name?: string;
					owner_id?: string;
					visibility?: string;
				};
				Relationships: [
					{
						foreignKeyName: "groups_owner_id_fkey";
						columns: ["owner_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					}
				];
			};
			profiles: {
				Row: {
					created_at: string;
					display_name: string;
					id: string;
				};
				Insert: {
					created_at?: string;
					display_name: string;
					id: string;
				};
				Update: {
					created_at?: string;
					display_name?: string;
					id?: string;
				};
				Relationships: [];
			};
			wagers: {
				Row: {
					bet_id: string;
					created_at: string;
					id: string;
					slot_start: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					bet_id: string;
					created_at?: string;
					id?: string;
					slot_start: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					bet_id?: string;
					created_at?: string;
					id?: string;
					slot_start?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "wagers_bet_id_fkey";
						columns: ["bet_id"];
						isOneToOne: false;
						referencedRelation: "bets";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "wagers_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					}
				];
			};
		};
		Views: {
			group_leaderboard: {
				Row: {
					bets_played: number | null;
					bets_won: number | null;
					display_name: string | null;
					group_id: string | null;
					points: number | null;
					user_id: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "group_members_group_id_fkey";
						columns: ["group_id"];
						isOneToOne: false;
						referencedRelation: "groups";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "group_members_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					}
				];
			};
		};
		Functions: {
			cancel_bet: { Args: { p_bet_id: string }; Returns: undefined };
			get_invite: {
				Args: { p_token: string };
				Returns: {
					group_id: string;
					member_count: number;
					name: string;
				}[];
			};
			join_group: {
				Args: { p_group_id: string; p_token?: string };
				Returns: string;
			};
			place_wager: {
				Args: { p_bet_id: string; p_slot_start: string };
				Returns: string;
			};
			regenerate_invite: { Args: { p_group_id: string }; Returns: string };
			resolve_bet: {
				Args: { p_bet_id: string; p_outcome_at: string };
				Returns: string;
			};
			withdraw_wager: { Args: { p_bet_id: string }; Returns: undefined };
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
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never) = never
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
		keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never) = never
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
		keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never) = never
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
		keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never) = never
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
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never) = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {}
	}
} as const;
