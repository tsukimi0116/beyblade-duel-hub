-- Read username and city from signUp metadata instead of deriving from email.
-- Avoids relying on a post-signUp profile UPDATE which fails under RLS
-- when email confirmation is enabled (no session at that point).

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'city'
  );
  return new;
end;
$$ language plpgsql security definer;
