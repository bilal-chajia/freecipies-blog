export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${mins} min`;
}

export function getDifficultyLabel(level: number): string {
  const labels = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
  return labels[Math.min(level - 1, 4)] || 'Medium';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getImageUrl(filename: string, baseUrl: string = ''): string {
  if (filename.startsWith('http')) return filename;
  return `${baseUrl}/images/${filename}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

