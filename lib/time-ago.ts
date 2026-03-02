export function formatTimeAgo(value: string | null | undefined): string {
  if (!value) return "Data de publicação não informada";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data de publicação não informada";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 1) return "Publicado agora";
  if (diffMinutes < 60) return `Publicado há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Publicado há ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `Publicado há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `Publicado há ${diffMonths} mês${diffMonths > 1 ? "es" : ""}`;

  const diffYears = Math.floor(diffMonths / 12);
  return `Publicado há ${diffYears} ano${diffYears > 1 ? "s" : ""}`;
}
