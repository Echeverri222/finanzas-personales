export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      metas: {
        Row: {
          created_at: string | null
          descripcion: string | null
          fecha_meta: string
          id: string
          meta_total: number
          monto_actual: number | null
          nombre_objetivo: string
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          fecha_meta: string
          id?: string
          meta_total: number
          monto_actual?: number | null
          nombre_objetivo: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          fecha_meta?: string
          id?: string
          meta_total?: number
          monto_actual?: number | null
          nombre_objetivo?: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento_tags: {
        Row: {
          created_at: string
          id: string
          movimiento_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movimiento_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movimiento_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_tags_movimiento_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_tags_tag_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos: {
        Row: {
          created_at: string | null
          fecha: string
          id: string
          id_tipo_movimiento: string
          importe: number
          nombre: string
          recurring_id: string | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          fecha: string
          id?: string
          id_tipo_movimiento: string
          importe: number
          nombre: string
          recurring_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          fecha?: string
          id?: string
          id_tipo_movimiento?: string
          importe?: number
          nombre?: string
          recurring_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tipo_movimiento"
            columns: ["id_tipo_movimiento"]
            isOneToOne: false
            referencedRelation: "tipo_movimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "pagos_recurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_recurrentes: {
        Row: {
          activo: boolean
          created_at: string
          dia_mes: number
          generar_desde: string
          id: string
          id_tipo_movimiento: string
          importe: number
          nombre: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          dia_mes: number
          generar_desde?: string
          id?: string
          id_tipo_movimiento: string
          importe: number
          nombre: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          dia_mes?: number
          generar_desde?: string
          id?: string
          id_tipo_movimiento?: string
          importe?: number
          nombre?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_recurrentes_tipo_fkey"
            columns: ["id_tipo_movimiento"]
            isOneToOne: false
            referencedRelation: "tipo_movimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_recurrentes_usuario_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          nombre: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_usuario_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_movimiento: {
        Row: {
          created_at: string | null
          id: string
          meta: number | null
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: number | null
          nombre: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: number | null
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipo_movimiento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          created_at: string
          currency: string
          email: string
          id: string
          nombre: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          email: string
          id?: string
          nombre?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          email?: string
          id?: string
          nombre?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generar_recurrentes_del_mes: {
        Args: { p_hoy?: string }
        Returns: {
          accion: string
          movimiento_id: string
          regla: string
        }[]
      }
    }
    Enums: {
      tipo_categoria: "ingreso" | "gasto" | "ahorro" | "inversion" | "prestamo"
      tipo_entrenamiento:
        | "Recovery"
        | "Tempo"
        | "Intervals"
        | "Long Run"
        | "Gym"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tipo_categoria: ["ingreso", "gasto", "ahorro", "inversion", "prestamo"],
      tipo_entrenamiento: ["Recovery", "Tempo", "Intervals", "Long Run", "Gym"],
    },
  },
} as const

