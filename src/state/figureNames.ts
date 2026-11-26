/** Keep the plain type name until it is already in use; fill the next free suffix. */
export function uniqueFigureName(base: string, existingNames: string[]): string {
  const used = new Set(existingNames.map((name) => name.trim()));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base} ${suffix}`)) suffix++;
  return `${base} ${suffix}`;
}
