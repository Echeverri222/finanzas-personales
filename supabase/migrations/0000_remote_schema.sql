

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."tipo_entrenamiento" AS ENUM (
    'Recovery',
    'Tempo',
    'Intervals',
    'Long Run',
    'Gym'
);


ALTER TYPE "public"."tipo_entrenamiento" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.usuarios (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."metas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre_objetivo" "text" NOT NULL,
    "meta_total" numeric NOT NULL,
    "fecha_meta" "date" NOT NULL,
    "descripcion" "text",
    "usuario_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "monto_actual" numeric DEFAULT 0
);


ALTER TABLE "public"."metas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."movimiento_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "movimiento_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."movimiento_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."movimiento_tags" IS 'Junction: which tags are assigned to which movimientos.';



CREATE TABLE IF NOT EXISTS "public"."movimientos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fecha" "date" NOT NULL,
    "nombre" "text" NOT NULL,
    "importe" numeric NOT NULL,
    "usuario_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "id_tipo_movimiento" "uuid" NOT NULL,
    "recurring_id" "uuid"
);


ALTER TABLE "public"."movimientos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pagos_recurrentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "importe" numeric NOT NULL,
    "id_tipo_movimiento" "uuid" NOT NULL,
    "dia_mes" smallint NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pagos_recurrentes_dia_mes_check" CHECK ((("dia_mes" >= 1) AND ("dia_mes" <= 31))),
    CONSTRAINT "pagos_recurrentes_importe_check" CHECK (("importe" <> (0)::numeric))
);


ALTER TABLE "public"."pagos_recurrentes" OWNER TO "postgres";


COMMENT ON TABLE "public"."pagos_recurrentes" IS 'Recurring payments: same amount every month on dia_mes (1-31). Processed by app to insert into movimientos.';



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."tags" IS 'User-defined labels for movimientos (e.g. trabajo, vacaciones).';



CREATE TABLE IF NOT EXISTS "public"."tipo_movimiento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid",
    "nombre" "text" NOT NULL,
    "meta" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tipo_movimiento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "nombre" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


ALTER TABLE ONLY "public"."metas"
    ADD CONSTRAINT "metas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movimiento_tags"
    ADD CONSTRAINT "movimiento_tags_movimiento_id_tag_id_key" UNIQUE ("movimiento_id", "tag_id");



ALTER TABLE ONLY "public"."movimiento_tags"
    ADD CONSTRAINT "movimiento_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movimientos"
    ADD CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagos_recurrentes"
    ADD CONSTRAINT "pagos_recurrentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_usuario_id_nombre_key" UNIQUE ("usuario_id", "nombre");



ALTER TABLE ONLY "public"."tipo_movimiento"
    ADD CONSTRAINT "tipo_movimiento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_movimiento_tags_mov" ON "public"."movimiento_tags" USING "btree" ("movimiento_id");



CREATE INDEX "idx_movimiento_tags_tag" ON "public"."movimiento_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_pagos_recurrentes_usuario_activo_dia" ON "public"."pagos_recurrentes" USING "btree" ("usuario_id", "activo", "dia_mes");



CREATE INDEX "idx_tags_usuario" ON "public"."tags" USING "btree" ("usuario_id");



CREATE OR REPLACE TRIGGER "pagos_recurrentes_updated_at" BEFORE UPDATE ON "public"."pagos_recurrentes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_metas_updated_at" BEFORE UPDATE ON "public"."metas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_movimientos_updated_at" BEFORE UPDATE ON "public"."movimientos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_usuarios_updated_at" BEFORE UPDATE ON "public"."usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."movimientos"
    ADD CONSTRAINT "fk_tipo_movimiento" FOREIGN KEY ("id_tipo_movimiento") REFERENCES "public"."tipo_movimiento"("id");



ALTER TABLE ONLY "public"."metas"
    ADD CONSTRAINT "metas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."movimiento_tags"
    ADD CONSTRAINT "movimiento_tags_movimiento_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "public"."movimientos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movimiento_tags"
    ADD CONSTRAINT "movimiento_tags_tag_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movimientos"
    ADD CONSTRAINT "movimientos_recurring_id_fkey" FOREIGN KEY ("recurring_id") REFERENCES "public"."pagos_recurrentes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."movimientos"
    ADD CONSTRAINT "movimientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."pagos_recurrentes"
    ADD CONSTRAINT "pagos_recurrentes_tipo_fkey" FOREIGN KEY ("id_tipo_movimiento") REFERENCES "public"."tipo_movimiento"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pagos_recurrentes"
    ADD CONSTRAINT "pagos_recurrentes_usuario_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_usuario_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tipo_movimiento"
    ADD CONSTRAINT "tipo_movimiento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Actualizar metas propias" ON "public"."metas" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "metas"."usuario_id") AND ("usuarios"."user_id" = "auth"."uid"())))));



CREATE POLICY "Actualizar movimientos propios" ON "public"."movimientos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "movimientos"."usuario_id") AND ("usuarios"."user_id" = "auth"."uid"())))));



CREATE POLICY "Eliminar metas propias" ON "public"."metas" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "metas"."usuario_id") AND ("usuarios"."user_id" = "auth"."uid"())))));



