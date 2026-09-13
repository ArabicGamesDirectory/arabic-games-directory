-- Backfill studios.type for rows auto-created with the invalid value 'unspecified'.
--
-- Background: SubmitForm's studio auto-submit path used to write type
-- 'unspecified', which is outside individual|team|studio. Those rows were
-- invisible to the homepage type filter and rendered the raw string as a badge.
-- The code path is fixed and /api/submit now rejects any other value; this
-- cleans up the 66 rows already in the table.
--
-- Classification is by name evidence: personal names -> individual; "team",
-- several named people, or a student group -> team; company-style names
-- (Studio, Soft, Games, Ltd, LLC, Media...) -> studio. Genuinely ambiguous
-- names default to 'studio' (the form default) and are marked LOW CONFIDENCE.
--
-- Every UPDATE is guarded by "and type = 'unspecified'", so this is safe to
-- re-run and will never overwrite a row you've already corrected by hand.
-- RUN: after deploying the code (/api/approve-studio must already coerce
-- invalid types, or approving an old queued studio fails once the CHECK
-- constraint below exists). Run the whole file in the Supabase SQL editor.

begin;

-- ── individual (18) ──────────────────────────────────────────────────
update studios set type = 'individual'
 where type = 'unspecified'
   and id in (
     '504278af-38c1-40d2-a0ae-109ee7f835c5',  -- Abdulmajeed Alhajri
     'f1c873b9-2a36-4998-9a39-741d2127aea5',  -- Ahmed Abdel Salam
     '3e4c55ab-de20-426a-a6c7-a5b82dfe1ffa',  -- Ahmed Bouyerdene
     '53c16a77-46e7-4580-b546-9818ccef9169',  -- Ahmed Mohamed Reda
     'abe8c354-73b0-4fc8-b91a-c26ee712211b',  -- AmmenSnw   [LOW CONFIDENCE]
     'b4845e0d-9a9c-4cb7-a488-077680148c5d',  -- Dwaib Faisal
     '86db9e20-7a4a-4207-8f32-82a1ae773d01',  -- Ehbgamer   [LOW CONFIDENCE]
     'd1e6854d-19b4-42ce-9118-bdd5a18853ee',  -- Majd Akar
     'ea1347c5-835d-4a46-a24a-3fd52a810d42',  -- Mohammad Hamza
     '02d708c2-0ce1-4f34-942a-83fb3c1f8511',  -- Mohammed Al-Abras
     '2541d179-47a3-415d-8259-dd1b37bc4721',  -- MOHAMMED ALDARWISH
     '8d127dca-8762-4cc8-8f19-b6720b0bdeed',  -- Mohammed Murad
     'e1f57819-03bd-4629-b90b-18f8b57b3c93',  -- Muhammad Al-Asmar
     '845d3e31-f2ac-46a0-acbe-32722102924f',  -- osama deep   [LOW CONFIDENCE]
     'd2509296-f1b0-4fa4-aea5-e0a0d40dfbad',  -- Saeed Abu Salih
     'fec95a3e-19b8-4fd9-b1ad-ddb9cb140cb2',  -- Sameh Oransa
     'ea32d747-e21b-42bc-b7b5-ba1a21fb19b8',  -- Sami Mohammed Hadef
     '3330786f-a66c-4519-b19b-033997fdce41'   -- Wissam Bahnasi
   );

-- ── team (10) ──────────────────────────────────────────────────
update studios set type = 'team'
 where type = 'unspecified'
   and id in (
     'db130491-860c-4de5-8e52-730a39bd2490',  -- arabteam2000
     'e8085ce0-13ae-4b89-a1ee-609c9ce847cd',  -- asad team
     '82b0da07-d936-495f-a697-c1360c9e5419',  -- crazy team
     'ca04fa0e-c83e-4466-a7e9-aec330528f7e',  -- GGI Team
     'e3586654-1773-44a9-b376-cdbd963db6dc',  -- Lion's Den Team
     'aba8fdc8-6e8c-40b7-a4e5-1d7ef3263360',  -- Majd Akar and Hosni Auji
     '5570142c-aab2-4d37-95c6-df0ce3b41d95',  -- saker & hussein
     'ab491da3-5e94-4ca5-9b48-cb57a8002577',  -- Students of the University of Technology
     '09067b4c-c627-4700-a29c-76fd0087f041',  -- Team Urth
     '86d13b86-555c-42b7-a169-17d7d00c28b5'   -- ZigZag Team
   );

