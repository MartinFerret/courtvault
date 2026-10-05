export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      card_sets: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          release_date: string | null;
          season: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          release_date?: string | null;
          season: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          release_date?: string | null;
          season?: string;
          slug?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          created_at: string;
          id: string;
          is_rookie: boolean;
          number: string;
          player_id: string;
          set_id: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_rookie?: boolean;
          number: string;
          player_id: string;
          set_id: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_rookie?: boolean;
          number?: string;
          player_id?: string;
          set_id?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cards_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['player_id'];
          },
          {
            foreignKeyName: 'cards_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cards_set_id_fkey';
            columns: ['set_id'];
            isOneToOne: false;
            referencedRelation: 'card_sets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cards_set_id_fkey';
            columns: ['set_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['set_id'];
          },
        ];
      };
      checklist_follows: {
        Row: {
          created_at: string;
          set_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          set_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          set_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_follows_set_id_fkey';
            columns: ['set_id'];
            isOneToOne: false;
            referencedRelation: 'card_sets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checklist_follows_set_id_fkey';
            columns: ['set_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['set_id'];
          },
        ];
      };
      collection_items: {
        Row: {
          created_at: string;
          grade: Database['public']['Enums']['grade'];
          id: string;
          parallel_id: string;
          photo_path: string | null;
          purchase_cents: number | null;
          serial_number: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          grade?: Database['public']['Enums']['grade'];
          id?: string;
          parallel_id: string;
          photo_path?: string | null;
          purchase_cents?: number | null;
          serial_number?: number | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          grade?: Database['public']['Enums']['grade'];
          id?: string;
          parallel_id?: string;
          photo_path?: string | null;
          purchase_cents?: number | null;
          serial_number?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collection_items_parallel_id_fkey';
            columns: ['parallel_id'];
            isOneToOne: false;
            referencedRelation: 'parallels';
            referencedColumns: ['id'];
          },
        ];
      };
      current_prices: {
        Row: {
          buy_url: string | null;
          captured_at: string;
          checked_at: string;
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          price_cents: number;
          sample_size: number;
          source: string;
        };
        Insert: {
          buy_url?: string | null;
          captured_at: string;
          checked_at?: string;
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          price_cents: number;
          sample_size?: number;
          source: string;
        };
        Update: {
          buy_url?: string | null;
          captured_at?: string;
          checked_at?: string;
          grade?: Database['public']['Enums']['grade'];
          parallel_id?: string;
          price_cents?: number;
          sample_size?: number;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'current_prices_parallel_id_fkey';
            columns: ['parallel_id'];
            isOneToOne: false;
            referencedRelation: 'parallels';
            referencedColumns: ['id'];
          },
        ];
      };
      followed_players: {
        Row: {
          created_at: string;
          player_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          player_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          player_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'followed_players_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['player_id'];
          },
          {
            foreignKeyName: 'followed_players_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
      games: {
        Row: {
          away_score: number | null;
          away_team: string;
          created_at: string;
          external_id: string;
          game_day: string;
          home_score: number | null;
          home_team: string;
          id: string;
          starts_at: string | null;
          status: string;
        };
        Insert: {
          away_score?: number | null;
          away_team: string;
          created_at?: string;
          external_id: string;
          game_day: string;
          home_score?: number | null;
          home_team: string;
          id?: string;
          starts_at?: string | null;
          status?: string;
        };
        Update: {
          away_score?: number | null;
          away_team?: string;
          created_at?: string;
          external_id?: string;
          game_day?: string;
          home_score?: number | null;
          home_team?: string;
          id?: string;
          starts_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      job_runs: {
        Row: {
          details: Json | null;
          error: string | null;
          finished_at: string | null;
          id: number;
          job: string;
          run_key: string;
          started_at: string;
          status: string;
        };
        Insert: {
          details?: Json | null;
          error?: string | null;
          finished_at?: string | null;
          id?: never;
          job: string;
          run_key: string;
          started_at?: string;
          status: string;
        };
        Update: {
          details?: Json | null;
          error?: string | null;
          finished_at?: string | null;
          id?: never;
          job?: string;
          run_key?: string;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      parallels: {
        Row: {
          card_id: string;
          created_at: string;
          id: string;
          name: string;
          serial_run: number | null;
        };
        Insert: {
          card_id: string;
          created_at?: string;
          id?: string;
          name: string;
          serial_run?: number | null;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          serial_run?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'parallels_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parallels_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['card_id'];
          },
        ];
      };
      plan_limits: {
        Row: {
          description: string | null;
          free_value: number | null;
          key: string;
          premium_value: number | null;
        };
        Insert: {
          description?: string | null;
          free_value?: number | null;
          key: string;
          premium_value?: number | null;
        };
        Update: {
          description?: string | null;
          free_value?: number | null;
          key?: string;
          premium_value?: number | null;
        };
        Relationships: [];
      };
      player_game_lines: {
        Row: {
          assists: number | null;
          blocks: number | null;
          created_at: string;
          game_id: string;
          id: string;
          minutes: number | null;
          player_id: string;
          points: number | null;
          raw: Json | null;
          rebounds: number | null;
          steals: number | null;
        };
        Insert: {
          assists?: number | null;
          blocks?: number | null;
          created_at?: string;
          game_id: string;
          id?: string;
          minutes?: number | null;
          player_id: string;
          points?: number | null;
          raw?: Json | null;
          rebounds?: number | null;
          steals?: number | null;
        };
        Update: {
          assists?: number | null;
          blocks?: number | null;
          created_at?: string;
          game_id?: string;
          id?: string;
          minutes?: number | null;
          player_id?: string;
          points?: number | null;
          raw?: Json | null;
          rebounds?: number | null;
          steals?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'player_game_lines_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'player_game_lines_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['player_id'];
          },
          {
            foreignKeyName: 'player_game_lines_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
      players: {
        Row: {
          created_at: string;
          highlightly_id: number | null;
          id: string;
          name: string;
          slug: string;
          team: string | null;
        };
        Insert: {
          created_at?: string;
          highlightly_id?: number | null;
          id?: string;
          name: string;
          slug: string;
          team?: string | null;
        };
        Update: {
          created_at?: string;
          highlightly_id?: number | null;
          id?: string;
          name?: string;
          slug?: string;
          team?: string | null;
        };
        Relationships: [];
      };
      price_alerts: {
        Row: {
          below_cents: number;
          created_at: string;
          grade: Database['public']['Enums']['grade'];
          id: string;
          parallel_id: string;
          triggered_at: string | null;
          user_id: string;
        };
        Insert: {
          below_cents: number;
          created_at?: string;
          grade?: Database['public']['Enums']['grade'];
          id?: string;
          parallel_id: string;
          triggered_at?: string | null;
          user_id?: string;
        };
        Update: {
          below_cents?: number;
          created_at?: string;
          grade?: Database['public']['Enums']['grade'];
          id?: string;
          parallel_id?: string;
          triggered_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_alerts_parallel_id_fkey';
            columns: ['parallel_id'];
            isOneToOne: false;
            referencedRelation: 'parallels';
            referencedColumns: ['id'];
          },
        ];
      };
      price_points: {
        Row: {
          captured_at: string;
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          price_cents: number;
          sample_size: number;
          source: string;
        };
        Insert: {
          captured_at?: string;
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          price_cents: number;
          sample_size?: number;
          source: string;
        };
        Update: {
          captured_at?: string;
          grade?: Database['public']['Enums']['grade'];
          parallel_id?: string;
          price_cents?: number;
          sample_size?: number;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_points_parallel_id_fkey';
            columns: ['parallel_id'];
            isOneToOne: false;
            referencedRelation: 'parallels';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          is_premium: boolean;
          premium_until: string | null;
          push_token: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          is_premium?: boolean;
          premium_until?: string | null;
          push_token?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_premium?: boolean;
          premium_until?: string | null;
          push_token?: string | null;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          source: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          source?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          source?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      collection_items_detailed: {
        Row: {
          buy_url: string | null;
          card_id: string | null;
          card_number: string | null;
          card_slug: string | null;
          created_at: string | null;
          current_cents: number | null;
          grade: Database['public']['Enums']['grade'] | null;
          id: string | null;
          is_rookie: boolean | null;
          parallel_id: string | null;
          parallel_name: string | null;
          photo_path: string | null;
          player_id: string | null;
          player_name: string | null;
          player_slug: string | null;
          price_captured_at: string | null;
          purchase_cents: number | null;
          season: string | null;
          serial_number: number | null;
          serial_run: number | null;
          set_id: string | null;
          set_name: string | null;
          set_slug: string | null;
          team: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'collection_items_parallel_id_fkey';
            columns: ['parallel_id'];
            isOneToOne: false;
            referencedRelation: 'parallels';
            referencedColumns: ['id'];
          },
        ];
      };
      latest_prices: {
        Row: {
          buy_url: string | null;
          captured_at: string | null;
          checked_at: string | null;
          grade: Database['public']['Enums']['grade'] | null;
          parallel_id: string | null;
          price_cents: number | null;
          sample_size: number | null;
          source: string | null;
        };
        Insert: {
          buy_url?: string | null;
          captured_at?: string | null;
          checked_at?: string | null;
          grade?: Database['public']['Enums']['grade'] | null;
          parallel_id?: string | null;
          price_cents?: number | null;
          sample_size?: number | null;
          source?: string | null;
        };
        Update: {
          buy_url?: string | null;
          captured_at?: string | null;
          checked_at?: string | null;
          grade?: Database['public']['Enums']['grade'] | null;
          parallel_id?: string | null;
          price_cents?: number | null;
          sample_size?: number | null;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'current_prices_parallel_id_fkey';
            columns: ['parallel_id'];
            isOneToOne: false;
            referencedRelation: 'parallels';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      collection_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          added_cents: number;
          change_24h_cents: number;
          gain_cents: number;
          invested_cents: number;
          is_premium: boolean;
          item_count: number;
          market_change_cents: number;
          total_cents: number;
        }[];
      };
      compact_price_points: {
        Args: Record<PropertyKey, never>;
        Returns: {
          deleted_monthly: number;
          deleted_weekly: number;
        }[];
      };
      finish_job_run: {
        Args: {
          p_details?: Json;
          p_error?: string;
          p_job: string;
          p_run_key: string;
          p_status: string;
        };
        Returns: undefined;
      };
      invoke_job: { Args: { p_body?: Json; p_job: string }; Returns: number };
      is_premium: { Args: { uid?: string }; Returns: boolean };
      morning_recipients: {
        Args: { p_day?: string };
        Returns: {
          headline_player: string;
          headline_points: number;
          players_count: number;
          push_token: string;
          user_id: string;
          value_change_cents: number;
        }[];
      };
      morning_report: {
        Args: { p_day?: string };
        Returns: Database['public']['CompositeTypes']['morning_report_row'][];
        SetofOptions: {
          from: '*';
          to: 'morning_report_row';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      morning_report_for: {
        Args: { p_day?: string; p_uid: string };
        Returns: Database['public']['CompositeTypes']['morning_report_row'][];
        SetofOptions: {
          from: '*';
          to: 'morning_report_row';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      parallels_to_price: {
        Args: { p_rookie_limit?: number };
        Returns: {
          card_number: string;
          current_cents: number;
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          parallel_name: string;
          player_name: string;
          reason: string;
          season: string;
          serial_run: number;
          set_name: string;
        }[];
      };
      price_at: {
        Args: {
          p_at: string;
          p_grade: Database['public']['Enums']['grade'];
          p_parallel_id: string;
        };
        Returns: number;
      };
      price_history: {
        Args: { p_grade: Database['public']['Enums']['grade']; p_parallel_id: string };
        Returns: {
          captured_at: string;
          price_cents: number;
          sample_size: number;
        }[];
      };
      record_price: {
        Args: {
          p_buy_url?: string;
          p_captured_at?: string;
          p_grade: Database['public']['Enums']['grade'];
          p_parallel_id: string;
          p_price_cents: number;
          p_sample_size?: number;
          p_source: string;
        };
        Returns: boolean;
      };
      rookie_rankings: {
        Args: { p_limit?: number };
        Returns: {
          card_id: string;
          card_number: string;
          card_slug: string;
          change_7d_cents: number;
          parallel_id: string;
          player_id: string;
          player_name: string;
          player_slug: string;
          price_captured_at: string;
          price_cents: number;
          season: string;
          set_id: string;
          set_name: string;
          set_slug: string;
          team: string;
        }[];
      };
      search_catalog: {
        Args: { p_limit?: number; q: string };
        Returns: {
          id: string;
          kind: string;
          score: number;
          slug: string;
          subtitle: string;
          title: string;
        }[];
      };
      set_progress: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_followed: boolean;
          owned_cards: number;
          season: string;
          set_id: string;
          set_name: string;
          set_slug: string;
          total_cards: number;
        }[];
      };
      start_job_run: { Args: { p_job: string; p_run_key: string }; Returns: boolean };
      usage_report: {
        Args: Record<PropertyKey, never>;
        Returns: {
          metric: string;
          note: string;
          unit: string;
          value: number;
        }[];
      };
      within_photo_cap: { Args: { uid: string }; Returns: boolean };
    };
    Enums: {
      grade: 'RAW' | 'PSA9' | 'PSA10';
    };
    CompositeTypes: {
      morning_report_row: {
        game_day: string | null;
        player_id: string | null;
        player_name: string | null;
        player_slug: string | null;
        team: string | null;
        is_followed: boolean | null;
        is_owned: boolean | null;
        locked: boolean | null;
        game_id: string | null;
        home_team: string | null;
        away_team: string | null;
        home_score: number | null;
        away_score: number | null;
        minutes: number | null;
        points: number | null;
        rebounds: number | null;
        assists: number | null;
        steals: number | null;
        blocks: number | null;
        cards_count: number | null;
        value_before_cents: number | null;
        value_after_cents: number | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      grade: ['RAW', 'PSA9', 'PSA10'],
    },
  },
} as const;
