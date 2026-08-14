-- The one Story the public URL renders. It arrives in a migration because there is no other way
-- for it to exist: nothing in this release writes a Story, and CAN-24 A signed-in and a
-- signed-out path is what brings the accounts that eventually will.
--
-- The id is fixed rather than generated so that re-running this against a database that already
-- has it is a no-op, and so that a test can name the row it expects.
--
-- `owner_id` is a placeholder, not a user id. Nobody has an account yet, so there is no id to
-- use; CAN-24 A signed-in and a signed-out path is where owners become real, and it can
-- reassign this row or leave it as the
-- operator's. What matters here is only that it is some owner and that the row is public, which
-- together are what make the policy's two branches both reachable.
INSERT INTO "story" ("id", "title", "owner_id", "visibility")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Rose',
  'founding-operator',
  'public'
)
ON CONFLICT ("id") DO NOTHING;
