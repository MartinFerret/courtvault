/**
 * delete-account: deletes the caller's photos, data and auth account (store requirement).
 * Database rows cascade from auth.users; storage objects are removed explicitly.
 */
import { error, json, serve } from '../_shared/http.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  const { user } = await userClient(req);
  const admin = serviceClient();

  // Storage: list and remove everything under the user's folder (paged).
  let removed = 0;
  for (;;) {
    const { data: files, error: listError } = await admin.storage
      .from('card-photos')
      .list(user.id, { limit: 100 });
    if (listError) return error(listError.message, 500);
    if (!files || files.length === 0) break;
    const paths = files.map((f) => `${user.id}/${f.name}`);
    const { error: removeError } = await admin.storage.from('card-photos').remove(paths);
    if (removeError) return error(removeError.message, 500);
    removed += paths.length;
    if (files.length < 100) break;
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return error(deleteError.message, 500);

  console.log(
    JSON.stringify({ action: 'delete-account', userId: user.id, photosRemoved: removed }),
  );
  return json({ ok: true, photosRemoved: removed });
});
