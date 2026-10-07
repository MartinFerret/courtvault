-- Optional web scanner (webcam or uploaded photo, OCR in the browser). Off until its accuracy
-- on real card-back photos has been measured with the /scan-bench page and judged good enough.
insert into public.app_settings (key, value, description) values
  ('web_scanner', jsonb_build_object('enabled', false),
   'Web app: show the webcam / photo scanner (Tesseract.js). Enable once the bench hit rate is acceptable.');

create or replace function public.web_scanner_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value->>'enabled')::boolean from public.app_settings where key = 'web_scanner'), false);
$$;
grant execute on function public.web_scanner_enabled() to anon, authenticated;
