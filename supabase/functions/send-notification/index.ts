import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { tokens, title, body, data } = await req.json();

  const messages = tokens.map((token: string) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify(await response.json()), {
    headers: { 'Content-Type': 'application/json' },
  });
});
