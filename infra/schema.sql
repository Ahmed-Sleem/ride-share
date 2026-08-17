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
ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);
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
CREATE INDEX otps_phone_idx ON public.otps USING btree (phone);
CREATE INDEX sessions_user_idx ON public.sessions USING btree (user_id);
ALTER TABLE ONLY public.sessions
ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
