// src/usersClient.js
const USERS_URL = (process.env.USERS_URL || '').replace(/\/+$/, '');

// NOTE: httpError is defined in routes.js today.
// We'll pass it in so this module doesn't need to import routes.js (avoids circular deps).
async function userExistsViaUsersService(userid, { httpError } = {}) {
  if (!USERS_URL) return false;

  const url = `${USERS_URL}/api/users/${encodeURIComponent(userid)}`;

  try {
    const resp = await fetch(url, { method: 'GET' });

    if (resp.status === 200) return true;
    if (resp.status === 404) return false;

    const text = await resp.text().catch(() => '');
    console.error('[COSTS] users-service unexpected response:', resp.status, text);

    if (httpError) throw httpError(502, 5007, 'users-service check failed');
    throw new Error('users-service check failed');
  } catch (e) {
    console.error('[COSTS] failed calling users-service:', e.message);

    if (httpError) throw httpError(502, 5008, 'users-service unreachable');
    throw e;
  }
}

module.exports = { userExistsViaUsersService };