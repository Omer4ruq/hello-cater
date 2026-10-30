-- =====================================================================
-- Evently BD — Reference seed
-- Safe to run in ANY environment including production. Contains only
-- catalogue, location, policy and marketing content. No users, no
-- passwords, no sample transactions (see seed_demo.sql for those).
-- Idempotent: re-running updates in place.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------
insert into districts (slug, name, name_bn, division, is_active) values
  ('dhaka',       'Dhaka',       'ঢাকা',        'Dhaka',      true),
  ('gazipur',     'Gazipur',     'গাজীপুর',      'Dhaka',      false),
  ('narayanganj', 'Narayanganj', 'নারায়ণগঞ্জ',   'Dhaka',      false),
  ('chattogram',  'Chattogram',  'চট্টগ্রাম',     'Chattogram', false),
  ('sylhet',      'Sylhet',      'সিলেট',        'Sylhet',     false),
  ('khulna',      'Khulna',      'খুলনা',        'Khulna',     false),
  ('rajshahi',    'Rajshahi',    'রাজশাহী',      'Rajshahi',   false),
  ('barishal',    'Barishal',    'বরিশাল',       'Barishal',   false),
  ('rangpur',     'Rangpur',     'Rangpur',      'Rangpur',    false),
  ('mymensingh',  'Mymensingh',  'ময়মনসিংহ',    'Mymensingh', false)
on conflict (slug) do update set name = excluded.name, is_active = excluded.is_active;

insert into cities (district_id, slug, name, name_bn, is_active, is_launched, seo_title, seo_description)
select d.id, v.slug, v.name, v.name_bn, v.is_active, v.is_launched, v.seo_title, v.seo_description
from (values
  ('dhaka','dhaka','Dhaka','ঢাকা', true, true,
   'Catering & Event Services in Dhaka',
   'Compare verified caterers, decorators, photographers and event managers across Dhaka. One request, multiple quotations.'),
  ('chattogram','chattogram','Chattogram','চট্টগ্রাম', false, false,
   'Catering & Event Services in Chattogram', 'Coming soon to Chattogram.'),
  ('sylhet','sylhet','Sylhet','সিলেট', false, false,
   'Catering & Event Services in Sylhet', 'Coming soon to Sylhet.'),
  ('gazipur','gazipur','Gazipur','গাজীপুর', false, false,
   'Catering & Event Services in Gazipur', 'Coming soon to Gazipur.'),
  ('narayanganj','narayanganj','Narayanganj','নারায়ণগঞ্জ', false, false,
   'Catering & Event Services in Narayanganj', 'Coming soon to Narayanganj.')
) as v(district_slug, slug, name, name_bn, is_active, is_launched, seo_title, seo_description)
join districts d on d.slug = v.district_slug
on conflict (slug) do update set name = excluded.name, is_active = excluded.is_active;

insert into areas (city_id, slug, name, name_bn, sort_order)
select c.id, v.slug, v.name, v.name_bn, v.sort_order
from (values
  ('gulshan','Gulshan','গুলশান',10), ('banani','Banani','বনানী',20),
  ('baridhara','Baridhara','বারিধারা',30), ('bashundhara','Bashundhara R/A','বসুন্ধরা',40),
  ('uttara','Uttara','উত্তরা',50), ('mohakhali','Mohakhali','মহাখালী',60),
  ('tejgaon','Tejgaon','তেজগাঁও',70), ('dhanmondi','Dhanmondi','ধানমন্ডি',80),
  ('mirpur','Mirpur','মিরপুর',90), ('motijheel','Motijheel','মতিঝিল',100),
  ('badda','Badda','বাড্ডা',110), ('mohammadpur','Mohammadpur','মোহাম্মদপুর',120),
  ('banasree','Banasree','বনশ্রী',130), ('rampura','Rampura','রামপুরা',140),
  ('khilgaon','Khilgaon','খিলগাঁও',150), ('farmgate','Farmgate','ফার্মগেট',160),
  ('shahbagh','Shahbagh','শাহবাগ',170), ('ramna','Ramna','রমনা',180),
  ('paltan','Paltan','পল্টন',190), ('wari','Wari','ওয়ারী',200),
  ('old-dhaka','Old Dhaka','পুরান ঢাকা',210), ('lalmatia','Lalmatia','লালমাটিয়া',220),
  ('shyamoli','Shyamoli','শ্যামলী',230), ('agargaon','Agargaon','আগারগাঁও',240),
  ('cantonment','Dhaka Cantonment','ঢাকা সেনানিবাস',250),
  ('jatrabari','Jatrabari','যাত্রাবাড়ী',260), ('savar','Savar','সাভার',270),
  ('keraniganj','Keraniganj','কেরানীগঞ্জ',280), ('purbachal','Purbachal','পূর্বাচল',290),
  ('niketan','Niketan','নিকেতন',300)
) as v(slug, name, name_bn, sort_order)
cross join (select id from cities where slug = 'dhaka') c
on conflict (slug) do update set name = excluded.name;

