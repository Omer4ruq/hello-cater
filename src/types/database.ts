/**
 * AUTO-GENERATED — do not edit by hand.
 * Run `npm run db:types` after changing supabase/migrations.
 * Source of truth: supabase/migrations/*.sql
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
      analytics_events: {
        Row: {
        id: number;
        name: string;
        profile_id: string | null;
        anonymous_id: string | null;
        properties: Json;
        path: string | null;
        referrer: string | null;
        created_at: string;
        };
        Insert: {
        id?: number;
        name: string;
        profile_id?: string | null;
        anonymous_id?: string | null;
        properties?: Json;
        path?: string | null;
        referrer?: string | null;
        created_at?: string;
        };
        Update: {
        id?: number;
        name?: string;
        profile_id?: string | null;
        anonymous_id?: string | null;
        properties?: Json;
        path?: string | null;
        referrer?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'analytics_events_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      areas: {
        Row: {
        id: string;
        city_id: string;
        slug: string;
        name: string;
        name_bn: string | null;
        postcode: string | null;
        latitude: number | null;
        longitude: number | null;
        sort_order: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        city_id: string;
        slug: string;
        name: string;
        name_bn?: string | null;
        postcode?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        sort_order?: number;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        city_id?: string;
        slug?: string;
        name?: string;
        name_bn?: string | null;
        postcode?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        sort_order?: number;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'areas_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: {
        id: number;
        actor_id: string | null;
        actor_role: string | null;
        action: string;
        entity: string;
        entity_id: string | null;
        summary: string | null;
        before_data: Json | null;
        after_data: Json | null;
        ip_address: string | null;
        user_agent: string | null;
        request_id: string | null;
        created_at: string;
        };
        Insert: {
        id?: number;
        actor_id?: string | null;
        actor_role?: string | null;
        action: string;
        entity: string;
        entity_id?: string | null;
        summary?: string | null;
        before_data?: Json | null;
        after_data?: Json | null;
        ip_address?: string | null;
        user_agent?: string | null;
        request_id?: string | null;
        created_at?: string;
        };
        Update: {
        id?: number;
        actor_id?: string | null;
        actor_role?: string | null;
        action?: string;
        entity?: string;
        entity_id?: string | null;
        summary?: string | null;
        before_data?: Json | null;
        after_data?: Json | null;
        ip_address?: string | null;
        user_agent?: string | null;
        request_id?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_items: {
        Row: {
        id: string;
        booking_id: string;
        charge_kind: Database['public']['Enums']['charge_kind'];
        label: string;
        description: string | null;
        unit: string;
        quantity: number;
        unit_price_minor: number;
        line_total_minor: number | null;
        sort_order: number;
        created_at: string;
        };
        Insert: {
        id?: string;
        booking_id: string;
        charge_kind?: Database['public']['Enums']['charge_kind'];
        label: string;
        description?: string | null;
        unit?: string;
        quantity?: number;
        unit_price_minor?: number;
        sort_order?: number;
        created_at?: string;
        };
        Update: {
        id?: string;
        booking_id?: string;
        charge_kind?: Database['public']['Enums']['charge_kind'];
        label?: string;
        description?: string | null;
        unit?: string;
        quantity?: number;
        unit_price_minor?: number;
        sort_order?: number;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_items_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_status_history: {
        Row: {
        id: string;
        booking_id: string;
        from_status: Database['public']['Enums']['booking_status'] | null;
        to_status: Database['public']['Enums']['booking_status'];
        note: string | null;
        actor_id: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        booking_id: string;
        from_status?: Database['public']['Enums']['booking_status'] | null;
        to_status: Database['public']['Enums']['booking_status'];
        note?: string | null;
        actor_id?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        booking_id?: string;
        from_status?: Database['public']['Enums']['booking_status'] | null;
        to_status?: Database['public']['Enums']['booking_status'];
        note?: string | null;
        actor_id?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_status_history_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_status_history_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
        id: string;
        reference: string;
        event_id: string;
        partner_id: string;
        category_id: string | null;
        quote_id: string | null;
        quote_version_id: string | null;
        proposal_line_id: string | null;
        status: Database['public']['Enums']['booking_status'];
        gross_minor: number;
        commission_bps: number;
        commission_minor: number;
        adjustment_minor: number;
        partner_payable_minor: number;
        service_date: string;
        service_time: string | null;
        delivery_window: string | null;
        headcount: number | null;
        fulfilment_notes: string | null;
        partner_notes: string | null;
        confirmed_at: string | null;
        completed_at: string | null;
        cancelled_at: string | null;
        cancelled_by: string | null;
        cancellation_reason: string | null;
        created_at: string;
        updated_at: string;
        cancellation_policy_id: string | null;
        };
        Insert: {
        id?: string;
        reference?: string;
        event_id: string;
        partner_id: string;
        category_id?: string | null;
        quote_id?: string | null;
        quote_version_id?: string | null;
        proposal_line_id?: string | null;
        status?: Database['public']['Enums']['booking_status'];
        gross_minor?: number;
        commission_bps?: number;
        commission_minor?: number;
        adjustment_minor?: number;
        partner_payable_minor?: number;
        service_date: string;
        service_time?: string | null;
        delivery_window?: string | null;
        headcount?: number | null;
        fulfilment_notes?: string | null;
        partner_notes?: string | null;
        confirmed_at?: string | null;
        completed_at?: string | null;
        cancelled_at?: string | null;
        cancelled_by?: string | null;
        cancellation_reason?: string | null;
        created_at?: string;
        updated_at?: string;
        cancellation_policy_id?: string | null;
        };
        Update: {
        id?: string;
        reference?: string;
        event_id?: string;
        partner_id?: string;
        category_id?: string | null;
        quote_id?: string | null;
        quote_version_id?: string | null;
        proposal_line_id?: string | null;
        status?: Database['public']['Enums']['booking_status'];
        gross_minor?: number;
        commission_bps?: number;
        commission_minor?: number;
        adjustment_minor?: number;
        partner_payable_minor?: number;
        service_date?: string;
        service_time?: string | null;
        delivery_window?: string | null;
        headcount?: number | null;
        fulfilment_notes?: string | null;
        partner_notes?: string | null;
        confirmed_at?: string | null;
        completed_at?: string | null;
        cancelled_at?: string | null;
        cancelled_by?: string | null;
        cancellation_reason?: string | null;
        created_at?: string;
        updated_at?: string;
        cancellation_policy_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_cancellation_policy_id_fkey';
            columns: ['cancellation_policy_id'];
            isOneToOne: false;
            referencedRelation: 'cancellation_policies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_cancelled_by_fkey';
            columns: ['cancelled_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_proposal_line_id_fkey';
            columns: ['proposal_line_id'];
            isOneToOne: false;
            referencedRelation: 'proposal_lines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_quote_version_id_fkey';
            columns: ['quote_version_id'];
            isOneToOne: false;
            referencedRelation: 'quote_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      cancellation_policies: {
        Row: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        is_default: boolean;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        name: string;
        slug: string;
        description?: string | null;
        is_default?: boolean;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        name?: string;
        slug?: string;
        description?: string | null;
        is_default?: boolean;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [];
      };
      cancellation_tiers: {
        Row: {
        id: string;
        policy_id: string;
        hours_before: number;
        refund_bps: number;
        keeps_deposit: boolean;
        description: string | null;
        };
        Insert: {
        id?: string;
        policy_id: string;
        hours_before: number;
        refund_bps: number;
        keeps_deposit?: boolean;
        description?: string | null;
        };
        Update: {
        id?: string;
        policy_id?: string;
        hours_before?: number;
        refund_bps?: number;
        keeps_deposit?: boolean;
        description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cancellation_tiers_policy_id_fkey';
            columns: ['policy_id'];
            isOneToOne: false;
            referencedRelation: 'cancellation_policies';
            referencedColumns: ['id'];
          },
        ];
      };
      cities: {
        Row: {
        id: string;
        district_id: string;
        slug: string;
        name: string;
        name_bn: string | null;
        is_active: boolean;
        is_launched: boolean;
        seo_title: string | null;
        seo_description: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        district_id: string;
        slug: string;
        name: string;
        name_bn?: string | null;
        is_active?: boolean;
        is_launched?: boolean;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        district_id?: string;
        slug?: string;
        name?: string;
        name_bn?: string | null;
        is_active?: boolean;
        is_launched?: boolean;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cities_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
        ];
      };
      cms_pages: {
        Row: {
        id: string;
        slug: string;
        title: string;
        subtitle: string | null;
        body: string | null;
        kind: string;
        hero_image_url: string | null;
        seo_title: string | null;
        seo_description: string | null;
        is_published: boolean;
        needs_legal_review: boolean;
        published_at: string | null;
        updated_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        slug: string;
        title: string;
        subtitle?: string | null;
        body?: string | null;
        kind?: string;
        hero_image_url?: string | null;
        seo_title?: string | null;
        seo_description?: string | null;
        is_published?: boolean;
        needs_legal_review?: boolean;
        published_at?: string | null;
        updated_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        slug?: string;
        title?: string;
        subtitle?: string | null;
        body?: string | null;
        kind?: string;
        hero_image_url?: string | null;
        seo_title?: string | null;
        seo_description?: string | null;
        is_published?: boolean;
        needs_legal_review?: boolean;
        published_at?: string | null;
        updated_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cms_pages_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cms_sections: {
        Row: {
        id: string;
        page_slug: string;
        key: string;
        kind: string;
        heading: string | null;
        subheading: string | null;
        body: string | null;
        image_url: string | null;
        cta_label: string | null;
        cta_href: string | null;
        items: Json;
        sort_order: number;
        is_published: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        page_slug: string;
        key: string;
        kind?: string;
        heading?: string | null;
        subheading?: string | null;
        body?: string | null;
        image_url?: string | null;
        cta_label?: string | null;
        cta_href?: string | null;
        items?: Json;
        sort_order?: number;
        is_published?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        page_slug?: string;
        key?: string;
        kind?: string;
        heading?: string | null;
        subheading?: string | null;
        body?: string | null;
        image_url?: string | null;
        cta_label?: string | null;
        cta_href?: string | null;
        items?: Json;
        sort_order?: number;
        is_published?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [];
      };
      cuisines: {
        Row: {
        id: string;
        slug: string;
        name: string;
        name_bn: string | null;
        sort_order: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        slug: string;
        name: string;
        name_bn?: string | null;
        sort_order?: number;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        slug?: string;
        name?: string;
        name_bn?: string | null;
        sort_order?: number;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [];
      };
      disputes: {
        Row: {
        id: string;
        ticket_id: string | null;
        event_id: string | null;
        booking_id: string;
        raised_by: string | null;
        raiser_side: Database['public']['Enums']['participant_side'];
        reason: string;
        detail: string | null;
        status: string;
        claim_minor: number | null;
        resolution: string | null;
        resolution_kind: string | null;
        settlement_minor: number | null;
        resolved_by: string | null;
        resolved_at: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        ticket_id?: string | null;
        event_id?: string | null;
        booking_id: string;
        raised_by?: string | null;
        raiser_side: Database['public']['Enums']['participant_side'];
        reason: string;
        detail?: string | null;
        status?: string;
        claim_minor?: number | null;
        resolution?: string | null;
        resolution_kind?: string | null;
        settlement_minor?: number | null;
        resolved_by?: string | null;
        resolved_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        ticket_id?: string | null;
        event_id?: string | null;
        booking_id?: string;
        raised_by?: string | null;
        raiser_side?: Database['public']['Enums']['participant_side'];
        reason?: string;
        detail?: string | null;
        status?: string;
        claim_minor?: number | null;
        resolution?: string | null;
        resolution_kind?: string | null;
        settlement_minor?: number | null;
        resolved_by?: string | null;
        resolved_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_raised_by_fkey';
            columns: ['raised_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      districts: {
        Row: {
        id: string;
        slug: string;
        name: string;
        name_bn: string | null;
        division: string | null;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        slug: string;
        name: string;
        name_bn?: string | null;
        division?: string | null;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        slug?: string;
        name?: string;
        name_bn?: string | null;
        division?: string | null;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [];
      };
      event_documents: {
        Row: {
        id: string;
        event_id: string;
        title: string;
        storage_path: string;
        mime_type: string | null;
        size_bytes: number | null;
        visibility: string;
        uploaded_by: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        event_id: string;
        title: string;
        storage_path: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        visibility?: string;
        uploaded_by?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        event_id?: string;
        title?: string;
        storage_path?: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        visibility?: string;
        uploaded_by?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_documents_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_documents_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      event_tasks: {
        Row: {
        id: string;
        event_id: string;
        booking_id: string | null;
        title: string;
        detail: string | null;
        status: Database['public']['Enums']['task_status'];
        due_at: string | null;
        assignee_id: string | null;
        is_customer_visible: boolean;
        completed_at: string | null;
        sort_order: number;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        event_id: string;
        booking_id?: string | null;
        title: string;
        detail?: string | null;
        status?: Database['public']['Enums']['task_status'];
        due_at?: string | null;
        assignee_id?: string | null;
        is_customer_visible?: boolean;
        completed_at?: string | null;
        sort_order?: number;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        event_id?: string;
        booking_id?: string | null;
        title?: string;
        detail?: string | null;
        status?: Database['public']['Enums']['task_status'];
        due_at?: string | null;
        assignee_id?: string | null;
        is_customer_visible?: boolean;
        completed_at?: string | null;
        sort_order?: number;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_tasks_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_tasks_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_timeline: {
        Row: {
        id: string;
        event_id: string;
        kind: string;
        title: string;
        detail: string | null;
        visibility: string;
        actor_id: string | null;
        metadata: Json;
        created_at: string;
        };
        Insert: {
        id?: string;
        event_id: string;
        kind: string;
        title: string;
        detail?: string | null;
        visibility?: string;
        actor_id?: string | null;
        metadata?: Json;
        created_at?: string;
        };
        Update: {
        id?: string;
        event_id?: string;
        kind?: string;
        title?: string;
        detail?: string | null;
        visibility?: string;
        actor_id?: string | null;
        metadata?: Json;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_timeline_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_timeline_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_types: {
        Row: {
        id: string;
        slug: string;
        name: string;
        name_bn: string | null;
        segment: string;
        short_description: string | null;
        description: string | null;
        icon: string | null;
        image_url: string | null;
        typical_guests_min: number | null;
        typical_guests_max: number | null;
        sort_order: number;
        is_active: boolean;
        is_featured: boolean;
        seo_title: string | null;
        seo_description: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        slug: string;
        name: string;
        name_bn?: string | null;
        segment?: string;
        short_description?: string | null;
        description?: string | null;
        icon?: string | null;
        image_url?: string | null;
        typical_guests_min?: number | null;
        typical_guests_max?: number | null;
        sort_order?: number;
        is_active?: boolean;
        is_featured?: boolean;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        slug?: string;
        name?: string;
        name_bn?: string | null;
        segment?: string;
        short_description?: string | null;
        description?: string | null;
        icon?: string | null;
        image_url?: string | null;
        typical_guests_min?: number | null;
        typical_guests_max?: number | null;
        sort_order?: number;
        is_active?: boolean;
        is_featured?: boolean;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
        id: string;
        reference: string;
        request_id: string | null;
        proposal_id: string | null;
        customer_profile_id: string;
        organization_id: string | null;
        title: string;
        event_type_id: string | null;
        stage: Database['public']['Enums']['event_stage'];
        event_date: string;
        event_end_date: string | null;
        start_time: string | null;
        end_time: string | null;
        guest_count: number | null;
        city_id: string | null;
        area_id: string | null;
        venue_name: string | null;
        address_line: string | null;
        venue_notes: string | null;
        total_minor: number;
        paid_minor: number;
        refunded_minor: number;
        event_manager_id: string | null;
        customer_notes: string | null;
        closed_at: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        reference: string;
        request_id?: string | null;
        proposal_id?: string | null;
        customer_profile_id: string;
        organization_id?: string | null;
        title: string;
        event_type_id?: string | null;
        stage?: Database['public']['Enums']['event_stage'];
        event_date: string;
        event_end_date?: string | null;
        start_time?: string | null;
        end_time?: string | null;
        guest_count?: number | null;
        city_id?: string | null;
        area_id?: string | null;
        venue_name?: string | null;
        address_line?: string | null;
        venue_notes?: string | null;
        total_minor?: number;
        paid_minor?: number;
        refunded_minor?: number;
        event_manager_id?: string | null;
        customer_notes?: string | null;
        closed_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        reference?: string;
        request_id?: string | null;
        proposal_id?: string | null;
        customer_profile_id?: string;
        organization_id?: string | null;
        title?: string;
        event_type_id?: string | null;
        stage?: Database['public']['Enums']['event_stage'];
        event_date?: string;
        event_end_date?: string | null;
        start_time?: string | null;
        end_time?: string | null;
        guest_count?: number | null;
        city_id?: string | null;
        area_id?: string | null;
        venue_name?: string | null;
        address_line?: string | null;
        venue_notes?: string | null;
        total_minor?: number;
        paid_minor?: number;
        refunded_minor?: number;
        event_manager_id?: string | null;
        customer_notes?: string | null;
        closed_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_customer_profile_id_fkey';
            columns: ['customer_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_event_manager_id_fkey';
            columns: ['event_manager_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_event_type_id_fkey';
            columns: ['event_type_id'];
            isOneToOne: false;
            referencedRelation: 'event_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      faqs: {
        Row: {
        id: string;
        question: string;
        answer: string;
        audience: string;
        topic: string;
        sort_order: number;
        is_published: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        question: string;
        answer: string;
        audience?: string;
        topic?: string;
        sort_order?: number;
        is_published?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        question?: string;
        answer?: string;
        audience?: string;
        topic?: string;
        sort_order?: number;
        is_published?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
        id: string;
        profile_id: string;
        partner_id: string | null;
        package_id: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        profile_id: string;
        partner_id?: string | null;
        package_id?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        profile_id?: string;
        partner_id?: string | null;
        package_id?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'partner_packages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      financial_transactions: {
        Row: {
        id: string;
        entry_group: string;
        account: Database['public']['Enums']['ledger_account'];
        direction: Database['public']['Enums']['ledger_direction'];
        amount_minor: number;
        currency: string;
        event_id: string | null;
        booking_id: string | null;
        payment_id: string | null;
        refund_id: string | null;
        payout_id: string | null;
        invoice_id: string | null;
        partner_id: string | null;
        organization_id: string | null;
        description: string;
        occurred_at: string;
        created_by: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        entry_group: string;
        account: Database['public']['Enums']['ledger_account'];
        direction: Database['public']['Enums']['ledger_direction'];
        amount_minor: number;
        currency?: string;
        event_id?: string | null;
        booking_id?: string | null;
        payment_id?: string | null;
        refund_id?: string | null;
        payout_id?: string | null;
        invoice_id?: string | null;
        partner_id?: string | null;
        organization_id?: string | null;
        description: string;
        occurred_at?: string;
        created_by?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        entry_group?: string;
        account?: Database['public']['Enums']['ledger_account'];
        direction?: Database['public']['Enums']['ledger_direction'];
        amount_minor?: number;
        currency?: string;
        event_id?: string | null;
        booking_id?: string | null;
        payment_id?: string | null;
        refund_id?: string | null;
        payout_id?: string | null;
        invoice_id?: string | null;
        partner_id?: string | null;
        organization_id?: string | null;
        description?: string;
        occurred_at?: string;
        created_by?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'financial_transactions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_payout_fk';
            columns: ['payout_id'];
            isOneToOne: false;
            referencedRelation: 'payouts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_refund_id_fkey';
            columns: ['refund_id'];
            isOneToOne: false;
            referencedRelation: 'refunds';
            referencedColumns: ['id'];
          },
        ];
      };
      internal_notes: {
        Row: {
        id: string;
        entity: string;
        entity_id: string;
        body: string;
        is_pinned: boolean;
        author_id: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        entity: string;
        entity_id: string;
        body: string;
        is_pinned?: boolean;
        author_id?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        entity?: string;
        entity_id?: string;
        body?: string;
        is_pinned?: boolean;
        author_id?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'internal_notes_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      invoice_items: {
        Row: {
        id: string;
        invoice_id: string;
        label: string;
        description: string | null;
        quantity: number;
        unit_price_minor: number;
        line_total_minor: number | null;
        sort_order: number;
        created_at: string;
        };
        Insert: {
        id?: string;
        invoice_id: string;
        label: string;
        description?: string | null;
        quantity?: number;
        unit_price_minor?: number;
        sort_order?: number;
        created_at?: string;
        };
        Update: {
        id?: string;
        invoice_id?: string;
        label?: string;
        description?: string | null;
        quantity?: number;
        unit_price_minor?: number;
        sort_order?: number;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoice_items_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
        id: string;
        number: string;
        kind: Database['public']['Enums']['invoice_kind'];
        status: Database['public']['Enums']['invoice_status'];
        event_id: string | null;
        booking_id: string | null;
        proposal_id: string | null;
        customer_profile_id: string | null;
        organization_id: string | null;
        partner_id: string | null;
        bill_to_name: string;
        bill_to_address: string | null;
        bill_to_email: string | null;
        bill_to_phone: string | null;
        bill_to_tin: string | null;
        subtotal_minor: number;
        discount_minor: number;
        tax_minor: number;
        total_minor: number;
        paid_minor: number;
        currency: string;
        issue_date: string;
        due_date: string | null;
        notes: string | null;
        terms: string | null;
        pdf_path: string | null;
        issued_at: string | null;
        voided_at: string | null;
        void_reason: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        number?: string;
        kind?: Database['public']['Enums']['invoice_kind'];
        status?: Database['public']['Enums']['invoice_status'];
        event_id?: string | null;
        booking_id?: string | null;
        proposal_id?: string | null;
        customer_profile_id?: string | null;
        organization_id?: string | null;
        partner_id?: string | null;
        bill_to_name: string;
        bill_to_address?: string | null;
        bill_to_email?: string | null;
        bill_to_phone?: string | null;
        bill_to_tin?: string | null;
        subtotal_minor?: number;
        discount_minor?: number;
        tax_minor?: number;
        total_minor?: number;
        paid_minor?: number;
        currency?: string;
        issue_date?: string;
        due_date?: string | null;
        notes?: string | null;
        terms?: string | null;
        pdf_path?: string | null;
        issued_at?: string | null;
        voided_at?: string | null;
        void_reason?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        number?: string;
        kind?: Database['public']['Enums']['invoice_kind'];
        status?: Database['public']['Enums']['invoice_status'];
        event_id?: string | null;
        booking_id?: string | null;
        proposal_id?: string | null;
        customer_profile_id?: string | null;
        organization_id?: string | null;
        partner_id?: string | null;
        bill_to_name?: string;
        bill_to_address?: string | null;
        bill_to_email?: string | null;
        bill_to_phone?: string | null;
        bill_to_tin?: string | null;
        subtotal_minor?: number;
        discount_minor?: number;
        tax_minor?: number;
        total_minor?: number;
        paid_minor?: number;
        currency?: string;
        issue_date?: string;
        due_date?: string | null;
        notes?: string | null;
        terms?: string | null;
        pdf_path?: string | null;
        issued_at?: string | null;
        voided_at?: string | null;
        void_reason?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_customer_profile_id_fkey';
            columns: ['customer_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
        ];
      };
      menu_items: {
        Row: {
        id: string;
        menu_id: string;
        name: string;
        description: string | null;
        unit: string;
        price_minor: number;
        image_url: string | null;
        is_vegetarian: boolean;
        is_halal: boolean;
        allergens: string[] | null;
        sort_order: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        menu_id: string;
        name: string;
        description?: string | null;
        unit?: string;
        price_minor?: number;
        image_url?: string | null;
        is_vegetarian?: boolean;
        is_halal?: boolean;
        allergens?: string[] | null;
        sort_order?: number;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        menu_id?: string;
        name?: string;
        description?: string | null;
        unit?: string;
        price_minor?: number;
        image_url?: string | null;
        is_vegetarian?: boolean;
        is_halal?: boolean;
        allergens?: string[] | null;
        sort_order?: number;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_items_menu_id_fkey';
            columns: ['menu_id'];
            isOneToOne: false;
            referencedRelation: 'menus';
            referencedColumns: ['id'];
          },
        ];
      };
      menus: {
        Row: {
        id: string;
        partner_id: string;
        name: string;
        description: string | null;
        cuisine_id: string | null;
        is_active: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        partner_id: string;
        name: string;
        description?: string | null;
        cuisine_id?: string | null;
        is_active?: boolean;
        sort_order?: number;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        partner_id?: string;
        name?: string;
        description?: string | null;
        cuisine_id?: string | null;
        is_active?: boolean;
        sort_order?: number;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menus_cuisine_id_fkey';
            columns: ['cuisine_id'];
            isOneToOne: false;
            referencedRelation: 'cuisines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'menus_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      message_attachments: {
        Row: {
        id: string;
        message_id: string;
        storage_path: string;
        file_name: string;
        mime_type: string | null;
        size_bytes: number | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        message_id: string;
        storage_path: string;
        file_name: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        message_id?: string;
        storage_path?: string;
        file_name?: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_attachments_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      message_threads: {
        Row: {
        id: string;
        kind: Database['public']['Enums']['thread_kind'];
        subject: string;
        request_id: string | null;
        event_id: string | null;
        booking_id: string | null;
        quote_id: string | null;
        partner_id: string | null;
        organization_id: string | null;
        contact_sharing_allowed: boolean;
        is_locked: boolean;
        last_message_at: string | null;
        last_message_preview: string | null;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        kind: Database['public']['Enums']['thread_kind'];
        subject?: string;
        request_id?: string | null;
        event_id?: string | null;
        booking_id?: string | null;
        quote_id?: string | null;
        partner_id?: string | null;
        organization_id?: string | null;
        contact_sharing_allowed?: boolean;
        is_locked?: boolean;
        last_message_at?: string | null;
        last_message_preview?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        kind?: Database['public']['Enums']['thread_kind'];
        subject?: string;
        request_id?: string | null;
        event_id?: string | null;
        booking_id?: string | null;
        quote_id?: string | null;
        partner_id?: string | null;
        organization_id?: string | null;
        contact_sharing_allowed?: boolean;
        is_locked?: boolean;
        last_message_at?: string | null;
        last_message_preview?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_threads_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_threads_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_threads_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_threads_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_threads_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_threads_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_threads_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
        id: string;
        thread_id: string;
        sender_id: string | null;
        sender_side: Database['public']['Enums']['participant_side'];
        kind: Database['public']['Enums']['message_kind'];
        body: string;
        body_public: string;
        flagged_contact: boolean;
        metadata: Json;
        edited_at: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        thread_id: string;
        sender_id?: string | null;
        sender_side?: Database['public']['Enums']['participant_side'];
        kind?: Database['public']['Enums']['message_kind'];
        body: string;
        body_public?: string;
        flagged_contact?: boolean;
        metadata?: Json;
        edited_at?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        thread_id?: string;
        sender_id?: string | null;
        sender_side?: Database['public']['Enums']['participant_side'];
        kind?: Database['public']['Enums']['message_kind'];
        body?: string;
        body_public?: string;
        flagged_contact?: boolean;
        metadata?: Json;
        edited_at?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'message_threads';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
        profile_id: string;
        type_key: string;
        in_app: boolean;
        email: boolean;
        sms: boolean;
        whatsapp: boolean;
        updated_at: string;
        };
        Insert: {
        profile_id: string;
        type_key: string;
        in_app?: boolean;
        email?: boolean;
        sms?: boolean;
        whatsapp?: boolean;
        updated_at?: string;
        };
        Update: {
        profile_id?: string;
        type_key?: string;
        in_app?: boolean;
        email?: boolean;
        sms?: boolean;
        whatsapp?: boolean;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_preferences_type_key_fkey';
            columns: ['type_key'];
            isOneToOne: false;
            referencedRelation: 'notification_types';
            referencedColumns: ['key'];
          },
        ];
      };
      notification_types: {
        Row: {
        key: string;
        description: string;
        audience: string;
        default_in_app: boolean;
        default_email: boolean;
        default_sms: boolean;
        is_transactional: boolean;
        };
        Insert: {
        key: string;
        description: string;
        audience: string;
        default_in_app?: boolean;
        default_email?: boolean;
        default_sms?: boolean;
        is_transactional?: boolean;
        };
        Update: {
        key?: string;
        description?: string;
        audience?: string;
        default_in_app?: boolean;
        default_email?: boolean;
        default_sms?: boolean;
        is_transactional?: boolean;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
        id: string;
        profile_id: string;
        type_key: string;
        title: string;
        body: string | null;
        url: string | null;
        data: Json;
        read_at: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        profile_id: string;
        type_key: string;
        title: string;
        body?: string | null;
        url?: string | null;
        data?: Json;
        read_at?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        profile_id?: string;
        type_key?: string;
        title?: string;
        body?: string | null;
        url?: string | null;
        data?: Json;
        read_at?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_type_key_fkey';
            columns: ['type_key'];
            isOneToOne: false;
            referencedRelation: 'notification_types';
            referencedColumns: ['key'];
          },
        ];
      };
      organization_invites: {
        Row: {
        id: string;
        organization_id: string;
        email: string;
        role: Database['public']['Enums']['org_member_role'];
        token_hash: string;
        expires_at: string;
        accepted_at: string | null;
        accepted_by: string | null;
        invited_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        organization_id: string;
        email: string;
        role?: Database['public']['Enums']['org_member_role'];
        token_hash: string;
        expires_at: string;
        accepted_at?: string | null;
        accepted_by?: string | null;
        invited_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        organization_id?: string;
        email?: string;
        role?: Database['public']['Enums']['org_member_role'];
        token_hash?: string;
        expires_at?: string;
        accepted_at?: string | null;
        accepted_by?: string | null;
        invited_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_invites_accepted_by_fkey';
            columns: ['accepted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_invites_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_invites_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_members: {
        Row: {
        id: string;
        organization_id: string;
        profile_id: string;
        role: Database['public']['Enums']['org_member_role'];
        status: Database['public']['Enums']['member_status'];
        title: string | null;
        department: string | null;
        spend_limit_minor: number | null;
        requires_approval: boolean;
        invited_by: string | null;
        invited_at: string | null;
        joined_at: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        organization_id: string;
        profile_id: string;
        role?: Database['public']['Enums']['org_member_role'];
        status?: Database['public']['Enums']['member_status'];
        title?: string | null;
        department?: string | null;
        spend_limit_minor?: number | null;
        requires_approval?: boolean;
        invited_by?: string | null;
        invited_at?: string | null;
        joined_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        organization_id?: string;
        profile_id?: string;
        role?: Database['public']['Enums']['org_member_role'];
        status?: Database['public']['Enums']['member_status'];
        title?: string | null;
        department?: string | null;
        spend_limit_minor?: number | null;
        requires_approval?: boolean;
        invited_by?: string | null;
        invited_at?: string | null;
        joined_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
        id: string;
        kind: Database['public']['Enums']['org_kind'];
        name: string;
        slug: string;
        legal_name: string | null;
        logo_url: string | null;
        website: string | null;
        phone: string | null;
        email: string | null;
        address_line: string | null;
        area: string | null;
        city: string;
        district: string | null;
        postcode: string | null;
        country: string;
        tin: string | null;
        bin_vat: string | null;
        trade_license: string | null;
        billing_email: string | null;
        is_active: boolean;
        settings: Json;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        kind: Database['public']['Enums']['org_kind'];
        name: string;
        slug: string;
        legal_name?: string | null;
        logo_url?: string | null;
        website?: string | null;
        phone?: string | null;
        email?: string | null;
        address_line?: string | null;
        area?: string | null;
        city?: string;
        district?: string | null;
        postcode?: string | null;
        country?: string;
        tin?: string | null;
        bin_vat?: string | null;
        trade_license?: string | null;
        billing_email?: string | null;
        is_active?: boolean;
        settings?: Json;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        kind?: Database['public']['Enums']['org_kind'];
        name?: string;
        slug?: string;
        legal_name?: string | null;
        logo_url?: string | null;
        website?: string | null;
        phone?: string | null;
        email?: string | null;
        address_line?: string | null;
        area?: string | null;
        city?: string;
        district?: string | null;
        postcode?: string | null;
        country?: string;
        tin?: string | null;
        bin_vat?: string | null;
        trade_license?: string | null;
        billing_email?: string | null;
        is_active?: boolean;
        settings?: Json;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      outbound_messages: {
        Row: {
        id: string;
        channel: Database['public']['Enums']['notification_channel'];
        template_key: string;
        to_address: string;
        to_profile_id: string | null;
        subject: string | null;
        payload: Json;
        status: string;
        provider: string | null;
        provider_ref: string | null;
        attempts: number;
        last_error: string | null;
        dedupe_key: string | null;
        sent_at: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        channel?: Database['public']['Enums']['notification_channel'];
        template_key: string;
        to_address: string;
        to_profile_id?: string | null;
        subject?: string | null;
        payload?: Json;
        status?: string;
        provider?: string | null;
        provider_ref?: string | null;
        attempts?: number;
        last_error?: string | null;
        dedupe_key?: string | null;
        sent_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        channel?: Database['public']['Enums']['notification_channel'];
        template_key?: string;
        to_address?: string;
        to_profile_id?: string | null;
        subject?: string | null;
        payload?: Json;
        status?: string;
        provider?: string | null;
        provider_ref?: string | null;
        attempts?: number;
        last_error?: string | null;
        dedupe_key?: string | null;
        sent_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'outbound_messages_to_profile_id_fkey';
            columns: ['to_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      package_items: {
        Row: {
        id: string;
        package_id: string;
        label: string;
        detail: string | null;
        is_optional: boolean;
        addon_price_minor: number | null;
        sort_order: number;
        created_at: string;
        };
        Insert: {
        id?: string;
        package_id: string;
        label: string;
        detail?: string | null;
        is_optional?: boolean;
        addon_price_minor?: number | null;
        sort_order?: number;
        created_at?: string;
        };
        Update: {
        id?: string;
        package_id?: string;
        label?: string;
        detail?: string | null;
        is_optional?: boolean;
        addon_price_minor?: number | null;
        sort_order?: number;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'package_items_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'partner_packages';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_availability: {
        Row: {
        id: string;
        partner_id: string;
        on_date: string;
        is_blocked: boolean;
        capacity_override: number | null;
        note: string | null;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        partner_id: string;
        on_date: string;
        is_blocked?: boolean;
        capacity_override?: number | null;
        note?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        partner_id?: string;
        on_date?: string;
        is_blocked?: boolean;
        capacity_override?: number | null;
        note?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_availability_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_availability_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_categories: {
        Row: {
        partner_id: string;
        category_id: string;
        is_primary: boolean;
        price_from_minor: number | null;
        price_to_minor: number | null;
        created_at: string;
        };
        Insert: {
        partner_id: string;
        category_id: string;
        is_primary?: boolean;
        price_from_minor?: number | null;
        price_to_minor?: number | null;
        created_at?: string;
        };
        Update: {
        partner_id?: string;
        category_id?: string;
        is_primary?: boolean;
        price_from_minor?: number | null;
        price_to_minor?: number | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_categories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_categories_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_cuisines: {
        Row: {
        partner_id: string;
        cuisine_id: string;
        };
        Insert: {
        partner_id: string;
        cuisine_id: string;
        };
        Update: {
        partner_id?: string;
        cuisine_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_cuisines_cuisine_id_fkey';
            columns: ['cuisine_id'];
            isOneToOne: false;
            referencedRelation: 'cuisines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_cuisines_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_documents: {
        Row: {
        id: string;
        partner_id: string;
        kind: Database['public']['Enums']['document_kind'];
        title: string;
        storage_path: string;
        mime_type: string | null;
        size_bytes: number | null;
        expires_on: string | null;
        is_verified: boolean;
        reviewed_by: string | null;
        reviewed_at: string | null;
        review_notes: string | null;
        uploaded_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        partner_id: string;
        kind: Database['public']['Enums']['document_kind'];
        title: string;
        storage_path: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        expires_on?: string | null;
        is_verified?: boolean;
        reviewed_by?: string | null;
        reviewed_at?: string | null;
        review_notes?: string | null;
        uploaded_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        partner_id?: string;
        kind?: Database['public']['Enums']['document_kind'];
        title?: string;
        storage_path?: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        expires_on?: string | null;
        is_verified?: boolean;
        reviewed_by?: string | null;
        reviewed_at?: string | null;
        review_notes?: string | null;
        uploaded_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_documents_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_documents_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_documents_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_event_types: {
        Row: {
        partner_id: string;
        event_type_id: string;
        };
        Insert: {
        partner_id: string;
        event_type_id: string;
        };
        Update: {
        partner_id?: string;
        event_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_event_types_event_type_id_fkey';
            columns: ['event_type_id'];
            isOneToOne: false;
            referencedRelation: 'event_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_event_types_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_operating_hours: {
        Row: {
        partner_id: string;
        day_of_week: number;
        opens_at: string | null;
        closes_at: string | null;
        is_closed: boolean;
        };
        Insert: {
        partner_id: string;
        day_of_week: number;
        opens_at?: string | null;
        closes_at?: string | null;
        is_closed?: boolean;
        };
        Update: {
        partner_id?: string;
        day_of_week?: number;
        opens_at?: string | null;
        closes_at?: string | null;
        is_closed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_operating_hours_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_packages: {
        Row: {
        id: string;
        partner_id: string;
        category_id: string | null;
        slug: string;
        name: string;
        description: string | null;
        hero_image_url: string | null;
        base_price_minor: number;
        per_person_price_minor: number;
        min_guests: number | null;
        max_guests: number | null;
        lead_time_hours: number | null;
        is_active: boolean;
        is_featured: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        partner_id: string;
        category_id?: string | null;
        slug: string;
        name: string;
        description?: string | null;
        hero_image_url?: string | null;
        base_price_minor?: number;
        per_person_price_minor?: number;
        min_guests?: number | null;
        max_guests?: number | null;
        lead_time_hours?: number | null;
        is_active?: boolean;
        is_featured?: boolean;
        sort_order?: number;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        partner_id?: string;
        category_id?: string | null;
        slug?: string;
        name?: string;
        description?: string | null;
        hero_image_url?: string | null;
        base_price_minor?: number;
        per_person_price_minor?: number;
        min_guests?: number | null;
        max_guests?: number | null;
        lead_time_hours?: number | null;
        is_active?: boolean;
        is_featured?: boolean;
        sort_order?: number;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_packages_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_packages_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_payout_accounts: {
        Row: {
        id: string;
        partner_id: string;
        method: Database['public']['Enums']['payout_method'];
        account_name: string;
        account_number: string;
        bank_name: string | null;
        branch_name: string | null;
        routing_number: string | null;
        mfs_number: string | null;
        is_default: boolean;
        is_verified: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        partner_id: string;
        method?: Database['public']['Enums']['payout_method'];
        account_name: string;
        account_number: string;
        bank_name?: string | null;
        branch_name?: string | null;
        routing_number?: string | null;
        mfs_number?: string | null;
        is_default?: boolean;
        is_verified?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        partner_id?: string;
        method?: Database['public']['Enums']['payout_method'];
        account_name?: string;
        account_number?: string;
        bank_name?: string | null;
        branch_name?: string | null;
        routing_number?: string | null;
        mfs_number?: string | null;
        is_default?: boolean;
        is_verified?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_payout_accounts_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_portfolio: {
        Row: {
        id: string;
        partner_id: string;
        title: string | null;
        caption: string | null;
        image_url: string;
        event_type_id: string | null;
        guest_count: number | null;
        taken_on: string | null;
        sort_order: number;
        is_public: boolean;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        partner_id: string;
        title?: string | null;
        caption?: string | null;
        image_url: string;
        event_type_id?: string | null;
        guest_count?: number | null;
        taken_on?: string | null;
        sort_order?: number;
        is_public?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        partner_id?: string;
        title?: string | null;
        caption?: string | null;
        image_url?: string;
        event_type_id?: string | null;
        guest_count?: number | null;
        taken_on?: string | null;
        sort_order?: number;
        is_public?: boolean;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_portfolio_event_type_id_fkey';
            columns: ['event_type_id'];
            isOneToOne: false;
            referencedRelation: 'event_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_portfolio_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_profiles: {
        Row: {
        id: string;
        organization_id: string;
        slug: string;
        display_name: string;
        tagline: string | null;
        about: string | null;
        business_type: string | null;
        year_established: number | null;
        logo_url: string | null;
        cover_image_url: string | null;
        verification_status: Database['public']['Enums']['verification_status'];
        verified_at: string | null;
        verified_by: string | null;
        rejection_reason: string | null;
        commission_bps: number | null;
        min_order_minor: number;
        min_guests: number | null;
        max_guests: number | null;
        lead_time_hours: number;
        daily_event_capacity: number;
        rating_avg: number;
        rating_count: number;
        completed_bookings: number;
        response_rate_bps: number;
        avg_response_minutes: number | null;
        cancellation_policy: string | null;
        payment_terms: string | null;
        is_featured: boolean;
        is_accepting_orders: boolean;
        published_at: string | null;
        seo_title: string | null;
        seo_description: string | null;
        created_at: string;
        updated_at: string;
        cancellation_policy_id: string | null;
        };
        Insert: {
        id?: string;
        organization_id: string;
        slug: string;
        display_name: string;
        tagline?: string | null;
        about?: string | null;
        business_type?: string | null;
        year_established?: number | null;
        logo_url?: string | null;
        cover_image_url?: string | null;
        verification_status?: Database['public']['Enums']['verification_status'];
        verified_at?: string | null;
        verified_by?: string | null;
        rejection_reason?: string | null;
        commission_bps?: number | null;
        min_order_minor?: number;
        min_guests?: number | null;
        max_guests?: number | null;
        lead_time_hours?: number;
        daily_event_capacity?: number;
        rating_avg?: number;
        rating_count?: number;
        completed_bookings?: number;
        response_rate_bps?: number;
        avg_response_minutes?: number | null;
        cancellation_policy?: string | null;
        payment_terms?: string | null;
        is_featured?: boolean;
        is_accepting_orders?: boolean;
        published_at?: string | null;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
        cancellation_policy_id?: string | null;
        };
        Update: {
        id?: string;
        organization_id?: string;
        slug?: string;
        display_name?: string;
        tagline?: string | null;
        about?: string | null;
        business_type?: string | null;
        year_established?: number | null;
        logo_url?: string | null;
        cover_image_url?: string | null;
        verification_status?: Database['public']['Enums']['verification_status'];
        verified_at?: string | null;
        verified_by?: string | null;
        rejection_reason?: string | null;
        commission_bps?: number | null;
        min_order_minor?: number;
        min_guests?: number | null;
        max_guests?: number | null;
        lead_time_hours?: number;
        daily_event_capacity?: number;
        rating_avg?: number;
        rating_count?: number;
        completed_bookings?: number;
        response_rate_bps?: number;
        avg_response_minutes?: number | null;
        cancellation_policy?: string | null;
        payment_terms?: string | null;
        is_featured?: boolean;
        is_accepting_orders?: boolean;
        published_at?: string | null;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
        cancellation_policy_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_profiles_cancellation_policy_id_fkey';
            columns: ['cancellation_policy_id'];
            isOneToOne: false;
            referencedRelation: 'cancellation_policies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_profiles_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: true;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_profiles_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_service_areas: {
        Row: {
        id: string;
        partner_id: string;
        city_id: string;
        area_id: string | null;
        delivery_fee_minor: number;
        min_order_minor: number | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        partner_id: string;
        city_id: string;
        area_id?: string | null;
        delivery_fee_minor?: number;
        min_order_minor?: number | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        partner_id?: string;
        city_id?: string;
        area_id?: string | null;
        delivery_fee_minor?: number;
        min_order_minor?: number | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_service_areas_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_service_areas_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_service_areas_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      partner_verification_events: {
        Row: {
        id: string;
        partner_id: string;
        from_status: Database['public']['Enums']['verification_status'] | null;
        to_status: Database['public']['Enums']['verification_status'];
        notes: string | null;
        actor_id: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        partner_id: string;
        from_status?: Database['public']['Enums']['verification_status'] | null;
        to_status: Database['public']['Enums']['verification_status'];
        notes?: string | null;
        actor_id?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        partner_id?: string;
        from_status?: Database['public']['Enums']['verification_status'] | null;
        to_status?: Database['public']['Enums']['verification_status'];
        notes?: string | null;
        actor_id?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'partner_verification_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'partner_verification_events_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_events: {
        Row: {
        id: string;
        provider: string;
        provider_event_id: string;
        payment_id: string | null;
        event_type: string | null;
        signature_valid: boolean;
        payload: Json;
        processed_at: string | null;
        process_error: string | null;
        received_at: string;
        };
        Insert: {
        id?: string;
        provider: string;
        provider_event_id: string;
        payment_id?: string | null;
        event_type?: string | null;
        signature_valid?: boolean;
        payload: Json;
        processed_at?: string | null;
        process_error?: string | null;
        received_at?: string;
        };
        Update: {
        id?: string;
        provider?: string;
        provider_event_id?: string;
        payment_id?: string | null;
        event_type?: string | null;
        signature_valid?: boolean;
        payload?: Json;
        processed_at?: string | null;
        process_error?: string | null;
        received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_events_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_transactions: {
        Row: {
        id: string;
        payment_id: string;
        kind: string;
        status: string;
        amount_minor: number | null;
        provider_ref: string | null;
        request_body: Json | null;
        response_body: Json | null;
        error_message: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        payment_id: string;
        kind: string;
        status: string;
        amount_minor?: number | null;
        provider_ref?: string | null;
        request_body?: Json | null;
        response_body?: Json | null;
        error_message?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        payment_id?: string;
        kind?: string;
        status?: string;
        amount_minor?: number | null;
        provider_ref?: string | null;
        request_body?: Json | null;
        response_body?: Json | null;
        error_message?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_transactions_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
        id: string;
        reference: string;
        event_id: string | null;
        proposal_id: string | null;
        invoice_id: string | null;
        customer_profile_id: string;
        organization_id: string | null;
        purpose: Database['public']['Enums']['payment_purpose'];
        status: Database['public']['Enums']['payment_status'];
        amount_minor: number;
        currency: string;
        gateway_fee_minor: number;
        net_received_minor: number;
        refunded_minor: number;
        provider: string;
        provider_ref: string | null;
        provider_session: string | null;
        method: string | null;
        idempotency_key: string;
        initiated_at: string;
        paid_at: string | null;
        failed_at: string | null;
        failure_reason: string | null;
        expires_at: string | null;
        metadata: Json;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        reference?: string;
        event_id?: string | null;
        proposal_id?: string | null;
        invoice_id?: string | null;
        customer_profile_id: string;
        organization_id?: string | null;
        purpose?: Database['public']['Enums']['payment_purpose'];
        status?: Database['public']['Enums']['payment_status'];
        amount_minor: number;
        currency?: string;
        gateway_fee_minor?: number;
        net_received_minor?: number;
        refunded_minor?: number;
        provider?: string;
        provider_ref?: string | null;
        provider_session?: string | null;
        method?: string | null;
        idempotency_key: string;
        initiated_at?: string;
        paid_at?: string | null;
        failed_at?: string | null;
        failure_reason?: string | null;
        expires_at?: string | null;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        reference?: string;
        event_id?: string | null;
        proposal_id?: string | null;
        invoice_id?: string | null;
        customer_profile_id?: string;
        organization_id?: string | null;
        purpose?: Database['public']['Enums']['payment_purpose'];
        status?: Database['public']['Enums']['payment_status'];
        amount_minor?: number;
        currency?: string;
        gateway_fee_minor?: number;
        net_received_minor?: number;
        refunded_minor?: number;
        provider?: string;
        provider_ref?: string | null;
        provider_session?: string | null;
        method?: string | null;
        idempotency_key?: string;
        initiated_at?: string;
        paid_at?: string | null;
        failed_at?: string | null;
        failure_reason?: string | null;
        expires_at?: string | null;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_customer_profile_id_fkey';
            columns: ['customer_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_invoice_fk';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
        ];
      };
      payout_items: {
        Row: {
        id: string;
        payout_id: string;
        booking_id: string | null;
        event_id: string | null;
        label: string;
        gross_minor: number;
        commission_minor: number;
        adjustment_minor: number;
        net_minor: number;
        created_at: string;
        };
        Insert: {
        id?: string;
        payout_id: string;
        booking_id?: string | null;
        event_id?: string | null;
        label: string;
        gross_minor?: number;
        commission_minor?: number;
        adjustment_minor?: number;
        net_minor?: number;
        created_at?: string;
        };
        Update: {
        id?: string;
        payout_id?: string;
        booking_id?: string | null;
        event_id?: string | null;
        label?: string;
        gross_minor?: number;
        commission_minor?: number;
        adjustment_minor?: number;
        net_minor?: number;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payout_items_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payout_items_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payout_items_payout_id_fkey';
            columns: ['payout_id'];
            isOneToOne: false;
            referencedRelation: 'payouts';
            referencedColumns: ['id'];
          },
        ];
      };
      payouts: {
        Row: {
        id: string;
        reference: string;
        partner_id: string;
        status: Database['public']['Enums']['payout_status'];
        period_start: string | null;
        period_end: string | null;
        gross_minor: number;
        commission_minor: number;
        adjustment_minor: number;
        net_minor: number;
        method: Database['public']['Enums']['payout_method'] | null;
        payout_account_id: string | null;
        provider_ref: string | null;
        proof_path: string | null;
        statement_invoice_id: string | null;
        notes: string | null;
        approved_by: string | null;
        approved_at: string | null;
        paid_by: string | null;
        paid_at: string | null;
        failure_reason: string | null;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        reference?: string;
        partner_id: string;
        status?: Database['public']['Enums']['payout_status'];
        period_start?: string | null;
        period_end?: string | null;
        gross_minor?: number;
        commission_minor?: number;
        adjustment_minor?: number;
        net_minor?: number;
        method?: Database['public']['Enums']['payout_method'] | null;
        payout_account_id?: string | null;
        provider_ref?: string | null;
        proof_path?: string | null;
        statement_invoice_id?: string | null;
        notes?: string | null;
        approved_by?: string | null;
        approved_at?: string | null;
        paid_by?: string | null;
        paid_at?: string | null;
        failure_reason?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        reference?: string;
        partner_id?: string;
        status?: Database['public']['Enums']['payout_status'];
        period_start?: string | null;
        period_end?: string | null;
        gross_minor?: number;
        commission_minor?: number;
        adjustment_minor?: number;
        net_minor?: number;
        method?: Database['public']['Enums']['payout_method'] | null;
        payout_account_id?: string | null;
        provider_ref?: string | null;
        proof_path?: string | null;
        statement_invoice_id?: string | null;
        notes?: string | null;
        approved_by?: string | null;
        approved_at?: string | null;
        paid_by?: string | null;
        paid_at?: string | null;
        failure_reason?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payouts_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payouts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payouts_paid_by_fkey';
            columns: ['paid_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payouts_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payouts_payout_account_id_fkey';
            columns: ['payout_account_id'];
            isOneToOne: false;
            referencedRelation: 'partner_payout_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payouts_statement_invoice_id_fkey';
            columns: ['statement_invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      permissions: {
        Row: {
        key: string;
        description: string;
        category: string;
        };
        Insert: {
        key: string;
        description: string;
        category?: string;
        };
        Update: {
        key?: string;
        description?: string;
        category?: string;
        };
        Relationships: [];
      };
      platform_staff: {
        Row: {
        profile_id: string;
        role: Database['public']['Enums']['platform_role'];
        is_active: boolean;
        notes: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        profile_id: string;
        role: Database['public']['Enums']['platform_role'];
        is_active?: boolean;
        notes?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        profile_id?: string;
        role?: Database['public']['Enums']['platform_role'];
        is_active?: boolean;
        notes?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'platform_staff_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_rules: {
        Row: {
        id: string;
        name: string;
        scope: string;
        category_id: string | null;
        partner_id: string | null;
        organization_id: string | null;
        event_type_id: string | null;
        commission_bps: number;
        service_fee_bps: number;
        service_fee_flat_minor: number;
        service_fee_min_minor: number | null;
        service_fee_max_minor: number | null;
        coordination_fee_minor: number;
        coordination_fee_bps: number;
        vat_bps: number;
        vat_label: string;
        gateway_fee_bearer: Database['public']['Enums']['fee_bearer'];
        gateway_fee_bps: number;
        deposit_bps: number;
        min_order_minor: number;
        priority: number;
        effective_from: string;
        effective_to: string | null;
        is_active: boolean;
        notes: string | null;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        name: string;
        scope?: string;
        category_id?: string | null;
        partner_id?: string | null;
        organization_id?: string | null;
        event_type_id?: string | null;
        commission_bps?: number;
        service_fee_bps?: number;
        service_fee_flat_minor?: number;
        service_fee_min_minor?: number | null;
        service_fee_max_minor?: number | null;
        coordination_fee_minor?: number;
        coordination_fee_bps?: number;
        vat_bps?: number;
        vat_label?: string;
        gateway_fee_bearer?: Database['public']['Enums']['fee_bearer'];
        gateway_fee_bps?: number;
        deposit_bps?: number;
        min_order_minor?: number;
        priority?: number;
        effective_from?: string;
        effective_to?: string | null;
        is_active?: boolean;
        notes?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        name?: string;
        scope?: string;
        category_id?: string | null;
        partner_id?: string | null;
        organization_id?: string | null;
        event_type_id?: string | null;
        commission_bps?: number;
        service_fee_bps?: number;
        service_fee_flat_minor?: number;
        service_fee_min_minor?: number | null;
        service_fee_max_minor?: number | null;
        coordination_fee_minor?: number;
        coordination_fee_bps?: number;
        vat_bps?: number;
        vat_label?: string;
        gateway_fee_bearer?: Database['public']['Enums']['fee_bearer'];
        gateway_fee_bps?: number;
        deposit_bps?: number;
        min_order_minor?: number;
        priority?: number;
        effective_from?: string;
        effective_to?: string | null;
        is_active?: boolean;
        notes?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_rules_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_rules_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_rules_event_type_id_fkey';
            columns: ['event_type_id'];
            isOneToOne: false;
            referencedRelation: 'event_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_rules_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_rules_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
        id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        avatar_url: string | null;
        locale: string;
        timezone: string;
        is_active: boolean;
        last_seen_at: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id: string;
        full_name?: string;
        email?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
        locale?: string;
        timezone?: string;
        is_active?: boolean;
        last_seen_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        full_name?: string;
        email?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
        locale?: string;
        timezone?: string;
        is_active?: boolean;
        last_seen_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      proposal_events: {
        Row: {
        id: string;
        proposal_id: string;
        kind: string;
        note: string | null;
        actor_id: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        proposal_id: string;
        kind: string;
        note?: string | null;
        actor_id?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        proposal_id?: string;
        kind?: string;
        note?: string | null;
        actor_id?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'proposal_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposal_events_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
        ];
      };
      proposal_lines: {
        Row: {
        id: string;
        proposal_id: string;
        quote_id: string | null;
        quote_version_id: string | null;
        partner_id: string | null;
        category_id: string | null;
        label: string;
        description: string | null;
        amount_minor: number;
        commission_bps: number;
        commission_minor: number;
        partner_payable_minor: number;
        is_platform_line: boolean;
        sort_order: number;
        created_at: string;
        };
        Insert: {
        id?: string;
        proposal_id: string;
        quote_id?: string | null;
        quote_version_id?: string | null;
        partner_id?: string | null;
        category_id?: string | null;
        label: string;
        description?: string | null;
        amount_minor?: number;
        commission_bps?: number;
        commission_minor?: number;
        partner_payable_minor?: number;
        is_platform_line?: boolean;
        sort_order?: number;
        created_at?: string;
        };
        Update: {
        id?: string;
        proposal_id?: string;
        quote_id?: string | null;
        quote_version_id?: string | null;
        partner_id?: string | null;
        category_id?: string | null;
        label?: string;
        description?: string | null;
        amount_minor?: number;
        commission_bps?: number;
        commission_minor?: number;
        partner_payable_minor?: number;
        is_platform_line?: boolean;
        sort_order?: number;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'proposal_lines_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposal_lines_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposal_lines_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposal_lines_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposal_lines_quote_version_id_fkey';
            columns: ['quote_version_id'];
            isOneToOne: false;
            referencedRelation: 'quote_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      proposals: {
        Row: {
        id: string;
        reference: string;
        request_id: string;
        status: Database['public']['Enums']['proposal_status'];
        version_no: number;
        supersedes_id: string | null;
        title: string;
        summary: string | null;
        terms: string | null;
        cancellation_policy: string | null;
        currency: string;
        partner_gross_minor: number;
        service_fee_minor: number;
        coordination_fee_minor: number;
        delivery_fee_minor: number;
        discount_minor: number;
        tax_minor: number;
        total_minor: number;
        commission_minor: number;
        platform_revenue_minor: number;
        deposit_bps: number;
        deposit_minor: number;
        balance_due_days: number;
        valid_until: string | null;
        sent_at: string | null;
        viewed_at: string | null;
        responded_at: string | null;
        accepted_at: string | null;
        accepted_by: string | null;
        rejected_reason: string | null;
        change_request: string | null;
        prepared_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        reference?: string;
        request_id: string;
        status?: Database['public']['Enums']['proposal_status'];
        version_no?: number;
        supersedes_id?: string | null;
        title?: string;
        summary?: string | null;
        terms?: string | null;
        cancellation_policy?: string | null;
        currency?: string;
        partner_gross_minor?: number;
        service_fee_minor?: number;
        coordination_fee_minor?: number;
        delivery_fee_minor?: number;
        discount_minor?: number;
        tax_minor?: number;
        total_minor?: number;
        commission_minor?: number;
        platform_revenue_minor?: number;
        deposit_bps?: number;
        deposit_minor?: number;
        balance_due_days?: number;
        valid_until?: string | null;
        sent_at?: string | null;
        viewed_at?: string | null;
        responded_at?: string | null;
        accepted_at?: string | null;
        accepted_by?: string | null;
        rejected_reason?: string | null;
        change_request?: string | null;
        prepared_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        reference?: string;
        request_id?: string;
        status?: Database['public']['Enums']['proposal_status'];
        version_no?: number;
        supersedes_id?: string | null;
        title?: string;
        summary?: string | null;
        terms?: string | null;
        cancellation_policy?: string | null;
        currency?: string;
        partner_gross_minor?: number;
        service_fee_minor?: number;
        coordination_fee_minor?: number;
        delivery_fee_minor?: number;
        discount_minor?: number;
        tax_minor?: number;
        total_minor?: number;
        commission_minor?: number;
        platform_revenue_minor?: number;
        deposit_bps?: number;
        deposit_minor?: number;
        balance_due_days?: number;
        valid_until?: string | null;
        sent_at?: string | null;
        viewed_at?: string | null;
        responded_at?: string | null;
        accepted_at?: string | null;
        accepted_by?: string | null;
        rejected_reason?: string | null;
        change_request?: string | null;
        prepared_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'proposals_accepted_by_fkey';
            columns: ['accepted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposals_prepared_by_fkey';
            columns: ['prepared_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposals_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposals_supersedes_id_fkey';
            columns: ['supersedes_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_attachments: {
        Row: {
        id: string;
        quote_version_id: string;
        storage_path: string;
        file_name: string;
        mime_type: string | null;
        size_bytes: number | null;
        uploaded_by: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        quote_version_id: string;
        storage_path: string;
        file_name: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        uploaded_by?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        quote_version_id?: string;
        storage_path?: string;
        file_name?: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        uploaded_by?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_attachments_quote_version_id_fkey';
            columns: ['quote_version_id'];
            isOneToOne: false;
            referencedRelation: 'quote_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_attachments_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_change_requests: {
        Row: {
        id: string;
        quote_id: string;
        quote_version_id: string | null;
        message: string;
        requested_by: string | null;
        requested_side: Database['public']['Enums']['participant_side'];
        resolved_at: string | null;
        resolved_version_id: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        quote_id: string;
        quote_version_id?: string | null;
        message: string;
        requested_by?: string | null;
        requested_side?: Database['public']['Enums']['participant_side'];
        resolved_at?: string | null;
        resolved_version_id?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        quote_id?: string;
        quote_version_id?: string | null;
        message?: string;
        requested_by?: string | null;
        requested_side?: Database['public']['Enums']['participant_side'];
        resolved_at?: string | null;
        resolved_version_id?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_change_requests_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_change_requests_quote_version_id_fkey';
            columns: ['quote_version_id'];
            isOneToOne: false;
            referencedRelation: 'quote_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_change_requests_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_change_requests_resolved_version_id_fkey';
            columns: ['resolved_version_id'];
            isOneToOne: false;
            referencedRelation: 'quote_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_items: {
        Row: {
        id: string;
        quote_version_id: string;
        charge_kind: Database['public']['Enums']['charge_kind'];
        label: string;
        description: string | null;
        unit: string;
        quantity: number;
        unit_price_minor: number;
        line_total_minor: number | null;
        menu_item_id: string | null;
        is_optional: boolean;
        sort_order: number;
        created_at: string;
        };
        Insert: {
        id?: string;
        quote_version_id: string;
        charge_kind?: Database['public']['Enums']['charge_kind'];
        label: string;
        description?: string | null;
        unit?: string;
        quantity?: number;
        unit_price_minor?: number;
        menu_item_id?: string | null;
        is_optional?: boolean;
        sort_order?: number;
        created_at?: string;
        };
        Update: {
        id?: string;
        quote_version_id?: string;
        charge_kind?: Database['public']['Enums']['charge_kind'];
        label?: string;
        description?: string | null;
        unit?: string;
        quantity?: number;
        unit_price_minor?: number;
        menu_item_id?: string | null;
        is_optional?: boolean;
        sort_order?: number;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_items_menu_item_id_fkey';
            columns: ['menu_item_id'];
            isOneToOne: false;
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_items_quote_version_id_fkey';
            columns: ['quote_version_id'];
            isOneToOne: false;
            referencedRelation: 'quote_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_versions: {
        Row: {
        id: string;
        quote_id: string;
        version_no: number;
        status: Database['public']['Enums']['quote_status'];
        subtotal_minor: number;
        discount_minor: number;
        tax_minor: number;
        total_minor: number;
        guest_count: number | null;
        per_person_minor: number | null;
        menu_id: string | null;
        package_id: string | null;
        notes: string | null;
        payment_terms: string | null;
        cancellation_policy: string | null;
        valid_until: string | null;
        change_summary: string | null;
        submitted_at: string | null;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        quote_id: string;
        version_no: number;
        status?: Database['public']['Enums']['quote_status'];
        subtotal_minor?: number;
        discount_minor?: number;
        tax_minor?: number;
        total_minor?: number;
        guest_count?: number | null;
        per_person_minor?: number | null;
        menu_id?: string | null;
        package_id?: string | null;
        notes?: string | null;
        payment_terms?: string | null;
        cancellation_policy?: string | null;
        valid_until?: string | null;
        change_summary?: string | null;
        submitted_at?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        quote_id?: string;
        version_no?: number;
        status?: Database['public']['Enums']['quote_status'];
        subtotal_minor?: number;
        discount_minor?: number;
        tax_minor?: number;
        total_minor?: number;
        guest_count?: number | null;
        per_person_minor?: number | null;
        menu_id?: string | null;
        package_id?: string | null;
        notes?: string | null;
        payment_terms?: string | null;
        cancellation_policy?: string | null;
        valid_until?: string | null;
        change_summary?: string | null;
        submitted_at?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_versions_menu_id_fkey';
            columns: ['menu_id'];
            isOneToOne: false;
            referencedRelation: 'menus';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_versions_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'partner_packages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_versions_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      quotes: {
        Row: {
        id: string;
        reference: string;
        request_id: string;
        partner_id: string;
        category_id: string | null;
        invite_id: string | null;
        status: Database['public']['Enums']['quote_status'];
        current_version: number;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        reference?: string;
        request_id: string;
        partner_id: string;
        category_id?: string | null;
        invite_id?: string | null;
        status?: Database['public']['Enums']['quote_status'];
        current_version?: number;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        reference?: string;
        request_id?: string;
        partner_id?: string;
        category_id?: string | null;
        invite_id?: string | null;
        status?: Database['public']['Enums']['quote_status'];
        current_version?: number;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quotes_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_invite_id_fkey';
            columns: ['invite_id'];
            isOneToOne: false;
            referencedRelation: 'request_partner_invites';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limits: {
        Row: {
        bucket: string;
        identifier: string;
        window_start: string;
        count: number;
        };
        Insert: {
        bucket: string;
        identifier: string;
        window_start: string;
        count?: number;
        };
        Update: {
        bucket?: string;
        identifier?: string;
        window_start?: string;
        count?: number;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
        id: string;
        payment_id: string;
        event_id: string | null;
        booking_id: string | null;
        status: Database['public']['Enums']['refund_status'];
        amount_minor: number;
        reason: string;
        policy_note: string | null;
        provider_ref: string | null;
        requested_by: string | null;
        approved_by: string | null;
        approved_at: string | null;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        payment_id: string;
        event_id?: string | null;
        booking_id?: string | null;
        status?: Database['public']['Enums']['refund_status'];
        amount_minor: number;
        reason: string;
        policy_note?: string | null;
        provider_ref?: string | null;
        requested_by?: string | null;
        approved_by?: string | null;
        approved_at?: string | null;
        completed_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        payment_id?: string;
        event_id?: string | null;
        booking_id?: string | null;
        status?: Database['public']['Enums']['refund_status'];
        amount_minor?: number;
        reason?: string;
        policy_note?: string | null;
        provider_ref?: string | null;
        requested_by?: string | null;
        approved_by?: string | null;
        approved_at?: string | null;
        completed_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'refunds_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'refunds_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'refunds_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'refunds_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'refunds_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      request_attachments: {
        Row: {
        id: string;
        request_id: string;
        storage_path: string;
        file_name: string;
        mime_type: string | null;
        size_bytes: number | null;
        uploaded_by: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        request_id: string;
        storage_path: string;
        file_name: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        uploaded_by?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        request_id?: string;
        storage_path?: string;
        file_name?: string;
        mime_type?: string | null;
        size_bytes?: number | null;
        uploaded_by?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_attachments_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_attachments_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      request_cuisines: {
        Row: {
        request_id: string;
        cuisine_id: string;
        };
        Insert: {
        request_id: string;
        cuisine_id: string;
        };
        Update: {
        request_id?: string;
        cuisine_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_cuisines_cuisine_id_fkey';
            columns: ['cuisine_id'];
            isOneToOne: false;
            referencedRelation: 'cuisines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_cuisines_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      request_match_candidates: {
        Row: {
        id: string;
        request_id: string;
        partner_id: string;
        category_id: string | null;
        score: number;
        breakdown: Json;
        reasons: string[];
        disqualified: boolean;
        disqualify_reason: string | null;
        computed_at: string;
        };
        Insert: {
        id?: string;
        request_id: string;
        partner_id: string;
        category_id?: string | null;
        score?: number;
        breakdown?: Json;
        reasons?: string[];
        disqualified?: boolean;
        disqualify_reason?: string | null;
        computed_at?: string;
        };
        Update: {
        id?: string;
        request_id?: string;
        partner_id?: string;
        category_id?: string | null;
        score?: number;
        breakdown?: Json;
        reasons?: string[];
        disqualified?: boolean;
        disqualify_reason?: string | null;
        computed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_match_candidates_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_match_candidates_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_match_candidates_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      request_partner_invites: {
        Row: {
        id: string;
        request_id: string;
        partner_id: string;
        category_id: string | null;
        status: Database['public']['Enums']['invite_status'];
        message: string | null;
        respond_by: string | null;
        invited_by: string | null;
        invited_at: string;
        viewed_at: string | null;
        responded_at: string | null;
        decline_reason: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        request_id: string;
        partner_id: string;
        category_id?: string | null;
        status?: Database['public']['Enums']['invite_status'];
        message?: string | null;
        respond_by?: string | null;
        invited_by?: string | null;
        invited_at?: string;
        viewed_at?: string | null;
        responded_at?: string | null;
        decline_reason?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        request_id?: string;
        partner_id?: string;
        category_id?: string | null;
        status?: Database['public']['Enums']['invite_status'];
        message?: string | null;
        respond_by?: string | null;
        invited_by?: string | null;
        invited_at?: string;
        viewed_at?: string | null;
        responded_at?: string | null;
        decline_reason?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_partner_invites_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_partner_invites_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_partner_invites_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_partner_invites_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      request_services: {
        Row: {
        id: string;
        request_id: string;
        category_id: string;
        notes: string | null;
        quantity: number | null;
        budget_minor: number | null;
        is_primary: boolean;
        created_at: string;
        };
        Insert: {
        id?: string;
        request_id: string;
        category_id: string;
        notes?: string | null;
        quantity?: number | null;
        budget_minor?: number | null;
        is_primary?: boolean;
        created_at?: string;
        };
        Update: {
        id?: string;
        request_id?: string;
        category_id?: string;
        notes?: string | null;
        quantity?: number | null;
        budget_minor?: number | null;
        is_primary?: boolean;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_services_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_services_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      request_status_history: {
        Row: {
        id: string;
        request_id: string;
        from_status: Database['public']['Enums']['request_status'] | null;
        to_status: Database['public']['Enums']['request_status'];
        note: string | null;
        actor_id: string | null;
        created_at: string;
        };
        Insert: {
        id?: string;
        request_id: string;
        from_status?: Database['public']['Enums']['request_status'] | null;
        to_status: Database['public']['Enums']['request_status'];
        note?: string | null;
        actor_id?: string | null;
        created_at?: string;
        };
        Update: {
        id?: string;
        request_id?: string;
        from_status?: Database['public']['Enums']['request_status'] | null;
        to_status?: Database['public']['Enums']['request_status'];
        note?: string | null;
        actor_id?: string | null;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_status_history_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'request_status_history_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      review_responses: {
        Row: {
        id: string;
        review_id: string;
        partner_id: string;
        author_id: string | null;
        body: string;
        status: Database['public']['Enums']['review_status'];
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        review_id: string;
        partner_id: string;
        author_id?: string | null;
        body: string;
        status?: Database['public']['Enums']['review_status'];
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        review_id?: string;
        partner_id?: string;
        author_id?: string | null;
        body?: string;
        status?: Database['public']['Enums']['review_status'];
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'review_responses_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'review_responses_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'review_responses_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: true;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
        id: string;
        booking_id: string;
        event_id: string | null;
        partner_id: string;
        author_id: string;
        organization_id: string | null;
        status: Database['public']['Enums']['review_status'];
        rating: number;
        quality_rating: number | null;
        communication_rating: number | null;
        punctuality_rating: number | null;
        value_rating: number | null;
        title: string | null;
        comment: string | null;
        photos: string[];
        is_anonymous: boolean;
        moderated_by: string | null;
        moderated_at: string | null;
        moderation_note: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        booking_id: string;
        event_id?: string | null;
        partner_id: string;
        author_id: string;
        organization_id?: string | null;
        status?: Database['public']['Enums']['review_status'];
        rating: number;
        quality_rating?: number | null;
        communication_rating?: number | null;
        punctuality_rating?: number | null;
        value_rating?: number | null;
        title?: string | null;
        comment?: string | null;
        photos?: string[];
        is_anonymous?: boolean;
        moderated_by?: string | null;
        moderated_at?: string | null;
        moderation_note?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        booking_id?: string;
        event_id?: string | null;
        partner_id?: string;
        author_id?: string;
        organization_id?: string | null;
        status?: Database['public']['Enums']['review_status'];
        rating?: number;
        quality_rating?: number | null;
        communication_rating?: number | null;
        punctuality_rating?: number | null;
        value_rating?: number | null;
        title?: string | null;
        comment?: string | null;
        photos?: string[];
        is_anonymous?: boolean;
        moderated_by?: string | null;
        moderated_at?: string | null;
        moderation_note?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_moderated_by_fkey';
            columns: ['moderated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      role_permissions: {
        Row: {
        role: Database['public']['Enums']['platform_role'];
        permission_key: string;
        };
        Insert: {
        role: Database['public']['Enums']['platform_role'];
        permission_key: string;
        };
        Update: {
        role?: Database['public']['Enums']['platform_role'];
        permission_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_key_fkey';
            columns: ['permission_key'];
            isOneToOne: false;
            referencedRelation: 'permissions';
            referencedColumns: ['key'];
          },
        ];
      };
      service_categories: {
        Row: {
        id: string;
        parent_id: string | null;
        slug: string;
        name: string;
        name_bn: string | null;
        kind: string;
        short_description: string | null;
        description: string | null;
        icon: string | null;
        image_url: string | null;
        commission_bps: number | null;
        sort_order: number;
        is_active: boolean;
        is_featured: boolean;
        seo_title: string | null;
        seo_description: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        parent_id?: string | null;
        slug: string;
        name: string;
        name_bn?: string | null;
        kind?: string;
        short_description?: string | null;
        description?: string | null;
        icon?: string | null;
        image_url?: string | null;
        commission_bps?: number | null;
        sort_order?: number;
        is_active?: boolean;
        is_featured?: boolean;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        parent_id?: string | null;
        slug?: string;
        name?: string;
        name_bn?: string | null;
        kind?: string;
        short_description?: string | null;
        description?: string | null;
        icon?: string | null;
        image_url?: string | null;
        commission_bps?: number | null;
        sort_order?: number;
        is_active?: boolean;
        is_featured?: boolean;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_categories_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      service_requests: {
        Row: {
        id: string;
        reference: string;
        status: Database['public']['Enums']['request_status'];
        customer_profile_id: string;
        organization_id: string | null;
        event_type_id: string | null;
        title: string;
        event_date: string | null;
        event_end_date: string | null;
        start_time: string | null;
        end_time: string | null;
        is_date_flexible: boolean;
        guest_count: number | null;
        guest_count_max: number | null;
        city_id: string | null;
        area_id: string | null;
        venue_name: string | null;
        address_line: string | null;
        venue_notes: string | null;
        budget_mode: Database['public']['Enums']['budget_mode'];
        budget_total_minor: number | null;
        budget_per_person_minor: number | null;
        budget_min_minor: number | null;
        budget_max_minor: number | null;
        dietary_notes: string | null;
        requirements: string | null;
        contact_name: string | null;
        contact_phone: string | null;
        contact_email: string | null;
        preferred_channel: string;
        source: string;
        assigned_to: string | null;
        quote_deadline: string | null;
        submitted_at: string | null;
        closed_at: string | null;
        lost_reason: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        reference?: string;
        status?: Database['public']['Enums']['request_status'];
        customer_profile_id: string;
        organization_id?: string | null;
        event_type_id?: string | null;
        title?: string;
        event_date?: string | null;
        event_end_date?: string | null;
        start_time?: string | null;
        end_time?: string | null;
        is_date_flexible?: boolean;
        guest_count?: number | null;
        guest_count_max?: number | null;
        city_id?: string | null;
        area_id?: string | null;
        venue_name?: string | null;
        address_line?: string | null;
        venue_notes?: string | null;
        budget_mode?: Database['public']['Enums']['budget_mode'];
        budget_total_minor?: number | null;
        budget_per_person_minor?: number | null;
        budget_min_minor?: number | null;
        budget_max_minor?: number | null;
        dietary_notes?: string | null;
        requirements?: string | null;
        contact_name?: string | null;
        contact_phone?: string | null;
        contact_email?: string | null;
        preferred_channel?: string;
        source?: string;
        assigned_to?: string | null;
        quote_deadline?: string | null;
        submitted_at?: string | null;
        closed_at?: string | null;
        lost_reason?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        reference?: string;
        status?: Database['public']['Enums']['request_status'];
        customer_profile_id?: string;
        organization_id?: string | null;
        event_type_id?: string | null;
        title?: string;
        event_date?: string | null;
        event_end_date?: string | null;
        start_time?: string | null;
        end_time?: string | null;
        is_date_flexible?: boolean;
        guest_count?: number | null;
        guest_count_max?: number | null;
        city_id?: string | null;
        area_id?: string | null;
        venue_name?: string | null;
        address_line?: string | null;
        venue_notes?: string | null;
        budget_mode?: Database['public']['Enums']['budget_mode'];
        budget_total_minor?: number | null;
        budget_per_person_minor?: number | null;
        budget_min_minor?: number | null;
        budget_max_minor?: number | null;
        dietary_notes?: string | null;
        requirements?: string | null;
        contact_name?: string | null;
        contact_phone?: string | null;
        contact_email?: string | null;
        preferred_channel?: string;
        source?: string;
        assigned_to?: string | null;
        quote_deadline?: string | null;
        submitted_at?: string | null;
        closed_at?: string | null;
        lost_reason?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_requests_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_customer_profile_id_fkey';
            columns: ['customer_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_event_type_id_fkey';
            columns: ['event_type_id'];
            isOneToOne: false;
            referencedRelation: 'event_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      support_tickets: {
        Row: {
        id: string;
        reference: string;
        subject: string;
        category: string;
        status: Database['public']['Enums']['ticket_status'];
        priority: Database['public']['Enums']['ticket_priority'];
        opened_by: string;
        opener_side: Database['public']['Enums']['participant_side'];
        organization_id: string | null;
        partner_id: string | null;
        event_id: string | null;
        booking_id: string | null;
        payment_id: string | null;
        assigned_to: string | null;
        thread_id: string | null;
        resolution: string | null;
        resolved_at: string | null;
        closed_at: string | null;
        first_response_at: string | null;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        reference?: string;
        subject: string;
        category?: string;
        status?: Database['public']['Enums']['ticket_status'];
        priority?: Database['public']['Enums']['ticket_priority'];
        opened_by: string;
        opener_side: Database['public']['Enums']['participant_side'];
        organization_id?: string | null;
        partner_id?: string | null;
        event_id?: string | null;
        booking_id?: string | null;
        payment_id?: string | null;
        assigned_to?: string | null;
        thread_id?: string | null;
        resolution?: string | null;
        resolved_at?: string | null;
        closed_at?: string | null;
        first_response_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        reference?: string;
        subject?: string;
        category?: string;
        status?: Database['public']['Enums']['ticket_status'];
        priority?: Database['public']['Enums']['ticket_priority'];
        opened_by?: string;
        opener_side?: Database['public']['Enums']['participant_side'];
        organization_id?: string | null;
        partner_id?: string | null;
        event_id?: string | null;
        booking_id?: string | null;
        payment_id?: string | null;
        assigned_to?: string | null;
        thread_id?: string | null;
        resolution?: string | null;
        resolved_at?: string | null;
        closed_at?: string | null;
        first_response_at?: string | null;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_tickets_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'partner_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'message_threads';
            referencedColumns: ['id'];
          },
        ];
      };
      system_settings: {
        Row: {
        key: string;
        value: Json;
        value_type: string;
        label: string;
        description: string | null;
        category: string;
        is_public: boolean;
        updated_by: string | null;
        updated_at: string;
        };
        Insert: {
        key: string;
        value: Json;
        value_type?: string;
        label: string;
        description?: string | null;
        category?: string;
        is_public?: boolean;
        updated_by?: string | null;
        updated_at?: string;
        };
        Update: {
        key?: string;
        value?: Json;
        value_type?: string;
        label?: string;
        description?: string | null;
        category?: string;
        is_public?: boolean;
        updated_by?: string | null;
        updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'system_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      testimonials: {
        Row: {
        id: string;
        author_name: string;
        author_title: string | null;
        company: string | null;
        avatar_url: string | null;
        quote: string;
        rating: number | null;
        event_type: string | null;
        is_published: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
        };
        Insert: {
        id?: string;
        author_name: string;
        author_title?: string | null;
        company?: string | null;
        avatar_url?: string | null;
        quote: string;
        rating?: number | null;
        event_type?: string | null;
        is_published?: boolean;
        sort_order?: number;
        created_at?: string;
        updated_at?: string;
        };
        Update: {
        id?: string;
        author_name?: string;
        author_title?: string | null;
        company?: string | null;
        avatar_url?: string | null;
        quote?: string;
        rating?: number | null;
        event_type?: string | null;
        is_published?: boolean;
        sort_order?: number;
        created_at?: string;
        updated_at?: string;
        };
        Relationships: [];
      };
      thread_participants: {
        Row: {
        id: string;
        thread_id: string;
        profile_id: string;
        side: Database['public']['Enums']['participant_side'];
        last_read_at: string | null;
        is_muted: boolean;
        joined_at: string;
        left_at: string | null;
        };
        Insert: {
        id?: string;
        thread_id: string;
        profile_id: string;
        side: Database['public']['Enums']['participant_side'];
        last_read_at?: string | null;
        is_muted?: boolean;
        joined_at?: string;
        left_at?: string | null;
        };
        Update: {
        id?: string;
        thread_id?: string;
        profile_id?: string;
        side?: Database['public']['Enums']['participant_side'];
        last_read_at?: string | null;
        is_muted?: boolean;
        joined_at?: string;
        left_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'thread_participants_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_participants_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'message_threads';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_messages: {
        Row: {
        id: string;
        ticket_id: string;
        author_id: string | null;
        body: string;
        is_internal: boolean;
        attachments: Json;
        created_at: string;
        };
        Insert: {
        id?: string;
        ticket_id: string;
        author_id?: string | null;
        body: string;
        is_internal?: boolean;
        attachments?: Json;
        created_at?: string;
        };
        Update: {
        id?: string;
        ticket_id?: string;
        author_id?: string | null;
        body?: string;
        is_internal?: boolean;
        attachments?: Json;
        created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_messages_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_messages_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      event_financials: {
        Row: {
        event_id: string | null;
        total_minor: number | null;
        collected_minor: number | null;
        refunded_minor: number | null;
        outstanding_minor: number | null;
        };
        Relationships: [];
      };
      partner_earnings_summary: {
        Row: {
        partner_id: string | null;
        completed_count: number | null;
        upcoming_count: number | null;
        lifetime_earned_minor: number | null;
        pending_payout_minor: number | null;
        };
        Relationships: [];
      };
      partner_search_index: {
        Row: {
        partner_id: string | null;
        slug: string | null;
        display_name: string | null;
        tagline: string | null;
        logo_url: string | null;
        cover_image_url: string | null;
        rating_avg: number | null;
        rating_count: number | null;
        completed_bookings: number | null;
        is_featured: boolean | null;
        min_guests: number | null;
        max_guests: number | null;
        min_order_minor: number | null;
        category_ids: string[] | null;
        city_ids: string[] | null;
        area_ids: string[] | null;
        cuisine_ids: string[] | null;
        event_type_ids: string[] | null;
        price_from_minor: number | null;
        };
        Relationships: [];
      };
      public_partners: {
        Row: {
        id: string | null;
        slug: string | null;
        display_name: string | null;
        tagline: string | null;
        about: string | null;
        logo_url: string | null;
        cover_image_url: string | null;
        business_type: string | null;
        year_established: number | null;
        min_guests: number | null;
        max_guests: number | null;
        min_order_minor: number | null;
        lead_time_hours: number | null;
        rating_avg: number | null;
        rating_count: number | null;
        completed_bookings: number | null;
        is_featured: boolean | null;
        is_accepting_orders: boolean | null;
        cancellation_policy: string | null;
        payment_terms: string | null;
        seo_title: string | null;
        seo_description: string | null;
        published_at: string | null;
        organization_name: string | null;
        city: string | null;
        area: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_proposal: {
        Args: {
          p_proposal: string;
        };
        Returns: string;
      };
      consume_rate_limit: {
        Args: {
          p_bucket: string;
          p_identifier: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      health_check: {
        Args: Record<string, never>;
        Returns: Json;
      };
      mark_thread_read: {
        Args: {
          p_thread: string;
        };
        Returns: undefined;
      };
      post_ledger_entries: {
        Args: {
          p_entries: Json;
          p_description?: string;
        };
        Returns: string;
      };
      prune_rate_limits: {
        Args: Record<string, never>;
        Returns: number;
      };
      resolve_pricing_rule: {
        Args: {
          p_category?: string;
          p_partner?: string;
          p_organization?: string;
          p_event_type?: string;
        };
        Returns: Database['public']['Tables']['pricing_rules']['Row'];
      };
      submit_quote_version: {
        Args: {
          p_version: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      booking_status: 'draft' | 'pending_payment' | 'partially_paid' | 'confirmed' | 'in_preparation' | 'ready' | 'in_progress' | 'completed' | 'cancelled' | 'disputed' | 'refunded' | 'closed';
      budget_mode: 'total' | 'per_person' | 'range' | 'flexible';
      charge_kind: 'food' | 'beverage' | 'delivery' | 'setup' | 'service_staff' | 'equipment' | 'decoration' | 'venue' | 'transport' | 'rental' | 'other';
      document_kind: 'trade_license' | 'nid' | 'tin' | 'bin_vat' | 'bank_statement' | 'food_license' | 'insurance' | 'contract' | 'portfolio' | 'other';
      event_stage: 'inquiry' | 'proposal' | 'confirmed' | 'planning' | 'vendor_preparation' | 'pre_event' | 'event_day' | 'completed' | 'closed';
      fee_bearer: 'customer' | 'partner' | 'platform';
      invite_status: 'invited' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
      invoice_kind: 'customer_invoice' | 'partner_statement' | 'credit_note';
      invoice_status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void' | 'overdue';
      ledger_account: 'customer_receivable' | 'platform_revenue' | 'partner_payable' | 'gateway_clearing' | 'tax_payable' | 'refund_clearing' | 'discount_expense';
      ledger_direction: 'debit' | 'credit';
      member_status: 'invited' | 'active' | 'suspended' | 'removed';
      message_kind: 'user' | 'system' | 'note';
      notification_channel: 'in_app' | 'email' | 'sms' | 'whatsapp';
      org_kind: 'customer' | 'partner';
      org_member_role: 'owner' | 'admin' | 'manager' | 'staff';
      participant_side: 'customer' | 'partner' | 'platform';
      payment_purpose: 'deposit' | 'balance' | 'full' | 'addon' | 'penalty';
      payment_status: 'initiated' | 'pending' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded' | 'partially_refunded';
      payout_method: 'bank_transfer' | 'bkash' | 'nagad' | 'rocket' | 'cash' | 'adjustment';
      payout_status: 'pending' | 'approved' | 'processing' | 'paid' | 'failed' | 'cancelled';
      platform_role: 'super_admin' | 'ops_admin' | 'finance_admin' | 'support_admin' | 'content_admin';
      proposal_status: 'draft' | 'sent' | 'viewed' | 'changes_requested' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
      quote_status: 'draft' | 'submitted' | 'under_review' | 'shared' | 'changes_requested' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
      refund_status: 'requested' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';
      request_status: 'draft' | 'submitted' | 'under_review' | 'matching' | 'partners_invited' | 'quotes_received' | 'proposal_sent' | 'won' | 'lost' | 'cancelled' | 'expired';
      review_status: 'pending' | 'published' | 'hidden' | 'rejected';
      task_status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
      thread_kind: 'customer_platform' | 'partner_platform' | 'customer_partner' | 'internal' | 'support';
      ticket_priority: 'low' | 'normal' | 'high' | 'urgent';
      ticket_status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
      verification_status: 'unsubmitted' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
export type Functions<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T];
