-- 1. Create authenticator and anonymous roles
CREATE ROLE authenticator WITH NOINHERIT LOGIN PASSWORD 'my-secret-authenticator-password';
CREATE ROLE anon NOLOGIN;

-- 2. Establish relationship (authenticator can assume the identity of anon)
GRANT anon TO authenticator;

-- 3. Grant schema permissions to the anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO anon;

-- 4. Set up default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
