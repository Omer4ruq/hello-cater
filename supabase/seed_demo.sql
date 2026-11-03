-- =====================================================================
-- Evently BD — DEMO seed
--
-- ⚠️  LOCAL AND STAGING ONLY. NEVER RUN THIS IN PRODUCTION.
--
-- Creates demo accounts with a shared, well-known password so the whole
-- workflow can be exercised end to end. Every account here is obviously
-- fake (@demo.eventlybd.test) and the password is documented publicly in
-- docs/LOCAL-DEVELOPMENT.md — which is exactly why it must never exist
-- in a production database.
--
-- The production guard below refuses to run if the `app.environment`
-- setting says production.
--
-- Run:  psql -d <db> -f supabase/seed_demo.sql
-- =====================================================================

do $$
begin
  if coalesce(current_setting('app.environment', true), 'local') = 'production' then
    raise exception 'seed_demo.sql must never run in production';
  end if;
end $$;

begin;

-- ---------------------------------------------------------------------
-- Demo password for every account below: DemoPassword2026!
-- ---------------------------------------------------------------------
create temporary table demo_people (
  id uuid, email text, full_name text, phone text
) on commit drop;

insert into demo_people (id, email, full_name, phone) values
  ('11111111-0000-4000-8000-000000000001','super@demo.eventlybd.test','Ayesha Rahman','+8801711000001'),
  ('11111111-0000-4000-8000-000000000002','ops@demo.eventlybd.test','Tanvir Hasan','+8801711000002'),
  ('11111111-0000-4000-8000-000000000003','finance@demo.eventlybd.test','Shirin Akter','+8801711000003'),
  ('11111111-0000-4000-8000-000000000004','support@demo.eventlybd.test','Nabil Karim','+8801711000004'),
  ('22222222-0000-4000-8000-000000000001','company.admin@demo.eventlybd.test','Nusrat Jahan','+8801712000001'),
  ('22222222-0000-4000-8000-000000000002','company.staff@demo.eventlybd.test','Rafiq Islam','+8801712000002'),
  ('22222222-0000-4000-8000-000000000003','customer@demo.eventlybd.test','Farhana Chowdhury','+8801712000003'),
  ('33333333-0000-4000-8000-000000000001','caterer@demo.eventlybd.test','Kamal Uddin','+8801713000001'),
  ('33333333-0000-4000-8000-000000000002','decorator@demo.eventlybd.test','Shampa Das','+8801713000002'),
  ('33333333-0000-4000-8000-000000000003','photographer@demo.eventlybd.test','Imran Sheikh','+8801713000003'),
  ('33333333-0000-4000-8000-000000000004','planner@demo.eventlybd.test','Sadia Noor','+8801713000004'),
  ('33333333-0000-4000-8000-000000000005','sound@demo.eventlybd.test','Jubayer Alam','+8801713000005');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  p.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  p.email, crypt('DemoPassword2026!', gen_salt('bf')), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', p.full_name, 'phone', p.phone),
  now(), now()
from demo_people p
on conflict (id) do nothing;

-- The auth trigger creates profiles; make sure phone/name are populated
-- even if the trigger is absent (plain PostgreSQL shim).
insert into profiles (id, full_name, email, phone)
select p.id, p.full_name, p.email, p.phone from demo_people p
on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone;

-- ---------------------------------------------------------------------
-- Platform staff
-- ---------------------------------------------------------------------
insert into platform_staff (profile_id, role) values
  ('11111111-0000-4000-8000-000000000001','super_admin'),
  ('11111111-0000-4000-8000-000000000002','ops_admin'),
  ('11111111-0000-4000-8000-000000000003','finance_admin'),
  ('11111111-0000-4000-8000-000000000004','support_admin')
on conflict (profile_id) do update set role = excluded.role;

