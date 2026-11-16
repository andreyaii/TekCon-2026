export function getSafeResourceUrl(resource) {
  if (typeof resource !== 'string') return null;

  const value = resource.trim();
  if (!value) return null;

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  const looksLikeWebHost = /^(?:www\.)?[a-z\d](?:[a-z\d.-]*[a-z\d])?\.[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(value);
  if (!hasScheme && !looksLikeWebHost) return null;

  try {
    const parsed = new URL(hasScheme ? value : `https://${value}`);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}