-- ---------------------------------------------------------------------
-- Cuisines
-- ---------------------------------------------------------------------
insert into cuisines (slug, name, name_bn, sort_order) values
  ('bangladeshi','Bangladeshi','বাংলাদেশি',10),
  ('biryani-kacchi','Biryani & Kacchi','বিরিয়ানি ও কাচ্চি',20),
  ('bbq-grill','BBQ & Grill','বারবিকিউ',30),
  ('chinese','Chinese','চাইনিজ',40),
  ('indian','Indian','ইন্ডিয়ান',50),
  ('continental','Continental','কন্টিনেন্টাল',60),
  ('thai','Thai','থাই',70),
  ('italian','Italian','ইতালিয়ান',80),
  ('middle-eastern','Middle Eastern','মিডল ইস্টার্ন',90),
  ('fusion','Fusion','ফিউশন',100),
  ('desserts','Desserts & Sweets','মিষ্টি',110),
  ('vegetarian','Vegetarian','নিরামিষ',120)
on conflict (slug) do update set name = excluded.name;

-- ---------------------------------------------------------------------
-- Service categories — three roots, each with its own children.
-- ---------------------------------------------------------------------
insert into service_categories (slug, name, name_bn, kind, sort_order, is_featured, short_description, seo_title, seo_description) values
  ('catering','Catering','ক্যাটারিং','catering',10,true,
   'Corporate, wedding and private catering from verified kitchens.',
   'Catering Services in Dhaka | Corporate, Wedding & Private',
   'Request quotations from verified caterers in Dhaka for corporate lunch, weddings, conferences and private events.'),
  ('event-management','Event Management','ইভেন্ট ম্যানেজমেন্ট','event_service',20,true,
   'End-to-end planning and on-the-day coordination.',
   'Event Management Companies in Dhaka',
   'Compare proposals from verified event management companies in Dhaka for corporate programmes, weddings and launches.'),
  ('event-vendors','Event Vendors','ইভেন্ট ভেন্ডর','vendor',30,true,
   'Decor, venue, photography, sound, lighting and everything in between.',
   'Event Vendors & Suppliers in Dhaka',
   'Find verified decorators, photographers, sound and lighting suppliers, venues and more in Dhaka.')
on conflict (slug) do update set name = excluded.name, kind = excluded.kind;

