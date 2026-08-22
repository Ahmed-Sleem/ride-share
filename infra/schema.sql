CREATE FUNCTION public.bookings_seat_guard() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
cap integer;
total integer;
BEGIN
SELECT seats_total INTO cap FROM journeys WHERE id = NEW.journey_id;
SELECT COALESCE(SUM(seats), 0) INTO total
FROM bookings
WHERE journey_id = NEW.journey_id AND status <> 'CANCELLED' AND id <> NEW.id;
IF total + NEW.seats > cap THEN
RAISE EXCEPTION 'journey has no seats left' USING ERRCODE = '23514';
END IF;
RETURN NEW;
END;
$$;
CREATE FUNCTION public.route_stops_require_verified() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM stops WHERE id = NEW.stop_id AND status = 'verified') THEN
RAISE EXCEPTION 'route_stops.stop_id must reference a verified stop';
END IF;
RETURN NEW;
END;
$$;
CREATE FUNCTION public.stop_verifications_append_only() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
RAISE EXCEPTION 'stop_verifications is append-only';
END;
$$;
CREATE FUNCTION public.stops_retire_guard() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
route_names text;
BEGIN
IF NEW.status = 'retired' AND OLD.status <> 'retired' THEN
SELECT string_agg(r.name_en, ', ') INTO route_names
FROM route_stops rs JOIN routes r ON r.id = rs.route_id
WHERE rs.stop_id = NEW.id AND r.status = 'published';
IF route_names IS NOT NULL THEN
RAISE EXCEPTION 'stop used by published route(s): %', route_names USING ERRCODE = '23514';
END IF;
END IF;
RETURN NEW;
END;
$$;
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
CREATE TABLE public.bookings (
id uuid DEFAULT gen_random_uuid() NOT NULL,
journey_id uuid NOT NULL,
rider_user_id uuid NOT NULL,
boarding_stop_id uuid NOT NULL,
seats integer NOT NULL,
fare_minor integer NOT NULL,
code text NOT NULL,
status text DEFAULT 'RESERVED'::text NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT bookings_fare_minor_check CHECK ((fare_minor >= 0)),
CONSTRAINT bookings_seats_check CHECK (((seats >= 1) AND (seats <= 4))),
CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['RESERVED'::text, 'CONFIRMED'::text, 'ON_BOARD'::text, 'COMPLETED'::text, 'CANCELLED'::text, 'NO_SHOW'::text])))
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
CREATE TABLE public.journeys (
id uuid DEFAULT gen_random_uuid() NOT NULL,
route_id uuid NOT NULL,
slot_id uuid NOT NULL,
driver_user_id uuid NOT NULL,
vehicle_id uuid,
status text DEFAULT 'CLAIMED'::text NOT NULL,
committed boolean DEFAULT true NOT NULL,
seats_total integer DEFAULT 14 NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT journeys_seats_total_check CHECK (((seats_total >= 1) AND (seats_total <= 60))),
CONSTRAINT journeys_status_check CHECK ((status = ANY (ARRAY['CLAIMED'::text, 'OPEN_FOR_BOOKING'::text, 'LOCKED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text, 'ABORTED'::text])))
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
CREATE TABLE public.route_stops (
id uuid DEFAULT gen_random_uuid() NOT NULL,
route_id uuid NOT NULL,
stop_id uuid NOT NULL,
"position" integer NOT NULL,
distance_from_start_m double precision DEFAULT 0 NOT NULL,
run_minutes integer DEFAULT 0 NOT NULL,
CONSTRAINT route_stops_position_check CHECK (("position" >= 1))
);
CREATE TABLE public.routes (
id uuid DEFAULT gen_random_uuid() NOT NULL,
code text NOT NULL,
name_en text DEFAULT ''::text NOT NULL,
name_ar text DEFAULT ''::text NOT NULL,
status text DEFAULT 'draft'::text NOT NULL,
direction text DEFAULT 'outbound'::text NOT NULL,
fare_minor integer NOT NULL,
window_start time without time zone DEFAULT '06:00:00'::time without time zone NOT NULL,
window_end time without time zone DEFAULT '22:00:00'::time without time zone NOT NULL,
slot_interval_min integer DEFAULT 15 NOT NULL,
created_by uuid,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT routes_direction_check CHECK ((direction = ANY (ARRAY['outbound'::text, 'inbound'::text]))),
CONSTRAINT routes_fare_minor_check CHECK ((fare_minor >= 0)),
CONSTRAINT routes_slot_interval_min_check CHECK (((slot_interval_min >= 5) AND (slot_interval_min <= 120))),
CONSTRAINT routes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'retired'::text])))
);
CREATE TABLE public.sessions (
id uuid DEFAULT gen_random_uuid() NOT NULL,
user_id uuid NOT NULL,
refresh_token_hash text NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
expires_at timestamp with time zone NOT NULL,
revoked_at timestamp with time zone
);
CREATE TABLE public.slots (
id uuid DEFAULT gen_random_uuid() NOT NULL,
route_id uuid NOT NULL,
service_date date NOT NULL,
departs_at time without time zone NOT NULL,
required_vehicles integer DEFAULT 1 NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT slots_required_vehicles_check CHECK (((required_vehicles >= 1) AND (required_vehicles <= 10)))
);
CREATE TABLE public.stop_photos (
id uuid DEFAULT gen_random_uuid() NOT NULL,
stop_id uuid NOT NULL,
storage_key text NOT NULL,
taken_at timestamp with time zone,
created_at timestamp with time zone DEFAULT now() NOT NULL,
mime_type text DEFAULT 'image/jpeg'::text NOT NULL
);
CREATE TABLE public.stop_verifications (
id uuid DEFAULT gen_random_uuid() NOT NULL,
stop_id uuid NOT NULL,
verifier_id uuid NOT NULL,
decision text NOT NULL,
reason text,
device text,
gps_accuracy_m double precision,
created_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT stop_verifications_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text])))
);
CREATE TABLE public.stops (
id uuid DEFAULT gen_random_uuid() NOT NULL,
code text NOT NULL,
name_en text DEFAULT ''::text NOT NULL,
name_ar text DEFAULT ''::text NOT NULL,
lat double precision NOT NULL,
lng double precision NOT NULL,
status text DEFAULT 'draft'::text NOT NULL,
source text DEFAULT 'desk'::text NOT NULL,
created_by uuid,
stand_ok boolean,
lit_ok boolean,
legal_stop_ok boolean,
reachable_ok boolean,
walking_to_next_m double precision,
override_reason text,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,
capture_id text,
gps_accuracy_m double precision,
CONSTRAINT stops_lat_bounds CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
CONSTRAINT stops_lng_bounds CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))),
CONSTRAINT stops_source_check CHECK ((source = ANY (ARRAY['desk'::text, 'field'::text]))),
CONSTRAINT stops_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'verified'::text, 'rejected'::text, 'retired'::text])))
);
CREATE TABLE public.throttle_records (
key text NOT NULL,
hits jsonb DEFAULT '{}'::jsonb NOT NULL,
expires_at timestamp with time zone NOT NULL,
blocked_until timestamp with time zone
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
email_verified_at timestamp with time zone,
is_system_admin boolean DEFAULT false NOT NULL,
deleted_at timestamp with time zone,
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
CREATE TABLE public.verification_codes (
id uuid DEFAULT gen_random_uuid() NOT NULL,
kind text NOT NULL,
channel text NOT NULL,
target text NOT NULL,
code_hash text NOT NULL,
attempts integer DEFAULT 0 NOT NULL,
last_sent_at timestamp with time zone DEFAULT now() NOT NULL,
last_attempt_at timestamp with time zone,
expires_at timestamp with time zone NOT NULL,
consumed_at timestamp with time zone,
created_at timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT verification_codes_channel_check CHECK ((channel = ANY (ARRAY['sms'::text, 'email'::text]))),
CONSTRAINT verification_codes_kind_check CHECK ((kind = ANY (ARRAY['email_login'::text, 'email_verify'::text, 'password_reset'::text])))
);
ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);
ALTER TABLE ONLY public.audit_log
ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bookings
ADD CONSTRAINT bookings_code_key UNIQUE (code);
ALTER TABLE ONLY public.bookings
ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.driver_profiles
ADD CONSTRAINT driver_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.driver_profiles
ADD CONSTRAINT driver_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.journeys
ADD CONSTRAINT journeys_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.journeys
ADD CONSTRAINT journeys_slot_id_key UNIQUE (slot_id);
ALTER TABLE ONLY public.pgmigrations
ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.route_stops
ADD CONSTRAINT route_stops_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.route_stops
ADD CONSTRAINT route_stops_route_position_key UNIQUE (route_id, "position");
ALTER TABLE ONLY public.route_stops
ADD CONSTRAINT route_stops_route_stop_key UNIQUE (route_id, stop_id);
ALTER TABLE ONLY public.routes
ADD CONSTRAINT routes_code_key UNIQUE (code);
ALTER TABLE ONLY public.routes
ADD CONSTRAINT routes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sessions
ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.slots
ADD CONSTRAINT slots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.slots
ADD CONSTRAINT slots_route_date_time_key UNIQUE (route_id, service_date, departs_at);
ALTER TABLE ONLY public.stop_photos
ADD CONSTRAINT stop_photos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stop_verifications
ADD CONSTRAINT stop_verifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stops
ADD CONSTRAINT stops_capture_id_key UNIQUE (capture_id);
ALTER TABLE ONLY public.stops
ADD CONSTRAINT stops_code_key UNIQUE (code);
ALTER TABLE ONLY public.stops
ADD CONSTRAINT stops_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.throttle_records
ADD CONSTRAINT throttle_records_pkey PRIMARY KEY (key);
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
ALTER TABLE ONLY public.verification_codes
ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);
CREATE INDEX audit_created_idx ON public.audit_log USING btree (created_at DESC);
CREATE INDEX bookings_journey_idx ON public.bookings USING btree (journey_id);
CREATE INDEX bookings_rider_idx ON public.bookings USING btree (rider_user_id, created_at DESC);
CREATE INDEX journeys_driver_idx ON public.journeys USING btree (driver_user_id, created_at DESC);
CREATE INDEX journeys_slot_idx ON public.journeys USING btree (slot_id);
CREATE INDEX route_stops_route_idx ON public.route_stops USING btree (route_id, "position");
CREATE INDEX sessions_user_idx ON public.sessions USING btree (user_id);
CREATE INDEX slots_route_date_idx ON public.slots USING btree (route_id, service_date);
CREATE INDEX stop_photos_stop_idx ON public.stop_photos USING btree (stop_id);
CREATE INDEX stop_verifications_stop_idx ON public.stop_verifications USING btree (stop_id);
CREATE INDEX stops_lat_lng_idx ON public.stops USING btree (lat, lng);
CREATE INDEX stops_status_idx ON public.stops USING btree (status) WHERE (status = 'verified'::text);
CREATE INDEX throttle_records_expires_idx ON public.throttle_records USING btree (expires_at);
CREATE INDEX verification_codes_target_idx ON public.verification_codes USING btree (kind, channel, target);
CREATE TRIGGER bookings_seat_guard BEFORE INSERT OR UPDATE OF seats ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.bookings_seat_guard();
CREATE TRIGGER route_stops_require_verified BEFORE INSERT OR UPDATE OF stop_id ON public.route_stops FOR EACH ROW EXECUTE FUNCTION public.route_stops_require_verified();
CREATE TRIGGER stop_verifications_no_update BEFORE DELETE OR UPDATE ON public.stop_verifications FOR EACH ROW EXECUTE FUNCTION public.stop_verifications_append_only();
CREATE TRIGGER stops_retire_guard BEFORE UPDATE OF status ON public.stops FOR EACH ROW EXECUTE FUNCTION public.stops_retire_guard();
ALTER TABLE ONLY public.audit_log
ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.bookings
ADD CONSTRAINT bookings_boarding_stop_id_fkey FOREIGN KEY (boarding_stop_id) REFERENCES public.stops(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.bookings
ADD CONSTRAINT bookings_journey_id_fkey FOREIGN KEY (journey_id) REFERENCES public.journeys(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.bookings
ADD CONSTRAINT bookings_rider_user_id_fkey FOREIGN KEY (rider_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.driver_profiles
ADD CONSTRAINT driver_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.journeys
ADD CONSTRAINT journeys_driver_user_id_fkey FOREIGN KEY (driver_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.journeys
ADD CONSTRAINT journeys_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.journeys
ADD CONSTRAINT journeys_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.journeys
ADD CONSTRAINT journeys_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.route_stops
ADD CONSTRAINT route_stops_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.route_stops
ADD CONSTRAINT route_stops_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.routes
ADD CONSTRAINT routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.sessions
ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.slots
ADD CONSTRAINT slots_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.stop_photos
ADD CONSTRAINT stop_photos_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.stop_verifications
ADD CONSTRAINT stop_verifications_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.stop_verifications
ADD CONSTRAINT stop_verifications_verifier_id_fkey FOREIGN KEY (verifier_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.stops
ADD CONSTRAINT stops_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.vehicles
ADD CONSTRAINT vehicles_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