CREATE POLICY "Eliminar movimientos propios" ON "public"."movimientos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "movimientos"."usuario_id") AND ("usuarios"."user_id" = "auth"."uid"())))));



CREATE POLICY "Insertar metas propias" ON "public"."metas" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "metas"."usuario_id") AND ("usuarios"."user_id" = "auth"."uid"())))));



CREATE POLICY "Insertar movimientos propios" ON "public"."movimientos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "movimientos"."usuario_id") AND ("usuarios"."user_id" = "auth"."uid"())))));



CREATE POLICY "Los usuarios pueden actualizar su propio perfil" ON "public"."usuarios" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Los usuarios pueden actualizar sus propias metas" ON "public"."metas" FOR UPDATE USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Los usuarios pueden actualizar sus propios movimientos" ON "public"."movimientos" FOR UPDATE USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Los usuarios pueden crear sus propias metas" ON "public"."metas" FOR INSERT WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Los usuarios pueden crear sus propios movimientos" ON "public"."movimientos" FOR INSERT WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Los usuarios pueden eliminar sus propias metas" ON "public"."metas" FOR DELETE USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Los usuarios pueden eliminar sus propios movimientos" ON "public"."movimientos" FOR DELETE USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Los usuarios pueden ver su propio perfil" ON "public"."usuarios" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Los usuarios pueden ver sus propias metas" ON "public"."metas" FOR SELECT USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Los usuarios pueden ver sus propios movimientos" ON "public"."movimientos" FOR SELECT USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Users can delete their own movement types" ON "public"."tipo_movimiento" FOR DELETE USING (("usuario_id" IN ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own movement types" ON "public"."tipo_movimiento" FOR INSERT WITH CHECK (("usuario_id" IN ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage movimiento_tags for own movimientos" ON "public"."movimiento_tags" USING ((("tag_id" IN ( SELECT "tags"."id"
   FROM "public"."tags"
  WHERE ("tags"."usuario_id" IN ( SELECT "usuarios"."id"
           FROM "public"."usuarios"
          WHERE ("usuarios"."user_id" = "auth"."uid"()))))) AND ("movimiento_id" IN ( SELECT "movimientos"."id"
   FROM "public"."movimientos"
  WHERE ("movimientos"."usuario_id" IN ( SELECT "usuarios"."id"
           FROM "public"."usuarios"
          WHERE ("usuarios"."user_id" = "auth"."uid"()))))))) WITH CHECK ((("tag_id" IN ( SELECT "tags"."id"
   FROM "public"."tags"
  WHERE ("tags"."usuario_id" IN ( SELECT "usuarios"."id"
           FROM "public"."usuarios"
          WHERE ("usuarios"."user_id" = "auth"."uid"()))))) AND ("movimiento_id" IN ( SELECT "movimientos"."id"
   FROM "public"."movimientos"
  WHERE ("movimientos"."usuario_id" IN ( SELECT "usuarios"."id"
           FROM "public"."usuarios"
          WHERE ("usuarios"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can manage own recurring" ON "public"."pagos_recurrentes" USING (("usuario_id" IN ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."user_id" = "auth"."uid"())))) WITH CHECK (("usuario_id" IN ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage own tags" ON "public"."tags" USING (("usuario_id" IN ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."user_id" = "auth"."uid"())))) WITH CHECK (("usuario_id" IN ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own movement types" ON "public"."tipo_movimiento" FOR UPDATE USING (("usuario_id" IN ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own movement types" ON "public"."tipo_movimiento" FOR SELECT USING (("usuario_id" IN ( SELECT "usuarios"."id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."user_id" = "auth"."uid"()))));



CREATE POLICY "Usuarios pueden actualizar su perfil" ON "public"."usuarios" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios pueden crear su perfil" ON "public"."usuarios" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios pueden ver su propio perfil" ON "public"."usuarios" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Ver metas propias" ON "public"."metas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "metas"."usuario_id") AND ("usuarios"."user_id" = "auth"."uid"())))));



CREATE POLICY "Ver movimientos propios" ON "public"."movimientos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "movimientos"."usuario_id") AND ("usuarios"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."metas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."movimiento_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."movimientos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos_recurrentes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipo_movimiento" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."metas" TO "anon";
GRANT ALL ON TABLE "public"."metas" TO "authenticated";
GRANT ALL ON TABLE "public"."metas" TO "service_role";



GRANT ALL ON TABLE "public"."movimiento_tags" TO "anon";
GRANT ALL ON TABLE "public"."movimiento_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."movimiento_tags" TO "service_role";



GRANT ALL ON TABLE "public"."movimientos" TO "anon";
GRANT ALL ON TABLE "public"."movimientos" TO "authenticated";
GRANT ALL ON TABLE "public"."movimientos" TO "service_role";



GRANT ALL ON TABLE "public"."pagos_recurrentes" TO "anon";
GRANT ALL ON TABLE "public"."pagos_recurrentes" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos_recurrentes" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."tipo_movimiento" TO "anon";
GRANT ALL ON TABLE "public"."tipo_movimiento" TO "authenticated";
GRANT ALL ON TABLE "public"."tipo_movimiento" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






