-- Explicitly cast string literals to room_status enum in trigger.
-- PostgreSQL cannot implicitly cast text to enum inside CASE expressions.

create or replace function update_room_player_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.rooms
    set current_players = current_players + 1,
        status = case when current_players + 1 >= max_players then 'full'::room_status else 'open'::room_status end,
        updated_at = now()
    where id = NEW.room_id;
  elsif TG_OP = 'DELETE' then
    update public.rooms
    set current_players = current_players - 1,
        status = 'open'::room_status,
        updated_at = now()
    where id = OLD.room_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;
