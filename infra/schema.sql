CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
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
ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);
ALTER TABLE ONLY public.pgmigrations
ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);