insert into service_categories (parent_id, slug, name, name_bn, kind, sort_order, is_featured, short_description, commission_bps)
select p.id, v.slug, v.name, v.name_bn, v.kind, v.sort_order, v.is_featured, v.descr, v.bps
from (values
  -- Catering
  ('catering','corporate-lunch','Corporate Lunch','কর্পোরেট লাঞ্চ','catering',10,true,'Daily or one-off office lunch for teams of any size.',1200),
  ('catering','office-catering','Office Catering','অফিস ক্যাটারিং','catering',20,false,'Recurring catering contracts for offices.',1000),
  ('catering','meeting-catering','Meeting Catering','মিটিং ক্যাটারিং','catering',30,false,'Working lunches, board meetings and client sessions.',1200),
  ('catering','conference-catering','Conference Catering','কনফারেন্স ক্যাটারিং','catering',40,true,'Multi-session catering with tea breaks and buffet lunch.',1200),
  ('catering','training-catering','Training Catering','ট্রেনিং ক্যাটারিং','catering',50,false,'Workshop and training day packages.',1200),
  ('catering','buffet','Buffet','বুফে','catering',60,true,'Full buffet service with live counters and staff.',1300),
  ('catering','packed-meals','Packed Meals & Lunch Boxes','প্যাকড মিল','catering',70,true,'Individually packed meals for offices, field teams and events.',1000),
  ('catering','breakfast','Breakfast Catering','ব্রেকফাস্ট','catering',80,false,'Morning sessions, early flights and residential programmes.',1000),
  ('catering','snacks','Snacks & Refreshments','স্ন্যাকস','catering',90,false,'Tea-time snacks, savouries and refreshment boxes.',1000),
  ('catering','tea-coffee','Tea & Coffee Service','চা ও কফি','catering',100,false,'Barista and tea stalls for events and offices.',1000),
  ('catering','bbq','BBQ & Grill','বারবিকিউ','catering',110,false,'Live BBQ counters and grill stations.',1300),
  ('catering','biryani-kacchi','Biryani & Kacchi','বিরিয়ানি ও কাচ্চি','catering',120,true,'Kacchi biryani, tehari and morog polao at scale.',1300),
  ('catering','wedding-catering','Wedding Catering','ওয়েডিং ক্যাটারিং','catering',130,true,'Holud, mehendi, wedding and reception menus.',1400),
  ('catering','iftar-catering','Iftar Catering','ইফতার ক্যাটারিং','catering',140,true,'Corporate iftar parties and community iftar arrangements.',1200),
  ('catering','premium-catering','Premium Catering','প্রিমিয়াম ক্যাটারিং','catering',150,false,'Plated fine dining and chef-led experiences.',1500),
  ('catering','home-party-catering','Home & Private Catering','হোম ক্যাটারিং','catering',160,false,'Small gatherings, family events and house parties.',1200),
  -- Event management
  ('event-management','wedding-planning','Wedding Planning','ওয়েডিং প্ল্যানিং','event_service',10,true,'Full wedding production across holud, mehendi, akhd and reception.',1500),
  ('event-management','corporate-event-management','Corporate Event Management','কর্পোরেট ইভেন্ট','event_service',20,true,'Annual programmes, dealer conferences and town halls.',1500),
  ('event-management','product-launch','Product Launch','প্রোডাক্ট লঞ্চ','event_service',30,false,'Launch events, press meets and brand activations.',1500),
  ('event-management','conference-management','Conference & Seminar','কনফারেন্স','event_service',40,false,'Registration, stage, AV and delegate management.',1500),
  ('event-management','workshop-training','Workshop & Training','ওয়ার্কশপ','event_service',50,false,'Training logistics, venues and participant services.',1500),
  ('event-management','cultural-program','Cultural Programme','সাংস্কৃতিক অনুষ্ঠান','event_service',60,false,'Cultural nights, Pohela Boishakh and community events.',1500),
  ('event-management','govt-ngo-program','Government & NGO Programme','সরকারি ও এনজিও','event_service',70,false,'Public programmes with procurement-friendly documentation.',1200),
  ('event-management','private-party','Private Party','প্রাইভেট পার্টি','event_service',80,false,'Birthdays, anniversaries and family celebrations.',1500),
  -- Vendors
  ('event-vendors','decorator','Decoration & Stage Design','ডেকোরেশন','vendor',10,true,'Stage, entrance, table and floral decoration.',1500),
  ('event-vendors','venue','Venue & Banquet','ভেন্যু','vendor',20,true,'Community centres, banquet halls, rooftops and lawns.',1000),
  ('event-vendors','photographer','Photography','ফটোগ্রাফি','vendor',30,true,'Event, wedding and corporate photography.',1500),
  ('event-vendors','videographer','Videography & Cinematography','ভিডিওগ্রাফি','vendor',40,true,'Highlight films, live streaming and documentation.',1500),
  ('event-vendors','sound-system','Sound System','সাউন্ড সিস্টেম','vendor',50,false,'PA systems, mics, mixers and technicians.',1500),
  ('event-vendors','led-screen','LED Screen & Projection','এলইডি স্ক্রিন','vendor',60,false,'LED walls, projectors and content playback.',1500),
  ('event-vendors','stage','Stage & Truss','স্টেজ','vendor',70,false,'Stage construction, trussing and backdrops.',1500),
  ('event-vendors','lighting','Lighting','লাইটিং','vendor',80,false,'Architectural, stage and ambient lighting.',1500),
  ('event-vendors','host-mc','Host & MC','উপস্থাপক','vendor',90,false,'Bilingual anchors and programme hosts.',1500),
  ('event-vendors','entertainment','Entertainment & Artists','বিনোদন','vendor',100,false,'Bands, singers, dance troupes and performers.',1500),
  ('event-vendors','makeup-salon','Makeup & Salon','মেকআপ','vendor',110,false,'Bridal and party makeup, hair and grooming.',1500),
  ('event-vendors','mehendi-artist','Mehendi Artist','মেহেদি আর্টিস্ট','vendor',120,false,'Bridal and guest mehendi.',1500),
  ('event-vendors','cake-dessert','Cake & Dessert','কেক ও ডেজার্ট','vendor',130,false,'Celebration cakes, dessert tables and sweets.',1300),
  ('event-vendors','florist','Florist','ফুল','vendor',140,false,'Fresh flower arrangements and installations.',1500),
  ('event-vendors','furniture-seating','Furniture & Seating','ফার্নিচার','vendor',150,false,'Chairs, tables, sofas, lounges and linen.',1500),
  ('event-vendors','tent','Tent & Canopy','টেন্ট','vendor',160,false,'Pandal, canopy and weather cover.',1500),
  ('event-vendors','transport','Transport','পরিবহন','vendor',170,false,'Guest shuttles, VIP cars and logistics.',1200),
  ('event-vendors','security','Security','নিরাপত্তা','vendor',180,false,'Event security and crowd management.',1200),
  ('event-vendors','cleaning-staff','Cleaning & Support Staff','ক্লিনিং','vendor',190,false,'Housekeeping, waiters and support crew.',1200)
) as v(parent_slug, slug, name, name_bn, kind, sort_order, is_featured, descr, bps)
join service_categories p on p.slug = v.parent_slug
on conflict (slug) do update set
  name = excluded.name, parent_id = excluded.parent_id,
  kind = excluded.kind, commission_bps = excluded.commission_bps;

