begin;
select plan(3);

-- Free user: 24h change is visible, gains are hidden by the view itself.
select tests.authenticate_as('00000000-0000-0000-0000-000000000002');
select ok((select count(*) from public.collection_items_detailed) = 1, 'other user sees their item');
select is((select gain_cents from public.collection_items_detailed limit 1), null, 'free user gets no gain');
select tests.clear_auth();
update public.profiles set is_premium = true where id = '00000000-0000-0000-0000-000000000002';
select tests.authenticate_as('00000000-0000-0000-0000-000000000002');
select isnt((select gain_cents from public.collection_items_detailed where purchase_cents is not null limit 1), null, 'premium user gets the gain');

select * from finish();
rollback;