-- ---------------------------------------------------------------------
-- Customer companies
-- ---------------------------------------------------------------------
insert into organizations (id, kind, name, slug, legal_name, email, phone, address_line, area, city, tin, created_by) values
  ('44444444-0000-4000-8000-000000000001','customer','ABC Technologies Ltd.','abc-technologies','ABC Technologies Limited','accounts@abctech.test','+8801712000001','Road 11, Block C','Banani','Dhaka','123456789012','22222222-0000-4000-8000-000000000001'),
  ('44444444-0000-4000-8000-000000000002','customer','Delta Pharma PLC','delta-pharma','Delta Pharmaceuticals PLC','finance@deltapharma.test','+8801712000010','Bir Uttam Rafiqul Islam Ave','Mohakhali','Dhaka','223456789012','22222222-0000-4000-8000-000000000001'),
  ('44444444-0000-4000-8000-000000000003','customer','Meghna Garments','meghna-garments','Meghna Garments Ltd.','hr@meghna.test','+8801712000011','Tejgaon I/A','Tejgaon','Dhaka','323456789012','22222222-0000-4000-8000-000000000001'),
  ('44444444-0000-4000-8000-000000000004','customer','Prime Bank Training Centre','prime-bank-training','Prime Bank PLC','training@primebank.test','+8801712000012','Motijheel C/A','Motijheel','Dhaka','423456789012','22222222-0000-4000-8000-000000000001'),
  ('44444444-0000-4000-8000-000000000005','customer','BRIDGE Foundation','bridge-foundation','BRIDGE Development Foundation','admin@bridge.test','+8801712000013','Road 27','Dhanmondi','Dhaka','523456789012','22222222-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into organization_members (organization_id, profile_id, role, status, title, department, joined_at) values
  ('44444444-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','owner','active','Head of Administration','Admin', now()),
  ('44444444-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002','staff','active','Office Manager','Admin', now())
on conflict (organization_id, profile_id) do nothing;

-- A spending limit on the staff member, to exercise corporate rules.
update organization_members
   set spend_limit_minor = 5000000, requires_approval = true
 where organization_id = '44444444-0000-4000-8000-000000000001'
   and profile_id = '22222222-0000-4000-8000-000000000002';

-- ---------------------------------------------------------------------
-- Partner organisations and profiles
-- ---------------------------------------------------------------------
insert into organizations (id, kind, name, slug, legal_name, email, phone, address_line, area, city, trade_license, created_by) values
  ('55555555-0000-4000-8000-000000000001','partner','Bengal Feast Catering','bengal-feast','Bengal Feast Catering','hello@bengalfeast.test','+8801713000001','Road 7, Block D','Banani','Dhaka','TRAD/DHK/2019/11234','33333333-0000-4000-8000-000000000001'),
  ('55555555-0000-4000-8000-000000000002','partner','Kacchi Bari Events','kacchi-bari-events','Kacchi Bari Events Ltd.','info@kacchibari.test','+8801713000011','Mirpur 10','Mirpur','Dhaka','TRAD/DHK/2017/44821','33333333-0000-4000-8000-000000000001'),
  ('55555555-0000-4000-8000-000000000003','partner','Zaika Corporate Kitchen','zaika-kitchen','Zaika Corporate Kitchen','orders@zaika.test','+8801713000012','Gulshan 2','Gulshan','Dhaka','TRAD/DHK/2021/77120','33333333-0000-4000-8000-000000000001'),
  ('55555555-0000-4000-8000-000000000004','partner','Orchid Decor Studio','orchid-decor','Orchid Decor Studio','studio@orchiddecor.test','+8801713000002','Uttara Sector 7','Uttara','Dhaka','TRAD/DHK/2018/23310','33333333-0000-4000-8000-000000000002'),
  ('55555555-0000-4000-8000-000000000005','partner','Shobuj Mandap Decoration','shobuj-mandap','Shobuj Mandap','contact@shobujmandap.test','+8801713000021','Bashundhara R/A','Bashundhara','Dhaka','TRAD/DHK/2020/55901','33333333-0000-4000-8000-000000000002'),
  ('55555555-0000-4000-8000-000000000006','partner','Lens & Light Studio','lens-and-light','Lens & Light Studio','book@lensandlight.test','+8801713000003','Dhanmondi 27','Dhanmondi','Dhaka','TRAD/DHK/2016/19087','33333333-0000-4000-8000-000000000003'),
  ('55555555-0000-4000-8000-000000000007','partner','Frame Story Films','frame-story','Frame Story Films','hello@framestory.test','+8801713000031','Banasree Block B','Banasree','Dhaka','TRAD/DHK/2022/88231','33333333-0000-4000-8000-000000000003'),
  ('55555555-0000-4000-8000-000000000008','partner','Aurora Event Management','aurora-events','Aurora Event Management Ltd.','plan@auroraevents.test','+8801713000004','Baridhara DOHS','Baridhara','Dhaka','TRAD/DHK/2015/10456','33333333-0000-4000-8000-000000000004'),
  ('55555555-0000-4000-8000-000000000009','partner','Dhaka Stage Productions','dhaka-stage','Dhaka Stage Productions','info@dhakastage.test','+8801713000005','Tejgaon I/A','Tejgaon','Dhaka','TRAD/DHK/2019/66712','33333333-0000-4000-8000-000000000005'),
  ('55555555-0000-4000-8000-000000000010','partner','Nagar Sound & Lighting','nagar-sound','Nagar Sound & Lighting','crew@nagarsound.test','+8801713000051','Mohammadpur','Mohammadpur','Dhaka','TRAD/DHK/2021/34567','33333333-0000-4000-8000-000000000005')
on conflict (id) do nothing;

insert into organization_members (organization_id, profile_id, role, status, joined_at)
select o.id, o.created_by, 'owner', 'active', now()
from organizations o where o.kind = 'partner' and o.created_by is not null
on conflict (organization_id, profile_id) do nothing;

insert into partner_profiles (
  id, organization_id, slug, display_name, tagline, about, business_type, year_established,
  cover_image_url, verification_status, verified_at, min_order_minor, min_guests, max_guests,
  lead_time_hours, daily_event_capacity, rating_avg, rating_count, completed_bookings,
  response_rate_bps, avg_response_minutes, payment_terms, cancellation_policy,
  is_featured, is_accepting_orders, published_at
) values
  ('66666666-0000-4000-8000-000000000001','55555555-0000-4000-8000-000000000001','bengal-feast','Bengal Feast Catering','Bangladeshi and fusion catering for 50–1500 guests','Family-run kitchen operating since 2019, specialising in kacchi, Bengali fish courses and corporate buffet service. Our own crockery, service staff and chafing equipment.','private_limited',2019,'/img/photos/buffet.jpg','approved', now() - interval '200 days', 5000000, 50, 1500, 48, 3, 4.70, 24, 61, 9400, 42,'50% advance on confirmation, balance on the event day.','Free cancellation up to 7 days before; 50% within 3 days.', true, true, now() - interval '195 days'),
  ('66666666-0000-4000-8000-000000000002','55555555-0000-4000-8000-000000000002','kacchi-bari-events','Kacchi Bari Events','Kacchi, tehari and morog polao at wedding scale','Kacchi specialists since 2017. We cook on site with our own degs and serve up to 2000 guests for weddings and community programmes.','partnership',2017,'/img/photos/buffet.jpg','approved', now() - interval '150 days', 8000000, 100, 2000, 72, 2, 4.50, 18, 44, 8800, 65,'40% advance, balance on the day.','Free cancellation up to 14 days before.', false, true, now() - interval '148 days'),
  ('66666666-0000-4000-8000-000000000003','55555555-0000-4000-8000-000000000003','zaika-kitchen','Zaika Corporate Kitchen','Office lunch, packed meals and conference catering','Purpose-built central kitchen serving corporate clients in Gulshan, Banani and Tejgaon. Daily lunch contracts and one-off conference catering.','private_limited',2021,'/img/photos/conference.jpg','approved', now() - interval '120 days', 2000000, 20, 600, 24, 5, 4.80, 31, 128, 9700, 22,'Monthly invoicing for recurring contracts.','48 hours notice for recurring orders.', true, true, now() - interval '118 days'),
  ('66666666-0000-4000-8000-000000000004','55555555-0000-4000-8000-000000000004','orchid-decor','Orchid Decor Studio','Stage, floral and entrance decoration','Wedding and corporate decoration studio. Fresh flower installations, custom stage builds and full venue transformation.','sole_proprietor',2018,'/img/photos/banquet.jpg','approved', now() - interval '180 days', 4000000, null, null, 96, 2, 4.60, 15, 37, 9100, 55,'60% advance for custom builds.','50% refund up to 10 days before.', false, true, now() - interval '176 days'),
  ('66666666-0000-4000-8000-000000000005','55555555-0000-4000-8000-000000000005','shobuj-mandap','Shobuj Mandap Decoration','Traditional holud and gaye holud staging','Specialists in holud and mehendi decoration with traditional Bengali motifs, handcrafted props and floral work.','sole_proprietor',2020,'/img/photos/banquet.jpg','approved', now() - interval '90 days', 2500000, null, null, 72, 2, 4.40, 9, 21, 8500, 80,'50% advance.','Free cancellation up to 7 days before.', false, true, now() - interval '88 days'),
  ('66666666-0000-4000-8000-000000000006','55555555-0000-4000-8000-000000000006','lens-and-light','Lens & Light Studio','Wedding and corporate photography','Two-photographer teams, same-day highlight edits and full-resolution delivery within two weeks.','partnership',2016,'/img/photos/stage.jpg','approved', now() - interval '220 days', 3000000, null, null, 48, 3, 4.90, 42, 96, 9800, 18,'30% booking advance.','Free cancellation up to 14 days before.', true, true, now() - interval '215 days'),
  ('66666666-0000-4000-8000-000000000007','55555555-0000-4000-8000-000000000007','frame-story','Frame Story Films','Cinematography, highlight films and live streaming','Cinematic wedding films and corporate event documentation, including multi-camera live streaming.','private_limited',2022,'/img/photos/stage.jpg','approved', now() - interval '60 days', 4500000, null, null, 72, 2, 4.30, 7, 14, 8200, 95,'40% advance.','25% refund within 7 days.', false, true, now() - interval '58 days'),
  ('66666666-0000-4000-8000-000000000008','55555555-0000-4000-8000-000000000008','aurora-events','Aurora Event Management','Full-service event production and coordination','End-to-end event production for corporate programmes and large weddings. We handle vendor coordination, run sheets and on-site management.','private_limited',2015,'/img/photos/conference.jpg','approved', now() - interval '250 days', 15000000, 100, 3000, 168, 2, 4.80, 28, 73, 9600, 30,'Staged payments against milestones.','Strict policy — 30 days notice for full refund.', true, true, now() - interval '245 days'),
  ('66666666-0000-4000-8000-000000000009','55555555-0000-4000-8000-000000000009','dhaka-stage','Dhaka Stage Productions','Stage, truss, LED and structural build','Stage construction, trussing, LED walls and backdrop fabrication for conferences and concerts.','private_limited',2019,'/img/photos/panel.jpg','approved', now() - interval '140 days', 6000000, null, null, 120, 1, 4.50, 11, 26, 8900, 70,'50% advance for structural builds.','Free cancellation up to 14 days before.', false, true, now() - interval '138 days'),
  ('66666666-0000-4000-8000-000000000010','55555555-0000-4000-8000-000000000010','nagar-sound','Nagar Sound & Lighting','PA systems, stage lighting and technicians','Sound reinforcement and lighting for events from 50 to 5000 people, with our own engineers.','sole_proprietor',2021,'/img/photos/panel.jpg','pending', null, 2500000, null, null, 48, 2, 0, 0, 0, 0, null,'50% advance.','Free cancellation up to 5 days before.', false, true, null)
on conflict (id) do nothing;

commit;

-- =====================================================================
-- Partner coverage, catalogue and capability
-- =====================================================================
begin;

-- Categories each partner serves, with indicative per-person pricing.
insert into partner_categories (partner_id, category_id, is_primary, price_from_minor, price_to_minor)
select v.partner_id::uuid, c.id, v.is_primary, v.price_from, v.price_to
from (values
  ('66666666-0000-4000-8000-000000000001','wedding-catering', true,  65000, 130000),
  ('66666666-0000-4000-8000-000000000001','buffet',           false, 55000, 110000),
  ('66666666-0000-4000-8000-000000000001','biryani-kacchi',   false, 60000, 95000),
  ('66666666-0000-4000-8000-000000000001','corporate-lunch',  false, 35000, 70000),
  ('66666666-0000-4000-8000-000000000002','biryani-kacchi',   true,  55000, 90000),
  ('66666666-0000-4000-8000-000000000002','wedding-catering', false, 60000, 120000),
  ('66666666-0000-4000-8000-000000000003','corporate-lunch',  true,  28000, 65000),
  ('66666666-0000-4000-8000-000000000003','packed-meals',     false, 22000, 45000),
  ('66666666-0000-4000-8000-000000000003','conference-catering', false, 40000, 90000),
  ('66666666-0000-4000-8000-000000000003','iftar-catering',   false, 35000, 75000),
  ('66666666-0000-4000-8000-000000000004','decorator',        true,  null, null),
  ('66666666-0000-4000-8000-000000000005','decorator',        true,  null, null),
  ('66666666-0000-4000-8000-000000000006','photographer',     true,  null, null),
  ('66666666-0000-4000-8000-000000000007','videographer',     true,  null, null),
  ('66666666-0000-4000-8000-000000000007','photographer',     false, null, null),
  ('66666666-0000-4000-8000-000000000008','wedding-planning', true,  null, null),
  ('66666666-0000-4000-8000-000000000008','corporate-event-management', false, null, null),
  ('66666666-0000-4000-8000-000000000009','stage',            true,  null, null),
  ('66666666-0000-4000-8000-000000000009','led-screen',       false, null, null),
  ('66666666-0000-4000-8000-000000000010','sound-system',     true,  null, null),
  ('66666666-0000-4000-8000-000000000010','lighting',         false, null, null)
) as v(partner_id, slug, is_primary, price_from, price_to)
join service_categories c on c.slug = v.slug
on conflict (partner_id, category_id) do nothing;

-- Service areas. A row with area_id NULL means the whole city.
insert into partner_service_areas (partner_id, city_id, area_id, delivery_fee_minor)
select v.partner_id::uuid, city.id, area.id, v.fee
from (values
  ('66666666-0000-4000-8000-000000000001','gulshan',     300000),
  ('66666666-0000-4000-8000-000000000001','banani',      300000),
  ('66666666-0000-4000-8000-000000000001','baridhara',   350000),
  ('66666666-0000-4000-8000-000000000001','uttara',      500000),
  ('66666666-0000-4000-8000-000000000001','dhanmondi',   400000),
  ('66666666-0000-4000-8000-000000000002','mirpur',      250000),
  ('66666666-0000-4000-8000-000000000002','uttara',      400000),
  ('66666666-0000-4000-8000-000000000002','mohammadpur', 300000),
  ('66666666-0000-4000-8000-000000000003','gulshan',     200000),
  ('66666666-0000-4000-8000-000000000003','banani',      200000),
  ('66666666-0000-4000-8000-000000000003','tejgaon',     150000),
  ('66666666-0000-4000-8000-000000000003','mohakhali',   200000),
  ('66666666-0000-4000-8000-000000000003','motijheel',   350000),
  ('66666666-0000-4000-8000-000000000004','gulshan',     0),
  ('66666666-0000-4000-8000-000000000004','banani',      0),
  ('66666666-0000-4000-8000-000000000004','uttara',      0),
  ('66666666-0000-4000-8000-000000000005','bashundhara', 0),
  ('66666666-0000-4000-8000-000000000005','badda',       0),
  ('66666666-0000-4000-8000-000000000009','tejgaon',     0),
  ('66666666-0000-4000-8000-000000000010','mohammadpur', 0)
) as v(partner_id, area_slug, fee)
join areas area on area.slug = v.area_slug
join cities city on city.id = area.city_id
on conflict do nothing;

-- Photographers, videographers and planners cover the whole city.
insert into partner_service_areas (partner_id, city_id, area_id, delivery_fee_minor)
select p.id, c.id, null, 0
from partner_profiles p
cross join (select id from cities where slug = 'dhaka') c
where p.slug in ('lens-and-light', 'frame-story', 'aurora-events')
on conflict do nothing;

insert into partner_cuisines (partner_id, cuisine_id)
select v.partner_id::uuid, cu.id
from (values
  ('66666666-0000-4000-8000-000000000001','bangladeshi'),
  ('66666666-0000-4000-8000-000000000001','biryani-kacchi'),
  ('66666666-0000-4000-8000-000000000001','continental'),
  ('66666666-0000-4000-8000-000000000001','chinese'),
  ('66666666-0000-4000-8000-000000000002','biryani-kacchi'),
  ('66666666-0000-4000-8000-000000000002','bangladeshi'),
  ('66666666-0000-4000-8000-000000000003','continental'),
  ('66666666-0000-4000-8000-000000000003','chinese'),
  ('66666666-0000-4000-8000-000000000003','bangladeshi'),
  ('66666666-0000-4000-8000-000000000003','indian')
) as v(partner_id, slug)
join cuisines cu on cu.slug = v.slug
on conflict do nothing;

insert into partner_event_types (partner_id, event_type_id)
select v.partner_id::uuid, e.id
from (values
  ('66666666-0000-4000-8000-000000000001','wedding'),
  ('66666666-0000-4000-8000-000000000001','reception'),
  ('66666666-0000-4000-8000-000000000001','holud'),
  ('66666666-0000-4000-8000-000000000001','corporate-lunch'),
  ('66666666-0000-4000-8000-000000000002','wedding'),
  ('66666666-0000-4000-8000-000000000002','reception'),
  ('66666666-0000-4000-8000-000000000002','walima'),
  ('66666666-0000-4000-8000-000000000003','corporate-lunch'),
  ('66666666-0000-4000-8000-000000000003','conference'),
  ('66666666-0000-4000-8000-000000000003','training'),
  ('66666666-0000-4000-8000-000000000003','corporate-iftar'),
  ('66666666-0000-4000-8000-000000000004','wedding'),
  ('66666666-0000-4000-8000-000000000004','reception'),
  ('66666666-0000-4000-8000-000000000005','holud'),
  ('66666666-0000-4000-8000-000000000005','mehendi'),
  ('66666666-0000-4000-8000-000000000006','wedding'),
  ('66666666-0000-4000-8000-000000000006','corporate-lunch'),
  ('66666666-0000-4000-8000-000000000007','wedding'),
  ('66666666-0000-4000-8000-000000000008','conference'),
  ('66666666-0000-4000-8000-000000000008','wedding'),
  ('66666666-0000-4000-8000-000000000009','conference'),
  ('66666666-0000-4000-8000-000000000010','conference')
) as v(partner_id, slug)
join event_types e on e.slug = v.slug
on conflict do nothing;

-- Operating hours (Saturday to Thursday; Friday closed).
insert into partner_operating_hours (partner_id, day_of_week, opens_at, closes_at, is_closed)
select p.id, d.dow,
       case when d.dow = 5 then null else time '09:00' end,
       case when d.dow = 5 then null else time '21:00' end,
       d.dow = 5
from partner_profiles p
cross join generate_series(0, 6) as d(dow)
on conflict (partner_id, day_of_week) do nothing;

-- Packages
insert into partner_packages (
  id, partner_id, category_id, slug, name, description, hero_image_url,
  base_price_minor, per_person_price_minor, min_guests, max_guests, is_featured, sort_order
)
select v.id::uuid, v.partner_id::uuid, c.id, v.slug, v.name, v.descr, v.art,
       v.base, v.per_person, v.min_g, v.max_g, v.featured, v.sort
from (values
  ('77777777-0000-4000-8000-000000000001','66666666-0000-4000-8000-000000000001','wedding-catering','premium-wedding-catering','Premium Wedding Catering','Kacchi biryani, roast, borhani, salad and dessert with full service staff, crockery and chafing setup.','/img/photos/banquet.jpg', 0, 95000, 200, 1200, true, 10),
  ('77777777-0000-4000-8000-000000000002','66666666-0000-4000-8000-000000000001','buffet','signature-buffet','Signature Buffet','Eight-item buffet across Bangladeshi and continental, with live pasta counter and dessert table.','/img/photos/buffet.jpg', 0, 78000, 100, 800, false, 20),
  ('77777777-0000-4000-8000-000000000003','66666666-0000-4000-8000-000000000003','corporate-lunch','corporate-lunch-package','Corporate Lunch Package','Rice, two curries, vegetable, salad, dessert and a soft drink. Delivered hot in chafing dishes with a server.','/img/photos/conference.jpg', 0, 42000, 20, 400, true, 10),
  ('77777777-0000-4000-8000-000000000004','66666666-0000-4000-8000-000000000003','packed-meals','packed-lunch-boxes','Packed Lunch Boxes','Individually sealed boxes with rice, protein, vegetable and dessert. Ideal for training days and field teams.','/img/photos/buffet.jpg', 0, 26000, 25, 600, false, 20),
  ('77777777-0000-4000-8000-000000000005','66666666-0000-4000-8000-000000000003','conference-catering','conference-full-service','Conference Full Service','Morning tea, mid-morning snack, buffet lunch and afternoon tea, with service staff for the full day.','/img/photos/conference.jpg', 0, 88000, 50, 500, true, 30),
  ('77777777-0000-4000-8000-000000000006','66666666-0000-4000-8000-000000000002','biryani-kacchi','kacchi-feast','Kacchi Feast','Traditional mutton kacchi with jali kabab, borhani, salad and firni, cooked on site.','/img/photos/buffet.jpg', 0, 72000, 150, 2000, true, 10),
  ('77777777-0000-4000-8000-000000000007','66666666-0000-4000-8000-000000000005','decorator','holud-package','Holud Stage Package','Traditional holud stage with marigold work, handcrafted props, seating for the couple and entrance decor.','/img/photos/banquet.jpg', 8500000, 0, null, null, true, 10),
  ('77777777-0000-4000-8000-000000000008','66666666-0000-4000-8000-000000000006','photographer','wedding-photography-day','Full Day Wedding Photography','Two photographers for ten hours, 400+ edited images, online gallery and a same-day highlight set.','/img/photos/stage.jpg', 6500000, 0, null, null, true, 10)
) as v(id, partner_id, cat_slug, slug, name, descr, art, base, per_person, min_g, max_g, featured, sort)
join service_categories c on c.slug = v.cat_slug
on conflict (id) do nothing;

insert into package_items (package_id, label, detail, is_optional, sort_order)
values
  ('77777777-0000-4000-8000-000000000001','Mutton kacchi biryani','Basmati, slow-cooked mutton, alu bukhara', false, 10),
  ('77777777-0000-4000-8000-000000000001','Chicken roast','Whole leg quarter', false, 20),
  ('77777777-0000-4000-8000-000000000001','Borhani & soft drinks', null, false, 30),
  ('77777777-0000-4000-8000-000000000001','Salad and pickle', null, false, 40),
  ('77777777-0000-4000-8000-000000000001','Firni or jorda', null, false, 50),
  ('77777777-0000-4000-8000-000000000001','Service staff, crockery and chafing', null, false, 60),
  ('77777777-0000-4000-8000-000000000001','Live dessert counter', 'Adds a chef and station', true, 70),
  ('77777777-0000-4000-8000-000000000003','Steamed rice or pulao', null, false, 10),
  ('77777777-0000-4000-8000-000000000003','Chicken curry', null, false, 20),
  ('77777777-0000-4000-8000-000000000003','Fish or beef curry', null, false, 30),
  ('77777777-0000-4000-8000-000000000003','Seasonal vegetable and dal', null, false, 40),
  ('77777777-0000-4000-8000-000000000003','Salad, dessert and soft drink', null, false, 50),
  ('77777777-0000-4000-8000-000000000003','Delivery, chafing and one server', null, false, 60),
  ('77777777-0000-4000-8000-000000000005','Morning tea and biscuits', null, false, 10),
  ('77777777-0000-4000-8000-000000000005','Mid-morning savoury snack', null, false, 20),
  ('77777777-0000-4000-8000-000000000005','Buffet lunch, six items', null, false, 30),
  ('77777777-0000-4000-8000-000000000005','Afternoon tea and dessert', null, false, 40),
  ('77777777-0000-4000-8000-000000000005','Full-day service staff', null, false, 50),
  ('77777777-0000-4000-8000-000000000007','Marigold and fresh flower stage', null, false, 10),
  ('77777777-0000-4000-8000-000000000007','Couple seating with backdrop', null, false, 20),
  ('77777777-0000-4000-8000-000000000007','Entrance and pathway decor', null, false, 30),
  ('77777777-0000-4000-8000-000000000007','Handcrafted traditional props', null, false, 40),
  ('77777777-0000-4000-8000-000000000008','Two photographers, ten hours', null, false, 10),
  ('77777777-0000-4000-8000-000000000008','400+ professionally edited images', null, false, 20),
  ('77777777-0000-4000-8000-000000000008','Private online gallery', null, false, 30),
  ('77777777-0000-4000-8000-000000000008','Same-day highlight set', null, false, 40),
  ('77777777-0000-4000-8000-000000000008','Printed album', '30 pages, hardcover', true, 50)
on conflict do nothing;

-- Menus
insert into menus (id, partner_id, name, description, cuisine_id, sort_order)
select v.id::uuid, v.partner_id::uuid, v.name, v.descr, cu.id, v.sort
from (values
  ('88888888-0000-4000-8000-000000000001','66666666-0000-4000-8000-000000000001','Wedding Signature Menu','Our most-booked wedding menu.','biryani-kacchi',10),
  ('88888888-0000-4000-8000-000000000002','66666666-0000-4000-8000-000000000001','Continental Buffet','For corporate and mixed-audience events.','continental',20),
  ('88888888-0000-4000-8000-000000000003','66666666-0000-4000-8000-000000000003','Daily Office Lunch','Rotating weekday menu for office contracts.','bangladeshi',10)
) as v(id, partner_id, name, descr, cuisine_slug, sort)
join cuisines cu on cu.slug = v.cuisine_slug
on conflict (id) do nothing;

insert into menu_items (menu_id, name, description, unit, price_minor, is_vegetarian, sort_order) values
  ('88888888-0000-4000-8000-000000000001','Mutton kacchi biryani','Slow-cooked mutton with basmati and alu bukhara','per_person',52000,false,10),
  ('88888888-0000-4000-8000-000000000001','Chicken roast','Whole leg quarter, Bengali style','per_person',18000,false,20),
  ('88888888-0000-4000-8000-000000000001','Jali kabab','Two pieces','per_person',9000,false,30),
  ('88888888-0000-4000-8000-000000000001','Borhani','Served chilled','per_person',6000,true,40),
  ('88888888-0000-4000-8000-000000000001','Salad and pickle',null,'per_person',3500,true,50),
  ('88888888-0000-4000-8000-000000000001','Firni','Traditional rice pudding','per_person',6500,true,60),
  ('88888888-0000-4000-8000-000000000002','Grilled chicken with herbs',null,'per_person',22000,false,10),
  ('88888888-0000-4000-8000-000000000002','Baked fish in lemon butter',null,'per_person',26000,false,20),
  ('88888888-0000-4000-8000-000000000002','Penne in tomato basil',null,'per_person',14000,true,30),
  ('88888888-0000-4000-8000-000000000002','Garden salad',null,'per_person',7000,true,40),
  ('88888888-0000-4000-8000-000000000002','Chocolate mousse',null,'per_person',9000,true,50),
  ('88888888-0000-4000-8000-000000000003','Steamed rice',null,'per_person',6000,true,10),
  ('88888888-0000-4000-8000-000000000003','Chicken curry',null,'per_person',16000,false,20),
  ('88888888-0000-4000-8000-000000000003','Rui fish curry',null,'per_person',17000,false,30),
  ('88888888-0000-4000-8000-000000000003','Mixed vegetable',null,'per_person',6500,true,40),
  ('88888888-0000-4000-8000-000000000003','Dal',null,'per_person',4000,true,50),
  ('88888888-0000-4000-8000-000000000003','Seasonal dessert',null,'per_person',6000,true,60)
on conflict do nothing;

insert into partner_portfolio (partner_id, title, caption, image_url, guest_count, taken_on, sort_order) values
  ('66666666-0000-4000-8000-000000000001','Reception at a Gulshan banquet','800 guests, full kacchi service','/img/photos/banquet.jpg',800, current_date - 120, 10),
  ('66666666-0000-4000-8000-000000000001','Corporate annual dinner','350 guests, continental buffet','/img/photos/conference.jpg',350, current_date - 60, 20),
  ('66666666-0000-4000-8000-000000000004','Wedding stage, Uttara','Fresh flower installation','/img/photos/banquet.jpg',null, current_date - 90, 10),
  ('66666666-0000-4000-8000-000000000006','Holud photography','Two-photographer coverage','/img/photos/stage.jpg',null, current_date - 45, 10)
on conflict do nothing;

-- Payout destinations (demo values only).
insert into partner_payout_accounts (partner_id, method, account_name, account_number, bank_name, branch_name, is_default, is_verified)
select id, 'bank_transfer',
       display_name,
       '00' || lpad((row_number() over (order by slug))::text, 11, '0'),
       'Demo Bank PLC', 'Gulshan Branch', true, true
from partner_profiles
on conflict do nothing;

commit;

-- =====================================================================
-- A worked pipeline: request → invites → quotes → proposal → event →
-- bookings → payment → review. Exercises every workflow guard.
-- =====================================================================
begin;

-- ---- 1. A corporate request that is still being matched ---------------
insert into service_requests (
  id, reference, status, customer_profile_id, organization_id, event_type_id,
  title, event_date, start_time, guest_count, city_id, area_id, venue_name,
  budget_mode, budget_per_person_minor, dietary_notes, requirements,
  contact_name, contact_phone, contact_email, submitted_at
)
select
  '99999999-0000-4000-8000-000000000001', 'REQ-2026-90001', 'quotes_received',
  '22222222-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001',
  (select id from event_types where slug = 'conference'),
  'Annual dealer conference 2026',
  (current_date + 45), time '09:00', 320,
  (select id from cities where slug = 'dhaka'),
  (select id from areas where slug = 'gulshan'),
  'Hotel ballroom, Gulshan',
  'per_person', 85000,
  '40 vegetarian meals required. No beef.',
  'Full day conference: morning tea, snack, buffet lunch and afternoon tea. Need stage, LED screen and sound as well.',
  'Nusrat Jahan', '+8801712000001', 'company.admin@demo.eventlybd.test', now() - interval '3 days'
on conflict (id) do nothing;

insert into request_services (request_id, category_id, is_primary)
select '99999999-0000-4000-8000-000000000001', c.id, c.slug = 'conference-catering'
from service_categories c
where c.slug in ('conference-catering', 'stage', 'sound-system')
on conflict do nothing;

insert into request_cuisines (request_id, cuisine_id)
select '99999999-0000-4000-8000-000000000001', id from cuisines where slug in ('bangladeshi', 'continental')
on conflict do nothing;

-- ---- 2. Partner invitations -------------------------------------------
insert into request_partner_invites (id, request_id, partner_id, category_id, status, invited_by, invited_at, responded_at, respond_by)
select v.id::uuid, '99999999-0000-4000-8000-000000000001', v.partner_id::uuid, c.id, v.status::invite_status,
       '11111111-0000-4000-8000-000000000002', now() - interval '2 days',
       case when v.status = 'invited' then null else now() - interval '1 day' end,
       now() + interval '2 days'
from (values
  ('aaaaaaaa-0000-4000-8000-000000000001','66666666-0000-4000-8000-000000000003','conference-catering','accepted'),
  ('aaaaaaaa-0000-4000-8000-000000000002','66666666-0000-4000-8000-000000000001','conference-catering','accepted'),
  ('aaaaaaaa-0000-4000-8000-000000000003','66666666-0000-4000-8000-000000000009','stage','accepted'),
  ('aaaaaaaa-0000-4000-8000-000000000004','66666666-0000-4000-8000-000000000010','sound-system','invited')
) as v(id, partner_id, cat_slug, status)
join service_categories c on c.slug = v.cat_slug
on conflict (id) do nothing;

-- ---- 3. Submitted quotes ----------------------------------------------
insert into quotes (id, reference, request_id, partner_id, category_id, invite_id, status, current_version, created_by)
select v.id::uuid, v.ref, '99999999-0000-4000-8000-000000000001', v.partner_id::uuid, c.id, v.invite_id::uuid, 'submitted', 1, v.created_by::uuid
from (values
  ('bbbbbbbb-0000-4000-8000-000000000001','QT-2026-90001','66666666-0000-4000-8000-000000000003','conference-catering','aaaaaaaa-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002','QT-2026-90002','66666666-0000-4000-8000-000000000001','conference-catering','aaaaaaaa-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000003','QT-2026-90003','66666666-0000-4000-8000-000000000009','stage','aaaaaaaa-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000005')
) as v(id, ref, partner_id, cat_slug, invite_id, created_by)
join service_categories c on c.slug = v.cat_slug
on conflict (id) do nothing;

-- Created as drafts first: a submitted version is immutable, so line
-- items must be added before the version is marked submitted. This is
-- exactly the order the application follows.
insert into quote_versions (id, quote_id, version_no, status, guest_count, notes, payment_terms, valid_until)
values
  ('cccccccc-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001',1,'draft',320,'Full day service with our own staff and equipment. Vegetarian meals plated separately.','50% advance, balance on the day.', current_date + 20),
  ('cccccccc-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000002',1,'draft',320,'Premium buffet with live counters. Includes uniformed service staff.','50% advance.', current_date + 20),
  ('cccccccc-0000-4000-8000-000000000003','bbbbbbbb-0000-4000-8000-000000000003',1,'draft',320,'Stage 24x12ft with truss, backdrop and a 12ft LED wall. Includes setup the evening before.','50% advance for structural build.', current_date + 20)
on conflict (id) do nothing;

-- Line items. Totals are computed by the recalc trigger, never inserted.
insert into quote_items (quote_version_id, charge_kind, label, unit, quantity, unit_price_minor, sort_order) values
  ('cccccccc-0000-4000-8000-000000000001','food','Full day conference catering package','per_person',320,78000,10),
  ('cccccccc-0000-4000-8000-000000000001','service_staff','Service staff (8 for the day)','per_item',8,250000,20),
  ('cccccccc-0000-4000-8000-000000000001','delivery','Delivery and setup','flat',1,500000,30),
  ('cccccccc-0000-4000-8000-000000000002','food','Premium buffet with live counters','per_person',320,88000,10),
  ('cccccccc-0000-4000-8000-000000000002','service_staff','Service staff (10 for the day)','per_item',10,280000,20),
  ('cccccccc-0000-4000-8000-000000000002','equipment','Chafing, crockery and linen','flat',1,900000,30),
  ('cccccccc-0000-4000-8000-000000000003','equipment','Stage 24x12ft with truss and backdrop','flat',1,18500000,10),
  ('cccccccc-0000-4000-8000-000000000003','equipment','12ft LED wall with operator','flat',1,9500000,20),
  ('cccccccc-0000-4000-8000-000000000003','setup','Setup the evening before','flat',1,1500000,30)
on conflict do nothing;

-- Now freeze them, as submit_quote_version() would.
update quote_versions
   set status = 'submitted', submitted_at = now() - interval '1 day'
 where id in (
   'cccccccc-0000-4000-8000-000000000001',
   'cccccccc-0000-4000-8000-000000000002',
   'cccccccc-0000-4000-8000-000000000003');

-- ---- 4. A second request that is already won --------------------------
insert into service_requests (
  id, reference, status, customer_profile_id, event_type_id, title,
  event_date, start_time, guest_count, city_id, area_id, venue_name,
  budget_mode, budget_total_minor, requirements,
  contact_name, contact_phone, contact_email, submitted_at, closed_at
)
select
  '99999999-0000-4000-8000-000000000002', 'REQ-2026-90002', 'won',
  '22222222-0000-4000-8000-000000000003',
  (select id from event_types where slug = 'holud'),
  'Farhana & Rezaul — Holud',
  (current_date + 18), time '17:00', 300,
  (select id from cities where slug = 'dhaka'),
  (select id from areas where slug = 'uttara'),
  'Community centre, Uttara Sector 7',
  'total', 55000000,
  'Traditional holud with marigold theme. Kacchi for dinner. Photography for the full evening.',
  'Farhana Chowdhury', '+8801712000003', 'customer@demo.eventlybd.test',
  now() - interval '20 days', now() - interval '12 days'
on conflict (id) do nothing;

insert into request_services (request_id, category_id, is_primary)
select '99999999-0000-4000-8000-000000000002', c.id, c.slug = 'wedding-catering'
from service_categories c where c.slug in ('wedding-catering', 'decorator', 'photographer')
on conflict do nothing;

-- Accepted quotes behind the won request.
insert into quotes (id, reference, request_id, partner_id, category_id, status, current_version, created_by)
select v.id::uuid, v.ref, '99999999-0000-4000-8000-000000000002', v.partner_id::uuid, c.id, 'accepted', 1, v.created_by::uuid
from (values
  ('bbbbbbbb-0000-4000-8000-000000000011','QT-2026-90011','66666666-0000-4000-8000-000000000001','wedding-catering','33333333-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000012','QT-2026-90012','66666666-0000-4000-8000-000000000005','decorator','33333333-0000-4000-8000-000000000002'),
  ('bbbbbbbb-0000-4000-8000-000000000013','QT-2026-90013','66666666-0000-4000-8000-000000000006','photographer','33333333-0000-4000-8000-000000000003')
) as v(id, ref, partner_id, cat_slug, created_by)
join service_categories c on c.slug = v.cat_slug
on conflict (id) do nothing;

insert into quote_versions (id, quote_id, version_no, status, guest_count, notes, valid_until) values
  ('cccccccc-0000-4000-8000-000000000011','bbbbbbbb-0000-4000-8000-000000000011',1,'draft',300,'Kacchi dinner service with full staff.', current_date + 5),
  ('cccccccc-0000-4000-8000-000000000012','bbbbbbbb-0000-4000-8000-000000000012',1,'draft',null,'Holud stage package with marigold theme.', current_date + 5),
  ('cccccccc-0000-4000-8000-000000000013','bbbbbbbb-0000-4000-8000-000000000013',1,'draft',null,'Full evening coverage, two photographers.', current_date + 5)
on conflict (id) do nothing;

insert into quote_items (quote_version_id, charge_kind, label, unit, quantity, unit_price_minor, sort_order) values
  ('cccccccc-0000-4000-8000-000000000011','food','Kacchi dinner, full service','per_person',300,72000,10),
  ('cccccccc-0000-4000-8000-000000000011','service_staff','Service staff','per_item',12,220000,20),
  ('cccccccc-0000-4000-8000-000000000012','decoration','Holud stage package','flat',1,8500000,10),
  ('cccccccc-0000-4000-8000-000000000012','decoration','Entrance and pathway decor','flat',1,2200000,20),
  ('cccccccc-0000-4000-8000-000000000013','other','Full evening photography, two photographers','flat',1,4500000,10)
on conflict do nothing;

update quote_versions
   set status = 'accepted', submitted_at = now() - interval '15 days'
 where id in (
   'cccccccc-0000-4000-8000-000000000011',
   'cccccccc-0000-4000-8000-000000000012',
   'cccccccc-0000-4000-8000-000000000013');

commit;

-- ---- 5. The accepted proposal and the event it produced ---------------
begin;

-- Created as a draft: a sent proposal is immutable, so the lines (which
-- drive the recalculated totals) must be added before it is marked sent.
insert into proposals (
  id, reference, request_id, status, version_no, title, summary,
  service_fee_minor, coordination_fee_minor, delivery_fee_minor,
  deposit_bps, balance_due_days, valid_until, prepared_by
) values (
  'dddddddd-0000-4000-8000-000000000001', 'PR-2026-90001',
  '99999999-0000-4000-8000-000000000002', 'draft', 1,
  'Holud — Farhana & Rezaul',
  'Three verified partners, all confirmed for the date. Bengal Feast handles dinner service, Shobuj Mandap the stage and entrance, and Lens & Light covers the full evening. One coordinator on site from 15:00.',
  1200000, 1500000, 300000, 5000, 3,
  current_date + 5, '11111111-0000-4000-8000-000000000002'
) on conflict (id) do nothing;

-- Lines carry a commission snapshot; the payable is derived.
insert into proposal_lines (
  proposal_id, quote_id, quote_version_id, partner_id, category_id, label, description,
  amount_minor, commission_bps, commission_minor, partner_payable_minor, sort_order
)
select
  'dddddddd-0000-4000-8000-000000000001', v.quote_id::uuid, v.version_id::uuid, v.partner_id::uuid, c.id,
  v.label, v.descr, v.amount, v.bps,
  round(v.amount * v.bps / 10000.0)::bigint,
  v.amount - round(v.amount * v.bps / 10000.0)::bigint,
  v.sort
from (values
  ('bbbbbbbb-0000-4000-8000-000000000011','cccccccc-0000-4000-8000-000000000011','66666666-0000-4000-8000-000000000001','wedding-catering','Catering','Kacchi dinner for 300 guests with full service staff, crockery and chafing.', 24240000::bigint, 1400, 10),
  ('bbbbbbbb-0000-4000-8000-000000000012','cccccccc-0000-4000-8000-000000000012','66666666-0000-4000-8000-000000000005','decorator','Decoration','Holud stage with marigold theme, entrance and pathway decor.', 10700000::bigint, 1500, 20),
  ('bbbbbbbb-0000-4000-8000-000000000013','cccccccc-0000-4000-8000-000000000013','66666666-0000-4000-8000-000000000006','photographer','Photography','Full evening coverage with two photographers and edited gallery.', 4500000::bigint, 1500, 30)
) as v(quote_id, version_id, partner_id, cat_slug, label, descr, amount, bps, sort)
join service_categories c on c.slug = v.cat_slug
on conflict do nothing;

-- Now send and accept it, as sendProposal() and accept_proposal() would.
update proposals
   set status = 'accepted',
       sent_at = now() - interval '14 days',
       viewed_at = now() - interval '14 days',
       responded_at = now() - interval '12 days',
       accepted_at = now() - interval '12 days',
       accepted_by = '22222222-0000-4000-8000-000000000003'
 where id = 'dddddddd-0000-4000-8000-000000000001';

insert into proposal_events (proposal_id, kind, note, actor_id) values
  ('dddddddd-0000-4000-8000-000000000001','sent','Sent to customer','11111111-0000-4000-8000-000000000002'),
  ('dddddddd-0000-4000-8000-000000000001','accepted','Accepted by customer','22222222-0000-4000-8000-000000000003')
on conflict do nothing;

insert into events (
  id, reference, request_id, proposal_id, customer_profile_id, title, event_type_id,
  stage, event_date, start_time, guest_count, city_id, area_id, venue_name,
  total_minor, paid_minor, event_manager_id, customer_notes
)
select
  'eeeeeeee-0000-4000-8000-000000000001', 'EV-2026-90001',
  '99999999-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001',
  '22222222-0000-4000-8000-000000000003', 'Holud — Farhana & Rezaul',
  (select id from event_types where slug = 'holud'),
  'planning', (current_date + 18), time '17:00', 300,
  (select id from cities where slug = 'dhaka'),
  (select id from areas where slug = 'uttara'),
  'Community centre, Uttara Sector 7',
  (select total_minor from proposals where id = 'dddddddd-0000-4000-8000-000000000001'),
  0, '11111111-0000-4000-8000-000000000002',
  'Traditional holud with marigold theme. Kacchi for dinner.'
on conflict (id) do nothing;

insert into bookings (
  id, reference, event_id, partner_id, category_id, quote_id, quote_version_id,
  status, gross_minor, commission_bps, commission_minor, partner_payable_minor,
  service_date, service_time, headcount, confirmed_at
)
select
  v.id::uuid, v.ref, 'eeeeeeee-0000-4000-8000-000000000001', v.partner_id::uuid, c.id,
  v.quote_id::uuid, v.version_id::uuid, 'confirmed',
  v.amount, v.bps,
  round(v.amount * v.bps / 10000.0)::bigint,
  v.amount - round(v.amount * v.bps / 10000.0)::bigint,
  (current_date + 18), time '17:00', 300, now() - interval '12 days'
from (values
  ('ffffffff-0000-4000-8000-000000000001','BK-2026-90001','66666666-0000-4000-8000-000000000001','wedding-catering','bbbbbbbb-0000-4000-8000-000000000011','cccccccc-0000-4000-8000-000000000011', 24240000::bigint, 1400),
  ('ffffffff-0000-4000-8000-000000000002','BK-2026-90002','66666666-0000-4000-8000-000000000005','decorator','bbbbbbbb-0000-4000-8000-000000000012','cccccccc-0000-4000-8000-000000000012', 10700000::bigint, 1500),
  ('ffffffff-0000-4000-8000-000000000003','BK-2026-90003','66666666-0000-4000-8000-000000000006','photographer','bbbbbbbb-0000-4000-8000-000000000013','cccccccc-0000-4000-8000-000000000013', 4500000::bigint, 1500)
) as v(id, ref, partner_id, cat_slug, quote_id, version_id, amount, bps)
join service_categories c on c.slug = v.cat_slug
on conflict (id) do nothing;

insert into event_tasks (event_id, booking_id, title, detail, status, due_at, is_customer_visible, assignee_id) values
  ('eeeeeeee-0000-4000-8000-000000000001','ffffffff-0000-4000-8000-000000000001','Confirm final headcount','Caterer needs the final number 5 days before.','todo', now() + interval '10 days', true, '11111111-0000-4000-8000-000000000002'),
  ('eeeeeeee-0000-4000-8000-000000000001','ffffffff-0000-4000-8000-000000000002','Approve stage design','Send the decorator''s mock-up to the customer.','in_progress', now() + interval '4 days', true, '11111111-0000-4000-8000-000000000002'),
  ('eeeeeeee-0000-4000-8000-000000000001',null,'Confirm venue access time','Community centre allows setup from 12:00 — verify with the manager.','todo', now() + interval '6 days', false, '11111111-0000-4000-8000-000000000002'),
  ('eeeeeeee-0000-4000-8000-000000000001','ffffffff-0000-4000-8000-000000000003','Share photography shot list','Family group shots to be confirmed.','todo', now() + interval '12 days', true, null)
on conflict do nothing;

insert into event_timeline (event_id, kind, title, detail, visibility) values
  ('eeeeeeee-0000-4000-8000-000000000001','proposal_accepted','Proposal accepted','Event created from proposal PR-2026-90001','all'),
  ('eeeeeeee-0000-4000-8000-000000000001','vendor_confirmed','All vendors confirmed','Catering, decoration and photography confirmed for the date.','all')
on conflict do nothing;

-- ---- 6. A settled deposit, with balanced ledger entries ---------------
insert into payments (
  id, reference, event_id, proposal_id, customer_profile_id, purpose, status,
  amount_minor, provider, provider_ref, method, idempotency_key, paid_at, net_received_minor
)
select
  '12121212-0000-4000-8000-000000000001', 'PAY-2026-90001',
  'eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001',
  '22222222-0000-4000-8000-000000000003', 'deposit', 'paid',
  p.deposit_minor, 'manual', 'DEMO-BANK-8891', 'bank_transfer',
  'demo-deposit-90001', now() - interval '11 days', p.deposit_minor
from proposals p where p.id = 'dddddddd-0000-4000-8000-000000000001'
on conflict (id) do nothing;

update events
   set paid_minor = (select amount_minor from payments where id = '12121212-0000-4000-8000-000000000001')
 where id = 'eeeeeeee-0000-4000-8000-000000000001';

-- Post the deposit to the ledger, split between platform revenue and
-- partner payable in proportion to the amount collected so far.
do $$
declare
  v_amount bigint;
  v_total bigint;
  v_payable bigint;
  v_partner_share bigint;
begin
  select amount_minor into v_amount from payments where id = '12121212-0000-4000-8000-000000000001';
  select total_minor into v_total from events where id = 'eeeeeeee-0000-4000-8000-000000000001';
  select coalesce(sum(partner_payable_minor), 0) into v_payable
  from bookings where event_id = 'eeeeeeee-0000-4000-8000-000000000001';

  v_partner_share := round(v_payable::numeric * v_amount / nullif(v_total, 0))::bigint;

  perform app.post_ledger_entries(
    jsonb_build_array(
      jsonb_build_object('account','gateway_clearing','direction','debit','amount_minor', v_amount,
        'payment_id','12121212-0000-4000-8000-000000000001','event_id','eeeeeeee-0000-4000-8000-000000000001',
        'description','Deposit received for EV-2026-90001'),
      jsonb_build_object('account','partner_payable','direction','credit','amount_minor', v_partner_share,
        'payment_id','12121212-0000-4000-8000-000000000001','event_id','eeeeeeee-0000-4000-8000-000000000001',
        'description','Partner payable accrued'),
      jsonb_build_object('account','platform_revenue','direction','credit','amount_minor', v_amount - v_partner_share,
        'payment_id','12121212-0000-4000-8000-000000000001','event_id','eeeeeeee-0000-4000-8000-000000000001',
        'description','Platform revenue accrued')
    ),
    'Demo deposit for EV-2026-90001');
end $$;

-- ---- 7. A completed past event, so reviews and payouts have data ------
insert into events (
  id, reference, customer_profile_id, organization_id, title, event_type_id, stage,
  event_date, start_time, guest_count, city_id, area_id, venue_name, total_minor, paid_minor
)
select
  'eeeeeeee-0000-4000-8000-000000000002', 'EV-2026-90002',
  '22222222-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001',
  'ABC Technologies quarterly town hall',
  (select id from event_types where slug = 'corporate-lunch'), 'completed',
  (current_date - 25), time '12:30', 180,
  (select id from cities where slug = 'dhaka'),
  (select id from areas where slug = 'banani'),
  'ABC Technologies head office', 9072000, 9072000
on conflict (id) do nothing;

insert into bookings (
  id, reference, event_id, partner_id, category_id, status,
  gross_minor, commission_bps, commission_minor, partner_payable_minor,
  service_date, service_time, headcount, confirmed_at, completed_at
)
select
  'ffffffff-0000-4000-8000-000000000011', 'BK-2026-90011',
  'eeeeeeee-0000-4000-8000-000000000002', '66666666-0000-4000-8000-000000000003',
  (select id from service_categories where slug = 'corporate-lunch'), 'completed',
  7560000, 1200, 907200, 6652800,
  (current_date - 25), time '12:30', 180, now() - interval '40 days', now() - interval '25 days'
on conflict (id) do nothing;

insert into reviews (
  booking_id, event_id, partner_id, author_id, organization_id, status, rating,
  quality_rating, communication_rating, punctuality_rating, value_rating, title, comment
) values (
  'ffffffff-0000-4000-8000-000000000011', 'eeeeeeee-0000-4000-8000-000000000002',
  '66666666-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001',
  '44444444-0000-4000-8000-000000000001', 'published', 5, 5, 5, 4, 5,
  'Delivered exactly what was quoted',
  'Arrived early, set up without fuss and the vegetarian count was right. The only note is that the dessert ran short by about ten portions.'
) on conflict (booking_id) do nothing;

insert into review_responses (review_id, partner_id, author_id, body)
select r.id, r.partner_id, '33333333-0000-4000-8000-000000000001',
  'Thank you. You are right about the dessert — we have increased the buffer for repeat corporate bookings.'
from reviews r where r.booking_id = 'ffffffff-0000-4000-8000-000000000011'
on conflict (review_id) do nothing;

-- ---- 8. Conversation threads -------------------------------------------
insert into message_threads (id, kind, subject, request_id, event_id, contact_sharing_allowed, created_by)
values
  ('13131313-0000-4000-8000-000000000001','customer_platform','Event EV-2026-90001', '99999999-0000-4000-8000-000000000002','eeeeeeee-0000-4000-8000-000000000001', true, '22222222-0000-4000-8000-000000000003'),
  ('13131313-0000-4000-8000-000000000002','partner_platform','Request REQ-2026-90001', '99999999-0000-4000-8000-000000000001', null, true, '11111111-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into thread_participants (thread_id, profile_id, side) values
  ('13131313-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000003','customer'),
  ('13131313-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000002','platform'),
  ('13131313-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000001','partner'),
  ('13131313-0000-4000-8000-000000000002','11111111-0000-4000-8000-000000000002','platform')
on conflict (thread_id, profile_id) do nothing;

insert into messages (thread_id, sender_id, sender_side, kind, body) values
  ('13131313-0000-4000-8000-000000000001', null, 'platform', 'system', 'Event EV-2026-90001 confirmed. Your event manager is Tanvir Hasan.'),
  ('13131313-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000002','platform','user','All three vendors are confirmed for the 18th. I will send the stage mock-up once the decorator shares it.'),
  ('13131313-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000003','customer','user','Thank you. Could we add 20 more guests? I will confirm the final number next week.'),
  ('13131313-0000-4000-8000-000000000002','11111111-0000-4000-8000-000000000002','platform','user','Customer has asked whether the vegetarian meals can be plated separately. Can you confirm?')
on conflict do nothing;

-- ---- 9. Notifications for the demo accounts ----------------------------
insert into notifications (profile_id, type_key, title, body, url) values
  ('22222222-0000-4000-8000-000000000003','booking.confirmed','Your event is confirmed','Holud — Farhana & Rezaul is confirmed with three vendors.','/dashboard/events/eeeeeeee-0000-4000-8000-000000000001'),
  ('22222222-0000-4000-8000-000000000001','quote.submitted','Quotes received','Three partners have quoted for your dealer conference.','/dashboard/requests/99999999-0000-4000-8000-000000000001'),
  ('33333333-0000-4000-8000-000000000001','request.invite','New quotation request','Conference for 320 guests in Gulshan.','/partner/requests/aaaaaaaa-0000-4000-8000-000000000002'),
  ('11111111-0000-4000-8000-000000000002','request.new_internal','New request needs triage','REQ-2026-90001 · conference · 320 guests','/admin/requests/99999999-0000-4000-8000-000000000001')
on conflict do nothing;

insert into internal_notes (entity, entity_id, body, author_id) values
  ('service_request','99999999-0000-4000-8000-000000000001','Customer is price-sensitive but has booked with us twice. Push Zaika — they have the capacity and the better per-head.','11111111-0000-4000-8000-000000000002'),
  ('partner','66666666-0000-4000-8000-000000000010','Trade licence received, waiting on food licence before approving.','11111111-0000-4000-8000-000000000002')
on conflict do nothing;

commit;

-- ---------------------------------------------------------------------
-- Summary for the operator running this seed.
-- ---------------------------------------------------------------------
do $$
declare v_partners integer; v_requests integer; v_events integer;
begin
  select count(*) into v_partners from partner_profiles;
  select count(*) into v_requests from service_requests;
  select count(*) into v_events from events;
  raise notice 'Demo seed complete: % partners, % requests, % events. Password for every demo account: DemoPassword2026!', v_partners, v_requests, v_events;
end $$;