-- ---------------------------------------------------------------------
-- Event types
-- ---------------------------------------------------------------------
insert into event_types (slug, name, name_bn, segment, sort_order, is_featured, typical_guests_min, typical_guests_max, short_description, seo_title, seo_description) values
  ('corporate-lunch','Corporate Lunch','কর্পোরেট লাঞ্চ','corporate',10,true,20,500,
   'Office lunch for teams, clients and visitors.',
   'Corporate Lunch Catering in Dhaka','Office lunch catering in Dhaka with verified partners, transparent pricing and one invoice.'),
  ('corporate-dinner','Corporate Dinner','কর্পোরেট ডিনার','corporate',20,false,30,800,'Annual dinners and client hospitality.',null,null),
  ('conference','Conference','কনফারেন্স','corporate',30,true,50,2000,'Multi-session conferences with catering and AV.',
   'Conference Management & Catering in Dhaka','Conference catering, AV, stage and registration handled end to end.'),
  ('seminar','Seminar','সেমিনার','corporate',40,false,30,500,'Half-day and full-day seminars.',null,null),
  ('training','Training','ট্রেনিং','corporate',50,false,15,200,'Training programmes with refreshments and lunch.',null,null),
  ('workshop','Workshop','ওয়ার্কশপ','corporate',60,false,10,150,'Hands-on workshops and bootcamps.',null,null),
  ('product-launch','Product Launch','প্রোডাক্ট লঞ্চ','corporate',70,true,50,1000,'Launches, press meets and brand activations.',null,null),
  ('dealer-conference','Dealer Conference','ডিলার কনফারেন্স','corporate',80,false,100,1500,'Nationwide dealer and distributor programmes.',null,null),
  ('annual-program','Annual Programme','বার্ষিক অনুষ্ঠান','corporate',90,false,100,3000,'Annual general meetings and company days.',null,null),
  ('team-event','Team Event','টিম ইভেন্ট','corporate',100,false,10,200,'Team offsites, celebrations and away days.',null,null),
  ('corporate-iftar','Corporate Iftar','কর্পোরেট ইফতার','corporate',110,true,30,1500,'Ramadan iftar for staff, clients and partners.',
   'Corporate Iftar Party Catering in Dhaka','Iftar catering for offices in Dhaka — packed boxes or full buffet, delivered on time.'),
  ('wedding','Wedding','বিয়ে','wedding',200,true,150,2000,'The main wedding ceremony and feast.',
   'Wedding Catering & Planning in Dhaka','Plan your wedding in Dhaka with verified caterers, decorators and photographers in one place.'),
  ('holud','Holud','গায়ে হলুদ','wedding',210,true,100,800,'Gaye holud with stage, decor and catering.',
   'Holud Event Planning & Catering in Dhaka','Holud decoration, catering, photography and sound arranged through one coordinator.'),
  ('mehendi','Mehendi','মেহেদি','wedding',220,false,50,400,'Mehendi night with artists and light catering.',null,null),
  ('engagement','Engagement','এনগেজমেন্ট','wedding',230,false,50,400,'Engagement ceremonies and paka kotha.',null,null),
  ('reception','Reception','রিসেপশন','wedding',240,true,200,2000,'Bou bhat and reception dinners.',null,null),
  ('walima','Walima','ওয়ালিমা','wedding',250,false,150,1500,'Walima feast.',null,null),
  ('akhd','Akhd / Nikah','আকদ','wedding',260,false,50,500,'Nikah ceremony with close family.',null,null),
  ('birthday','Birthday','জন্মদিন','private',300,true,15,200,'Birthday parties at home or a venue.',
   'Birthday Party Catering & Planning in Dhaka','Birthday catering, cake, decoration and photography in one request.'),
  ('anniversary','Anniversary','বার্ষিকী','private',310,false,15,200,'Anniversary celebrations.',null,null),
  ('family-gathering','Family Gathering','পারিবারিক আয়োজন','private',320,false,15,150,'Family get-togethers and milad.',null,null),
  ('home-party','Home Party','হোম পার্টি','private',330,false,10,100,'Private parties at home.',null,null),
  ('aqiqah','Aqiqah / Naming','আকিকা','social',400,false,30,300,'Aqiqah and naming ceremonies.',null,null),
  ('milad','Milad / Religious','মিলাদ','social',410,false,30,500,'Milad mahfil and religious gatherings.',null,null),
  ('cultural-program','Cultural Programme','সাংস্কৃতিক অনুষ্ঠান','social',420,false,50,2000,'Cultural nights and community events.',null,null),
  ('ngo-program','NGO / Government Programme','এনজিও অনুষ্ঠান','government',500,false,50,1000,'Development programmes and public events.',null,null),
  ('other','Something Else','অন্যান্য','private',900,false,null,null,'Tell us what you are planning.',null,null)