-- ── studio (38) ──────────────────────────────────────────────────
update studios set type = 'studio'
 where type = 'unspecified'
   and id in (
     'f51d62e2-7ffa-4846-8907-e0acdab10b07',  -- 2-Digital Production
     '35ff6b78-29a2-438e-a38d-3c23b7a26d0c',  -- Abualamrien Studio
     'a920b1de-08b7-4eb4-9d1f-d39ac41f743d',  -- Arados studios
     '9cefc995-22e9-4a0e-87a5-4ff8d9e4b8e5',  -- Art Intelligence
     'f0d7de70-c21d-46a4-bbc7-9b8c182b41de',  -- BlueGuySoft   [LOW CONFIDENCE]
     'c02fad12-6ebd-4c06-989e-02a63e7b29e8',  -- bullet snail series   [LOW CONFIDENCE]
     '074d8e74-93d5-4882-943f-4771fcd2e202',  -- cosmos sofware
     '80643274-0b91-4824-afbd-ae4d458f26cb',  -- Cwerki Studios
     '80813db1-1aeb-4fc4-ba44-064690d8addb',  -- Cyberation
     'e93d2ecf-a88c-47da-b8de-ac8c75bed155',  -- Digital Game St
     '70c958d3-7d1c-45fe-801f-70c6d256068b',  -- Digital Game Studio
     '5e79d910-447e-45a4-8728-ea89b5884daf',  -- double kick   [LOW CONFIDENCE]
     'ea5bf77a-d8f1-4392-a476-d3d08ae9cc49',  -- Dracowar   [LOW CONFIDENCE]
     'b59ae7ac-63d2-4d6f-a486-146c80c1d175',  -- Fastwares
     'b0c76477-dbbf-44d6-8113-b6216716e9a1',  -- Game Bad   [LOW CONFIDENCE]
     'f6157273-efd0-444a-ba33-61d8c5989ee4',  -- Gamezone
     '646c8552-a467-43c9-8fb8-fe71b774b2ba',  -- golden system sofware
     '25844e65-aad6-4088-862b-7376c8bbd666',  -- Hadeel   [LOW CONFIDENCE]
     '3b298575-0484-49e9-af92-b442ea01c475',  -- I-Friqiya FZ LLC
     'f9f450e9-e8e4-483f-bb4c-ca9085b3f266',  -- INSTEAD   [LOW CONFIDENCE]
     '69d4a789-d9ae-4de6-9748-fb5138fcbb1d',  -- Ishtarsoft
     '917705c7-dfdf-48be-839d-0dec5df4a3f8',  -- Jerfas Studio
     'edf56897-4a3b-4d8a-8bb9-5f49b565adc9',  -- KAY GAMES
     'b90c85a6-08e7-4e2f-9fe8-e72e4021b00b',  -- Mahfouz Games   [LOW CONFIDENCE]
     '0e5d19a6-c526-4bc8-906d-a26bc56cd2a3',  -- Mavrox Games Studio
     'a2105b16-8eff-434c-be8d-028416595537',  -- newgen studio
     '8db8fe45-21fd-4611-b2d1-af37565063a8',  -- OWs Tetra
     'e1bb9cc1-86a3-4105-b7cc-570aa29b5849',  -- PC Lab Media
     '5525bc3c-0f7e-455c-9165-3d3311fdd2cf',  -- PlusSoft Ltd
     '601e1ada-b9a3-4514-95e2-6103a6f4a27e',  -- radical play
     'bf14f9e1-e576-427a-b23b-7190af3197fc',  -- rasam concept
     '8036e88b-2b00-4b3c-b2e8-c716aba8a07a',  -- safirsoft and simasoft
     'a57f11cb-36cc-4296-838e-b02a66eef2e2',  -- SakherTeC
     'b27e4cf9-b107-46c3-b3ca-9c029f51f208',  -- Sakhr Software
     '966451a7-62c9-432f-9672-ac654924a23f',  -- technical 3d
     'cdb03fa8-797f-4a55-a706-977d0e26debc',  -- Tndigit
     '4f119579-a05d-4cc3-8084-c6ba9fbda2e1',  -- W3dtek
     'b3322183-fe5e-49bf-af7e-38b99a8a06cc'   -- Wixel Studios
   );

-- Pending auto-submitted studios queued before the fix still carry 'unspecified'
-- in their payload; approving them would recreate the problem (and, once the
-- constraint below exists, fail). /api/approve-studio also coerces this now,
-- but clean the queue too so the admin diff shows the real value.
update studio_submissions
   set payload = jsonb_set(payload, '{type}', '"studio"')
 where moderation_status = 'pending'
   and coalesce(payload->>'type', '') not in ('individual', 'team', 'studio');

-- Must return 0 before the constraint below can be added.
select count(*) as still_invalid
  from studios
 where type is null or type not in ('individual', 'team', 'studio');

-- Stop this class of bug at the database layer for good. If this line errors,
-- the SELECT above found rows outside the set — inspect those and re-run.
alter table studios
  add constraint studios_type_check
  check (type in ('individual', 'team', 'studio'));

commit;

