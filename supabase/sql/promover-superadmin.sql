-- Rode UMA vez no SQL Editor do Supabase (roda como dono do banco,
-- então passa pela guarda). Troque o e-mail. Nunca exponha isso no app.
update public.profiles
   set papel = 'SUPERADMIN', verificado = true
 where id = (select id from auth.users where email = 'SEU_EMAIL@unifei.edu.br');