on conflict (slug) do update set name = excluded.name, segment = excluded.segment;

-- ---------------------------------------------------------------------
-- Commercial defaults. Every number here is admin-editable.
-- ---------------------------------------------------------------------
insert into cancellation_policies (slug, name, description, is_default, is_active) values
  ('standard','Standard','Balanced policy used when a partner has not set their own.', true, true),
  ('flexible','Flexible','Generous cancellation window, suited to smaller orders.', false, true),
  ('strict','Strict','For large productions where costs are committed early.', false, true)
on conflict (slug) do update set name = excluded.name, description = excluded.description;

insert into cancellation_tiers (policy_id, hours_before, refund_bps, keeps_deposit, description)
select p.id, v.hours_before, v.refund_bps, v.keeps_deposit, v.descr
from (values
  ('standard', 168, 10000, false, 'Cancel 7+ days before: full refund'),
  ('standard', 72,  7500,  false, 'Cancel 3-7 days before: 75% refund'),
  ('standard', 24,  5000,  true,  'Cancel 1-3 days before: 50% refund, deposit retained'),
  ('standard', 0,   0,     true,  'Cancel within 24 hours: no refund'),
  ('flexible', 72,  10000, false, 'Cancel 3+ days before: full refund'),
  ('flexible', 24,  7500,  false, 'Cancel 1-3 days before: 75% refund'),
  ('flexible', 0,   2500,  true,  'Cancel within 24 hours: 25% refund'),
  ('strict',   720, 10000, false, 'Cancel 30+ days before: full refund'),
  ('strict',   336, 5000,  true,  'Cancel 14-30 days before: 50% refund'),
  ('strict',   0,   0,     true,  'Cancel within 14 days: no refund')
) as v(policy_slug, hours_before, refund_bps, keeps_deposit, descr)
join cancellation_policies p on p.slug = v.policy_slug
on conflict (policy_id, hours_before) do update set refund_bps = excluded.refund_bps;

