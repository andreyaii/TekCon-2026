import { getSafeResourceUrl } from './resourceUrl.js';

export function getProjectLogoUrl(project) {
  const resource = project?.imageUrl || project?.thumbnail;
  const safeUrl = getSafeResourceUrl(resource);
  if (!safeUrl) return '';

  try {
    const url = new URL(safeUrl);
    if (url.hostname.toLowerCase() === 'drive.google.com') {
      if (url.pathname === '/thumbnail' && url.searchParams.has('id')) {
        return url.href;
      }

      const fileId = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/)?.[1]
        || url.searchParams.get('id');
      if (!fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) return '';

      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`;
    }

    return url.href;
  } catch {
    return '';
  }
}