-- ── Rollback (only if needed) ────────────────────────────────────────────
-- alter table studios drop constraint studios_type_check;
-- update studios set type = 'unspecified' where id in (
--   'f51d62e2-7ffa-4846-8907-e0acdab10b07',
--   '504278af-38c1-40d2-a0ae-109ee7f835c5',
--   '35ff6b78-29a2-438e-a38d-3c23b7a26d0c',
--   'f1c873b9-2a36-4998-9a39-741d2127aea5',
--   '3e4c55ab-de20-426a-a6c7-a5b82dfe1ffa',
--   '53c16a77-46e7-4580-b546-9818ccef9169',
--   'abe8c354-73b0-4fc8-b91a-c26ee712211b',
--   'db130491-860c-4de5-8e52-730a39bd2490',
--   'a920b1de-08b7-4eb4-9d1f-d39ac41f743d',
--   '9cefc995-22e9-4a0e-87a5-4ff8d9e4b8e5',
--   'e8085ce0-13ae-4b89-a1ee-609c9ce847cd',
--   'f0d7de70-c21d-46a4-bbc7-9b8c182b41de',
--   'c02fad12-6ebd-4c06-989e-02a63e7b29e8',
--   '074d8e74-93d5-4882-943f-4771fcd2e202',
--   '82b0da07-d936-495f-a697-c1360c9e5419',
--   '80643274-0b91-4824-afbd-ae4d458f26cb',
--   '80813db1-1aeb-4fc4-ba44-064690d8addb',
--   'e93d2ecf-a88c-47da-b8de-ac8c75bed155',
--   '70c958d3-7d1c-45fe-801f-70c6d256068b',
--   '5e79d910-447e-45a4-8728-ea89b5884daf',
--   'ea5bf77a-d8f1-4392-a476-d3d08ae9cc49',
--   'b4845e0d-9a9c-4cb7-a488-077680148c5d',
--   '86db9e20-7a4a-4207-8f32-82a1ae773d01',
--   'b59ae7ac-63d2-4d6f-a486-146c80c1d175',
--   'b0c76477-dbbf-44d6-8113-b6216716e9a1',
--   'f6157273-efd0-444a-ba33-61d8c5989ee4',
--   'ca04fa0e-c83e-4466-a7e9-aec330528f7e',
--   '646c8552-a467-43c9-8fb8-fe71b774b2ba',
--   '25844e65-aad6-4088-862b-7376c8bbd666',
--   '3b298575-0484-49e9-af92-b442ea01c475',
--   'f9f450e9-e8e4-483f-bb4c-ca9085b3f266',
--   '69d4a789-d9ae-4de6-9748-fb5138fcbb1d',
--   '917705c7-dfdf-48be-839d-0dec5df4a3f8',
--   'edf56897-4a3b-4d8a-8bb9-5f49b565adc9',
--   'e3586654-1773-44a9-b376-cdbd963db6dc',
--   'b90c85a6-08e7-4e2f-9fe8-e72e4021b00b',
--   'd1e6854d-19b4-42ce-9118-bdd5a18853ee',
--   'aba8fdc8-6e8c-40b7-a4e5-1d7ef3263360',
--   '0e5d19a6-c526-4bc8-906d-a26bc56cd2a3',
--   'ea1347c5-835d-4a46-a24a-3fd52a810d42',
--   '02d708c2-0ce1-4f34-942a-83fb3c1f8511',
--   '2541d179-47a3-415d-8259-dd1b37bc4721',
--   '8d127dca-8762-4cc8-8f19-b6720b0bdeed',
--   'e1f57819-03bd-4629-b90b-18f8b57b3c93',
--   'a2105b16-8eff-434c-be8d-028416595537',
--   '845d3e31-f2ac-46a0-acbe-32722102924f',
--   '8db8fe45-21fd-4611-b2d1-af37565063a8',
--   'e1bb9cc1-86a3-4105-b7cc-570aa29b5849',
--   '5525bc3c-0f7e-455c-9165-3d3311fdd2cf',
--   '601e1ada-b9a3-4514-95e2-6103a6f4a27e',
--   'bf14f9e1-e576-427a-b23b-7190af3197fc',
--   'd2509296-f1b0-4fa4-aea5-e0a0d40dfbad',
--   '8036e88b-2b00-4b3c-b2e8-c716aba8a07a',
--   '5570142c-aab2-4d37-95c6-df0ce3b41d95',
--   'a57f11cb-36cc-4296-838e-b02a66eef2e2',
--   'b27e4cf9-b107-46c3-b3ca-9c029f51f208',
--   'fec95a3e-19b8-4fd9-b1ad-ddb9cb140cb2',
--   'ea32d747-e21b-42bc-b7b5-ba1a21fb19b8',
--   'ab491da3-5e94-4ca5-9b48-cb57a8002577',
--   '09067b4c-c627-4700-a29c-76fd0087f041',
--   '966451a7-62c9-432f-9672-ac654924a23f',
--   'cdb03fa8-797f-4a55-a706-977d0e26debc',
--   '4f119579-a05d-4cc3-8084-c6ba9fbda2e1',
--   '3330786f-a66c-4519-b19b-033997fdce41',
--   'b3322183-fe5e-49bf-af7e-38b99a8a06cc',
--   '86d13b86-555c-42b7-a169-17d7d00c28b5'
-- );
