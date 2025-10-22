/**
 * Date utility functions for formatting and validation
 */

export function formatDateYMD(d) {
  if (!d || !(d instanceof Date)) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDatePretty(d) {
  if (!d || !(d instanceof Date)) return "Select your date of birth";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function calcAge(d) {
  if (!d || !(d instanceof Date)) return 0;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}