-- Ensure users table exists and has birth_date column
DO $$
BEGIN
    -- Check if users table exists in public schema
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Create users table if it doesn't exist (mirroring profiles)
        CREATE TABLE public.users (
            id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
            full_name text,
            avatar_url text,
            birth_date date,
            updated_at timestamp with time zone
        );
        
        -- Enable RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own profile" ON public.users
            FOR SELECT USING (auth.uid() = id);
            
        CREATE POLICY "Users can update their own profile" ON public.users
            FOR UPDATE USING (auth.uid() = id);
            
        CREATE POLICY "Users can insert their own profile" ON public.users
            FOR INSERT WITH CHECK (auth.uid() = id);
    ELSE
        -- If table exists, just add the column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'birth_date') THEN
            ALTER TABLE public.users ADD COLUMN birth_date date;
        END IF;
    END IF;
END $$;
