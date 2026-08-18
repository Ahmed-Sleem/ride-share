CREATE TABLE public.audit_log (
id uuid DEFAULT gen_random_uuid() NOT NULL,
actor_id uuid,
action text NOT NULL,
target_type text,
target_id text,
before jsonb,
after jsonb,
reason text,
created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.driver_profiles (
id uuid DEFAULT gen_random_uuid() NOT NULL,
user_id uuid NOT NULL,
status text DEFAULT 'draft'::text NOT NULL,
submitted_at timestamp with time zone,
review_note text,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT driver_profiles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text])))
);
CREATE TABLE public.otps (
id uuid DEFAULT gen_random_uuid() NOT NULL,
phone text NOT NULL,
code_hash text NOT NULL,
attempts integer DEFAULT 0 NOT NULL,
expires_at timestamp with time zone NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.pgmigrations (
id integer NOT NULL,
name character varying(255) NOT NULL,
run_on timestamp without time zone NOT NULL
);
CREATE SEQUENCE public.pgmigrations_id_seq
AS integer
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;
ALTER SEQUENCE public.pgmigrations_id_seq OWNED BY public.pgmigrations.id;
CREATE TABLE public.sessions (
id uuid DEFAULT gen_random_uuid() NOT NULL,
user_id uuid NOT NULL,
refresh_token_hash text NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
expires_at timestamp with time zone NOT NULL,
revoked_at timestamp with time zone
);
CREATE TABLE public.users (
id uuid DEFAULT gen_random_uuid() NOT NULL,
email text,
phone text,
name text DEFAULT ''::text NOT NULL,
role text NOT NULL,
password_hash text,
status text DEFAULT 'active'::text NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['rider'::text, 'driver'::text, 'operations'::text, 'manager'::text, 'support'::text, 'super_admin'::text]))),
CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'pending_verification'::text])))
);
CREATE TABLE public.vehicles (
id uuid DEFAULT gen_random_uuid() NOT NULL,
owner_user_id uuid NOT NULL,
plate text NOT NULL,
model text DEFAULT ''::text NOT NULL,
colour text DEFAULT ''::text NOT NULL,
fleet_label text,
status text DEFAULT 'draft'::text NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT vehicles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'suspended'::text, 'retired'::text])))
);
ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);
ALTER TABLE ONLY public.audit_log
ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.driver_profiles
ADD CONSTRAINT driver_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.driver_profiles
ADD CONSTRAINT driver_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.otps
ADD CONSTRAINT otps_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pgmigrations
ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sessions
ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
ADD CONSTRAINT users_phone_key UNIQUE (phone);
ALTER TABLE ONLY public.users
ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vehicles
ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vehicles
ADD CONSTRAINT vehicles_plate_key UNIQUE (plate);
CREATE INDEX audit_created_idx ON public.audit_log USING btree (created_at DESC);
CREATE INDEX otps_phone_idx ON public.otps USING btree (phone);
CREATE INDEX sessions_user_idx ON public.sessions USING btree (user_id);
ALTER TABLE ONLY public.audit_log
ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.driver_profiles
ADD CONSTRAINT driver_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sessions
ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.vehicles
ADD CONSTRAINT vehicles_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