insert into pricing_rules (name, scope, commission_bps, service_fee_bps, service_fee_flat_minor,
                           service_fee_min_minor, service_fee_max_minor, vat_bps, deposit_bps,
                           min_order_minor, priority, notes)
select 'Platform default', 'global', 1200, 300, 0, 50000, 5000000, 0, 5000, 500000, 1,
       'Baseline commercial terms. Category, partner and corporate overrides take precedence.'
where not exists (select 1 from pricing_rules where scope = 'global' and is_active);

-- ---------------------------------------------------------------------
-- Marketing content (editable from the admin CMS).
-- ---------------------------------------------------------------------
insert into cms_pages (slug, title, subtitle, kind, is_published, needs_legal_review, seo_title, seo_description, published_at) values
  ('about','About Evently BD','Bangladesh''s managed marketplace for catering and events.','page',true,false,
   'About Evently BD','We connect organisations and families in Bangladesh with verified catering and event partners.', now()),
  ('terms','Terms of Service',null,'legal',true,true,'Terms of Service','Terms governing use of the Evently BD platform.', now()),
  ('privacy','Privacy Policy',null,'legal',true,true,'Privacy Policy','How Evently BD collects and uses personal data.', now()),
  ('refund-policy','Cancellation & Refund Policy',null,'legal',true,true,'Cancellation & Refund Policy','How cancellations and refunds work on Evently BD.', now()),
  ('partner-agreement','Partner Agreement',null,'legal',true,true,'Partner Agreement','Terms for service partners on Evently BD.', now())
on conflict (slug) do update set title = excluded.title, needs_legal_review = excluded.needs_legal_review;

insert into cms_sections (page_slug, key, kind, heading, subheading, body, cta_label, cta_href, items, sort_order) values
  ('home','hero','hero','Plan your event. We handle the rest.',
   'Find trusted caterers and event professionals, compare proposals, book services and manage your entire event in one place.',
   null,'Plan an Event','/plan', '[]'::jsonb, 10),
  ('home','trust','stats',null,null,null,null,null,
   '[{"value":"Verified","label":"Every partner checked before they quote"},
     {"value":"1 request","label":"Multiple comparable proposals"},
     {"value":"1 invoice","label":"Even when five vendors are involved"},
     {"value":"Dhaka","label":"Live now, expanding across Bangladesh"}]'::jsonb, 20),
  ('home','how_it_works','steps','How it works','From requirement to a finished event in five steps.',null,null,null,
   '[{"title":"Tell us what you need","body":"Share your date, guest count, location and budget. It takes about two minutes and commits you to nothing."},
     {"title":"We shortlist partners","body":"Our team matches your requirement against verified partners who actually cover your area, date and capacity."},
     {"title":"Compare real quotations","body":"Partners quote against your brief. You see menus, inclusions and totals side by side."},
     {"title":"Accept one proposal","body":"For multi-vendor events we combine everything into a single proposal with a single total."},
     {"title":"We coordinate the day","body":"Your event manager tracks every vendor, payment and deliverable until it is done."}]'::jsonb, 30),
  ('home','why_us','features','Why organisations choose us','Built for the way events actually get arranged in Dhaka.',null,null,null,
   '[{"title":"Verified partners only","body":"Trade licence, capacity and references are checked before a partner can quote."},
     {"title":"One point of contact","body":"Five vendors, one coordinator, one invoice, one thread."},
     {"title":"Written quotations","body":"No verbal estimates that change on the day. Every line item is documented."},
     {"title":"Corporate ready","body":"Company accounts, approval limits, departmental billing and VAT-ready invoices."},
     {"title":"Money held safely","body":"Payments are collected by the platform and released to partners after delivery."},
     {"title":"Recurring catering","body":"Set up a weekly office lunch once and let it run."}]'::jsonb, 40),
  ('home','corporate','split','Built for HR and admin teams',
   'Stop chasing five caterers on WhatsApp. Submit one requirement, approve one proposal, receive one invoice.',
   null,'See corporate solutions','/corporate','[]'::jsonb, 50),
  ('home','wedding','split','From holud to reception, handled',
   'Catering, decoration, photography, sound and venue combined into a single plan with a single coordinator.',
   null,'Plan a wedding','/events/wedding','[]'::jsonb, 60),
  ('home','final_cta','cta','Tell us about your event',
   'Share your requirement and our team will come back with matched partners and comparable quotations.',
   null,'Plan an Event','/plan','[]'::jsonb, 90)
