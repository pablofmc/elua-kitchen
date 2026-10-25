
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ingredient_lines": {
                  Row: {
                    "component_id": number,"counts_as_flour": boolean,"id": number,"ingredient_id": number,"position": number,"quantity": number,"unit": Database["public"]['Enums']["unit"]
                  }
                  ComputedFields: never
                  Insert: {
                    "component_id": number,"counts_as_flour"?: boolean,"id"?: never,"ingredient_id": number,"position": number,"quantity": number,"unit": Database["public"]['Enums']["unit"]
                  }
                  Update: {
                    "component_id"?: number,"counts_as_flour"?: boolean,"id"?: never,"ingredient_id"?: number,"position"?: number,"quantity"?: number,"unit"?: Database["public"]['Enums']["unit"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredient_lines_component_id_fkey"
      columns: ["component_id"]
isOneToOne: false
      referencedRelation: "recipe_components"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingredient_lines_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    }
                  ]
                },"ingredients": {
                  Row: {
                    "created_at": string,"default_unit": Database["public"]['Enums']["unit"],"grams_per_unit": number | null,"id": number,"kind": Database["public"]['Enums']["ingredient_kind"],"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_unit"?: Database["public"]['Enums']["unit"],"grams_per_unit"?: number | null,"id"?: never,"kind"?: Database["public"]['Enums']["ingredient_kind"],"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"default_unit"?: Database["public"]['Enums']["unit"],"grams_per_unit"?: number | null,"id"?: never,"kind"?: Database["public"]['Enums']["ingredient_kind"],"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"process_runs": {
                  Row: {
                    "ends_at": string | null,"id": number,"log": NonNullable<Json>,"notified_at": string | null,"recipe_version_id": number,"remaining_seconds": number | null,"slot_index": number,"slot_started_at": string,"started_at": string,"status": Database["public"]['Enums']["process_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ends_at"?: string | null,"id"?: never,"log"?: NonNullable<Json>,"notified_at"?: string | null,"recipe_version_id": number,"remaining_seconds"?: number | null,"slot_index"?: number,"slot_started_at"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["process_status"],"updated_at"?: string
                  }
                  Update: {
                    "ends_at"?: string | null,"id"?: never,"log"?: NonNullable<Json>,"notified_at"?: string | null,"recipe_version_id"?: number,"remaining_seconds"?: number | null,"slot_index"?: number,"slot_started_at"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["process_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "process_runs_recipe_version_id_fkey"
      columns: ["recipe_version_id"]
isOneToOne: false
      referencedRelation: "recipe_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"process_steps": {
                  Row: {
                    "duration_minutes": number | null,"id": number,"interval_minutes": number | null,"is_manual": boolean,"name": string,"position": number,"repeats": number,"version_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "duration_minutes"?: number | null,"id"?: never,"interval_minutes"?: number | null,"is_manual"?: boolean,"name": string,"position": number,"repeats"?: number,"version_id": number
                  }
                  Update: {
                    "duration_minutes"?: number | null,"id"?: never,"interval_minutes"?: number | null,"is_manual"?: boolean,"name"?: string,"position"?: number,"repeats"?: number,"version_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "process_steps_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "recipe_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": number,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: never,"p256dh": string,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: never,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recipe_components": {
                  Row: {
                    "id": number,"name": string,"position": number,"version_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"name": string,"position": number,"version_id": number
                  }
                  Update: {
                    "id"?: never,"name"?: string,"position"?: number,"version_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_components_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "recipe_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_versions": {
                  Row: {
                    "base_yield": number,"change_note": string | null,"created_at": string,"id": number,"recipe_id": number,"version_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "base_yield": number,"change_note"?: string | null,"created_at"?: string,"id"?: never,"recipe_id": number,"version_number": number
                  }
                  Update: {
                    "base_yield"?: number,"change_note"?: string | null,"created_at"?: string,"id"?: never,"recipe_id"?: number,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_versions_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "category": Database["public"]['Enums']["recipe_category"],"created_at": string,"id": number,"name": string,"photo_path": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["recipe_category"],"created_at"?: string,"id"?: never,"name": string,"photo_path"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["recipe_category"],"created_at"?: string,"id"?: never,"name"?: string,"photo_path"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_recipe_version":
{ Args: { "p_recipe_id": number,"p_version": Json }; Returns: number
                           },
"create_recipe":
{ Args: { "p_category": Database["public"]['Enums']["recipe_category"],"p_name": string,"p_photo_path"?: string,"p_version": Json }; Returns: number
                           },
"update_recipe":
{ Args: { "p_category": Database["public"]['Enums']["recipe_category"],"p_expected_version": number,"p_name": string,"p_photo_path"?: string,"p_recipe_id": number,"p_version"?: Json }; Returns: number
                           }
          }
          Enums: {
            "ingredient_kind": "harina"|"liquido"|"masa_madre"|"sal"|"grasa"|"azucar"|"otro","process_status": "activo"|"terminado"|"cancelado","recipe_category": "dulce"|"salado","unit": "g"|"ml"|"unidad"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "ingredient_kind": ["harina", "liquido", "masa_madre", "sal", "grasa", "azucar", "otro"],"process_status": ["activo", "terminado", "cancelado"],"recipe_category": ["dulce", "salado"],"unit": ["g", "ml", "unidad"]
          }
        }
} as const
