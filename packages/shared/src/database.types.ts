export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      billing_events: {
        Row: {
          id: string;
          provider: string;
          received_at: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          id: string;
          provider: string;
          received_at?: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          provider?: string;
          received_at?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      card_sets: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          public_slug: string | null;
          release_date: string | null;
          season: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          public_slug?: string | null;
          release_date?: string | null;
          season: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          public_slug?: string | null;
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
          public_slug: string | null;
          set_id: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_rookie?: boolean;
          number: string;
          player_id: string;
          public_slug?: string | null;
          set_id: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_rookie?: boolean;
          number?: string;
          player_id?: string;
          public_slug?: string | null;
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
      cardsight_cache: {
        Row: {
          body: NonNullable<Json>;
          cache_key: string;
          expires_at: string;
          fetched_at: string;
        };
        Insert: {
          body: NonNullable<Json>;
          cache_key: string;
          expires_at: string;
          fetched_at?: string;
        };
        Update: {
          body?: NonNullable<Json>;
          cache_key?: string;
          expires_at?: string;
          fetched_at?: string;
        };
        Relationships: [];
      };
      cardsight_cards: {
        Row: {
          card_id: string;
          cardsight_card_id: string;
          mapped_at: string;
          matched_by: string;
        };
        Insert: {
          card_id: string;
          cardsight_card_id: string;
          mapped_at?: string;
          matched_by?: string;
        };
        Update: {
          card_id?: string;
          cardsight_card_id?: string;
          mapped_at?: string;
          matched_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cardsight_cards_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: true;
            referencedRelation: 'cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cardsight_cards_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: true;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['card_id'];
          },
        ];
      };
      cardsight_parallels: {
        Row: {
          cardsight_parallel_id: string;
          mapped_at: string;
          name: string;
          set_id: string;
        };
        Insert: {
          cardsight_parallel_id: string;
          mapped_at?: string;
          name: string;
          set_id: string;
        };
        Update: {
          cardsight_parallel_id?: string;
          mapped_at?: string;
          name?: string;
          set_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cardsight_parallels_set_id_fkey';
            columns: ['set_id'];
            isOneToOne: false;
            referencedRelation: 'card_sets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cardsight_parallels_set_id_fkey';
            columns: ['set_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['set_id'];
          },
        ];
      };
      cardsight_sets: {
        Row: {
          base_set_card_count: number | null;
          base_set_id: string;
          mapped_at: string;
          release_id: string;
          release_name: string;
          set_id: string;
        };
        Insert: {
          base_set_card_count?: number | null;
          base_set_id: string;
          mapped_at?: string;
          release_id: string;
          release_name: string;
          set_id: string;
        };
        Update: {
          base_set_card_count?: number | null;
          base_set_id?: string;
          mapped_at?: string;
          release_id?: string;
          release_name?: string;
          set_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cardsight_sets_set_id_fkey';
            columns: ['set_id'];
            isOneToOne: true;
            referencedRelation: 'card_sets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cardsight_sets_set_id_fkey';
            columns: ['set_id'];
            isOneToOne: true;
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
          price_kind: string;
          sale_at: string | null;
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
          price_kind?: string;
          sale_at?: string | null;
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
          price_kind?: string;
          sale_at?: string | null;
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
      import_reviews: {
        Row: {
          created_at: string;
          id: string;
          raw: NonNullable<Json>;
          reason: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          raw: NonNullable<Json>;
          reason: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          raw?: NonNullable<Json>;
          reason?: string;
          user_id?: string;
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
      lifetime_purchases: {
        Row: {
          amount_cents: number | null;
          platform: string;
          purchased_at: string;
          reference: string;
          user_id: string;
        };
        Insert: {
          amount_cents?: number | null;
          platform: string;
          purchased_at?: string;
          reference: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number | null;
          platform?: string;
          purchased_at?: string;
          reference?: string;
          user_id?: string;
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
      player_aliases: {
        Row: {
          alias: string;
          alias_key: string;
          created_at: string;
          old_public_slug: string | null;
          old_slug: string | null;
          player_id: string;
          source: string;
        };
        Insert: {
          alias: string;
          alias_key: string;
          created_at?: string;
          old_public_slug?: string | null;
          old_slug?: string | null;
          player_id: string;
          source: string;
        };
        Update: {
          alias?: string;
          alias_key?: string;
          created_at?: string;
          old_public_slug?: string | null;
          old_slug?: string | null;
          player_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'player_aliases_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items_detailed';
            referencedColumns: ['player_id'];
          },
          {
            foreignKeyName: 'player_aliases_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
      player_distinct: {
        Row: {
          key_a: string;
          key_b: string;
          note: string | null;
        };
        Insert: {
          key_a: string;
          key_b: string;
          note?: string | null;
        };
        Update: {
          key_a?: string;
          key_b?: string;
          note?: string | null;
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
          team: string | null;
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
          team?: string | null;
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
          team?: string | null;
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
          public_slug: string | null;
          slug: string;
          team: string | null;
        };
        Insert: {
          created_at?: string;
          highlightly_id?: number | null;
          id?: string;
          name: string;
          public_slug?: string | null;
          slug: string;
          team?: string | null;
        };
        Update: {
          created_at?: string;
          highlightly_id?: number | null;
          id?: string;
          name?: string;
          public_slug?: string | null;
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
      price_coverage: {
        Row: {
          day: string;
          priced: number;
          reason: string;
          requested: number;
          skipped: number;
        };
        Insert: {
          day: string;
          priced?: number;
          reason: string;
          requested?: number;
          skipped?: number;
        };
        Update: {
          day?: string;
          priced?: number;
          reason?: string;
          requested?: number;
          skipped?: number;
        };
        Relationships: [];
      };
      price_listings: {
        Row: {
          fetched_at: string;
          grade: Database['public']['Enums']['grade'];
          id: number;
          listed_at: string;
          listing_type: string;
          parallel_id: string;
          price_cents: number;
          source: string;
        };
        Insert: {
          fetched_at?: string;
          grade: Database['public']['Enums']['grade'];
          id?: never;
          listed_at: string;
          listing_type: string;
          parallel_id: string;
          price_cents: number;
          source: string;
        };
        Update: {
          fetched_at?: string;
          grade?: Database['public']['Enums']['grade'];
          id?: never;
          listed_at?: string;
          listing_type?: string;
          parallel_id?: string;
          price_cents?: number;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_listings_parallel_id_fkey';
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
          price_kind: string;
          sale_at: string | null;
          sample_size: number;
          source: string;
        };
        Insert: {
          captured_at?: string;
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          price_cents: number;
          price_kind?: string;
          sale_at?: string | null;
          sample_size?: number;
          source: string;
        };
        Update: {
          captured_at?: string;
          grade?: Database['public']['Enums']['grade'];
          parallel_id?: string;
          price_cents?: number;
          price_kind?: string;
          sale_at?: string | null;
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
          digest_frequency: string;
          email: string | null;
          id: string;
          is_premium: boolean;
          marketing_consent_at: string | null;
          marketing_consent_source: string | null;
          premium_source: string | null;
          premium_until: string | null;
          push_token: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          unsubscribe_token: string;
        };
        Insert: {
          created_at?: string;
          digest_frequency?: string;
          email?: string | null;
          id: string;
          is_premium?: boolean;
          marketing_consent_at?: string | null;
          marketing_consent_source?: string | null;
          premium_source?: string | null;
          premium_until?: string | null;
          push_token?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          unsubscribe_token?: string;
        };
        Update: {
          created_at?: string;
          digest_frequency?: string;
          email?: string | null;
          id?: string;
          is_premium?: boolean;
          marketing_consent_at?: string | null;
          marketing_consent_source?: string | null;
          premium_source?: string | null;
          premium_until?: string | null;
          push_token?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          unsubscribe_token?: string;
        };
        Relationships: [];
      };
      set_releases: {
        Row: {
          box_config: string | null;
          created_at: string;
          name: string;
          notes: string | null;
          public_slug: string;
          release_date: string | null;
          season: string;
          slug: string;
          source_url: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          box_config?: string | null;
          created_at?: string;
          name: string;
          notes?: string | null;
          public_slug: string;
          release_date?: string | null;
          season: string;
          slug: string;
          source_url?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          box_config?: string | null;
          created_at?: string;
          name?: string;
          notes?: string | null;
          public_slug?: string;
          release_date?: string | null;
          season?: string;
          slug?: string;
          source_url?: string | null;
          status?: string;
          updated_at?: string;
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
          change_24h_cents: number | null;
          created_at: string | null;
          current_cents: number | null;
          gain_cents: number | null;
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
          price_kind: string | null;
          sale_at: string | null;
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
          price_kind?: string | null;
          sale_at?: string | null;
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
          price_kind?: string | null;
          sale_at?: string | null;
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
      page_index_status: {
        Row: {
          id: string | null;
          indexable: boolean | null;
          kind: string | null;
          lastmod: string | null;
          public_slug: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      cardsight_targets: {
        Args: { p_mode?: string };
        Returns: {
          card_id: string;
          card_number: string;
          cardsight_card_id: string;
          cardsight_parallel_id: string;
          current_cents: number;
          current_kind: string;
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          parallel_name: string;
          player_name: string;
          priority: number;
          reason: string;
          season: string;
          serial_run: number;
          set_name: string;
        }[];
      };
      cardsight_unmapped_count: { Args: { p_mode?: string }; Returns: number };
      change_24h_cents: {
        Args: { p_grade: Database['public']['Enums']['grade']; p_parallel_id: string };
        Returns: number;
      };
      collection_export: {
        Args: Record<PropertyKey, never>;
        Returns: {
          added_at: string;
          card_number: string;
          change_24h_cents: number;
          change_30d_cents: number;
          current_cents: number;
          gain_cents: number;
          grade: Database['public']['Enums']['grade'];
          is_rookie: boolean;
          parallel_name: string;
          player_name: string;
          purchase_cents: number;
          season: string;
          serial_number: number;
          serial_run: number;
          set_name: string;
        }[];
      };
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
      founders_lifetime_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          available: boolean;
          cap: number;
          enabled: boolean;
          ends_at: string;
          remaining: number;
          sold: number;
        }[];
      };
      full_pass_pairs: {
        Args: Record<PropertyKey, never>;
        Returns: {
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          priority: number;
          reason: string;
        }[];
      };
      grant_lifetime: {
        Args: {
          p_amount_cents?: number;
          p_platform: string;
          p_reference: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      import_collection: {
        Args: { p_items: Json; p_reviews?: Json };
        Returns: {
          inserted: number;
          limit_reached: boolean;
          reviews_saved: number;
          skipped: number;
        }[];
      };
      import_set_key: { Args: { p_name: string }; Returns: string };
      invoke_job: { Args: { p_body?: Json; p_job: string }; Returns: number };
      is_premium: { Args: { uid?: string }; Returns: boolean };
      match_import_rows: {
        Args: { p_rows: Json };
        Returns: {
          candidates: Json;
          card_id: string;
          card_number: string;
          card_slug: string;
          parallel_id: string;
          parallel_name: string;
          parallels: Json;
          player_name: string;
          row_index: number;
          score: number;
          season: string;
          serial_run: number;
          set_name: string;
          status: string;
        }[];
      };
      merge_players: {
        Args: { p_canonical: string; p_duplicate: string; p_source?: string };
        Returns: undefined;
      };
      morning_email_recipients: {
        Args: { p_day?: string };
        Returns: {
          due: boolean;
          effective_frequency: string;
          email: string;
          headline_player: string;
          headline_points: number;
          is_premium: boolean;
          players_count: number;
          unsubscribe_token: string;
          user_id: string;
          value_change_cents: number;
        }[];
      };
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
          priority: number;
          reason: string;
          season: string;
          serial_run: number;
          set_name: string;
        }[];
      };
      player_base_key: { Args: { p_name: string }; Returns: string };
      player_current_team: { Args: { p_player_id: string }; Returns: string };
      player_form: { Args: { p_games?: number; p_player_id: string }; Returns: Json };
      player_key: { Args: { p_name: string }; Returns: string };
      players_distinct: { Args: { p_a: string; p_b: string }; Returns: boolean };
      price_at: {
        Args: {
          p_at: string;
          p_grade: Database['public']['Enums']['grade'];
          p_parallel_id: string;
        };
        Returns: number;
      };
      price_call_budget: { Args: Record<PropertyKey, never>; Returns: number };
      price_history: {
        Args: { p_grade: Database['public']['Enums']['grade']; p_parallel_id: string };
        Returns: {
          captured_at: string;
          price_cents: number;
          sample_size: number;
        }[];
      };
      public_last_night: {
        Args: {
          p_day?: string;
          p_limit?: number;
          p_min_price_cents?: number;
          p_min_sample?: number;
        };
        Returns: Json;
      };
      public_last_night_days: {
        Args: { p_limit?: number };
        Returns: {
          game_day: string;
          games: number;
        }[];
      };
      public_movers_window: {
        Args: {
          p_days?: number;
          p_limit?: number;
          p_min_price_cents?: number;
          p_min_sample?: number;
        };
        Returns: Json;
      };
      public_price_history: {
        Args: { p_card_slug: string; p_days?: number };
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
          p_price_kind?: string;
          p_sale_at?: string;
          p_sample_size?: number;
          p_source: string;
        };
        Returns: boolean;
      };
      record_price_coverage: {
        Args: {
          p_day: string;
          p_priced: number;
          p_reason: string;
          p_requested: number;
          p_skipped: number;
        };
        Returns: undefined;
      };
      refresh_public_slugs: { Args: Record<PropertyKey, never>; Returns: undefined };
      resolve_player_names: {
        Args: { p_names: string[] };
        Returns: {
          name: string;
          note: string;
          player_id: string;
          player_name: string;
          status: string;
        }[];
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
      showcase_pairs: {
        Args: Record<PropertyKey, never>;
        Returns: {
          grade: Database['public']['Enums']['grade'];
          parallel_id: string;
          priority: number;
          reason: string;
        }[];
      };
      site_freshness: { Args: Record<PropertyKey, never>; Returns: Json };
      start_job_run: { Args: { p_job: string; p_run_key: string }; Returns: boolean };
      top_players_recent: {
        Args: { p_limit?: number; p_window_days?: number };
        Returns: {
          followers: number;
          games: number;
          player_id: string;
          score: number;
        }[];
      };
      unsubscribe_by_token: { Args: { p_scope?: string; p_token: string }; Returns: boolean };
      usage_report: {
        Args: Record<PropertyKey, never>;
        Returns: {
          metric: string;
          note: string;
          unit: string;
          value: number;
        }[];
      };
      web_scanner_enabled: { Args: Record<PropertyKey, never>; Returns: boolean };
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