on conflict (page_slug, key) do update set
  heading = excluded.heading, subheading = excluded.subheading,
  items = excluded.items, cta_label = excluded.cta_label, cta_href = excluded.cta_href;

insert into faqs (question, answer, audience, topic, sort_order) values
  ('Does it cost anything to submit a request?',
   'No. Submitting a requirement is free and non-binding. You only commit when you accept a proposal.','customer','pricing',10),
  ('How quickly will I receive quotations?',
   'Most requests receive their first quotations within 24–48 hours. Large multi-vendor events can take a little longer because we coordinate several partners.','customer','process',20),
  ('How do you verify partners?',
   'We check business registration and trade licence, confirm kitchen or operating capacity, review past work and collect client references. Partners who fail verification cannot quote.','customer','trust',30),
  ('Can I talk to the partner directly?',
   'Yes, through the platform. We keep the conversation on one thread so quotations, changes and commitments stay documented for both sides.','customer','process',40),
  ('What payment methods do you accept?',
   'Card, mobile financial services and bank transfer through our payment gateway. Corporate accounts can also be invoiced on agreed terms.','customer','payments',50),
  ('What happens if I need to cancel?',
   'Each booking carries a published cancellation policy with refund tiers based on how far ahead you cancel. You see the exact policy before you accept a proposal.','customer','payments',60),
  ('Do you cover areas outside Dhaka?',
   'We are live in Dhaka today. Other districts are opening progressively — tell us your location and we will confirm whether we can cover it.','customer','coverage',70),
  ('What does it cost to join as a partner?',
   'There is no joining fee. We earn a commission on completed bookings, and the rate is agreed with you in writing before you start.','partner','pricing',100),
  ('How do I get paid?',
   'The platform collects from the customer. After the event is delivered and confirmed, your payout is approved and settled to your bank or MFS account with a statement.','partner','payments',110),
  ('Do I have to accept every request?',
   'No. You see the brief and decide whether to quote. Declining is one click and does not penalise you, though response rate does affect matching.','partner','process',120),
  ('What does the partner dashboard give me?',
   'One place for incoming requests, quotations, your calendar, bookings, customer history, earnings, payouts, invoices and reviews — replacing scattered WhatsApp threads and spreadsheets.','partner','product',130)
on conflict do nothing;

insert into testimonials (author_name, author_title, company, quote, rating, event_type, is_published, sort_order) values
  ('Nusrat Jahan','Head of Administration','A national FMCG distributor',
   'We used to call four caterers for every town hall. Now one brief goes out and we get comparable written quotations the same week.',5,'Corporate',true,10),
  ('Tanvir Ahmed','Operations Manager','A Gulshan-based software firm',
   'Weekly office lunch for 60 people used to be a recurring headache. It now runs on a standing arrangement and a single monthly invoice.',5,'Corporate',true,20),
  ('Farhana & Rezaul','','Wedding in Uttara',
   'Catering, decoration and photography came back as one proposal with one total. Having a single coordinator on the day was worth it by itself.',5,'Wedding',true,30)
on conflict do nothing;
