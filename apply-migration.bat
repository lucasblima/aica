@echo off
set SUPABASE_ACCESS_TOKEN=sbp_4581d0088afc8634bf3726b7196dfd86a6c08b81
cd /d C:\Users\lucas\repos\Aica_frontend\Aica_frontend
echo Linking project...
call npx supabase link --project-ref uzywajqzbdbrfammshdg
echo.
echo Applying migrations to staging...
call npx supabase db push
echo Done!
