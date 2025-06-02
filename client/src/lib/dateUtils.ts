/**
 * Format a date to a readable string
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  
  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Calculate time remaining until a future date
 * @param futureDate The future date
 * @returns Formatted time remaining string
 */
export function getTimeRemaining(futureDate: Date | null): string {
  if (!futureDate) return 'N/A';
  
  const now = new Date();
  const diff = futureDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Agora';
  
  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (minutes === 0) {
    return `Em ${seconds} segundo${seconds !== 1 ? 's' : ''}`;
  }
  
  return `Em ${minutes}:${seconds.toString().padStart(2, '0')}`;
}