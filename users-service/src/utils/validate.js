'use strict';

/*   Check that a value is a finite number */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/*   Parse a date safely; returns Date or null */
function parseDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d;
}

/*   Ensure non-empty string */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/*   Convert to trimmed string (safe) */
function asTrimmedString(value) {
  return String(value || '').trim();
}

module.exports = {
  isFiniteNumber,
  parseDate,
  isNonEmptyString,
  asTrimmedString
};
