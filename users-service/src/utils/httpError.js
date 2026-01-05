'use strict';

/*   Small helper to create consistent errors (status + {id,message}) */
function httpError(status, id, message) {
  const err = new Error(message);
  err.status = status;
  err.id = id;
  return err;
}

module.exports = { httpError };
