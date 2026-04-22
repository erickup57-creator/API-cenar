export function Equals(a, b) {
  if(!a || !b) return false;
  return a.toString() === b.toString();
}