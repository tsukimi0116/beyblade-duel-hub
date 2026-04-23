# Supabase Schema

貼入 Supabase → SQL Editor → 點 Run

```sql
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null unique,
  avatar_url text,
  city text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create type battle_type as enum ('free_for_all', 'one_vs_one', 'team');
create type room_status as enum ('open', 'full', 'in_progress', 'ended', 'cancelled');

create table public.rooms (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  battle_type battle_type not null default 'free_for_all',
  scheduled_at timestamptz not null,
  location_text text not null,
  location_url text,
  max_players int not null default 4,
  current_players int not null default 1,
  rules text,
  is_private boolean not null default false,
  password_hash text,
  status room_status not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint max_players_range check (max_players between 2 and 32),
  constraint current_players_valid check (current_players <= max_players)
);

create table public.room_participants (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

create table public.push_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null unique,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

alter table public.rooms enable row level security;
create policy "Public rooms are viewable by everyone" on public.rooms for select using (is_private = false or host_id = auth.uid());
create policy "Authenticated users can create rooms" on public.rooms for insert with check (auth.uid() = host_id);
create policy "Host can update own room" on public.rooms for update using (auth.uid() = host_id);
create policy "Host can delete own room" on public.rooms for delete using (auth.uid() = host_id);

alter table public.room_participants enable row level security;
create policy "Participants viewable by everyone" on public.room_participants for select using (true);
create policy "Users can join rooms" on public.room_participants for insert with check (auth.uid() = user_id);
create policy "Users can leave rooms" on public.room_participants for delete using (auth.uid() = user_id);

alter table public.push_tokens enable row level security;
create policy "Users manage own tokens" on public.push_tokens for all using (auth.uid() = user_id);

create or replace function update_room_player_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.rooms
    set current_players = current_players + 1,
        status = case when current_players + 1 >= max_players then 'full' else 'open' end,
        updated_at = now()
    where id = NEW.room_id;
  elsif TG_OP = 'DELETE' then
    update public.rooms
    set current_players = current_players - 1,
        status = 'open',
        updated_at = now()
    where id = OLD.room_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_participant_change
  after insert or delete on public.room_participants
  for each row execute procedure update_room_player_count();
```
