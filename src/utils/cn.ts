/**
 * Combina clases de Tailwind de forma condicional.
 * Uso: cn('base-class', condition && 'conditional-class', { 'object-class': bool })
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
