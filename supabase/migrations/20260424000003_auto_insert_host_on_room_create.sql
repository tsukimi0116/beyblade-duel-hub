-- Fix host not appearing in participant list.
-- Move host insertion from client to a server-side trigger so it's reliable.
-- Also fix current_players default: was 1 (hardcoded), now 0 so the
-- participant trigger correctly counts from zero.

alter table public.rooms alter column current_players set default 0;

create or replace function public.handle_new_room()
returns trigger as $$
begin
  insert into public.room_participants (room_id, user_id)
  values (new.id, new.host_id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_room_created
  after insert on public.rooms
  for each row execute procedure public.handle_new_room();
