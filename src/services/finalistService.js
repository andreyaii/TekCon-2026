import { request } from '../config/apiConfig.js';

const finalistFields = ['groupCode', 'projectName', 'description', 'category', 'adviser'];
const publishedFields = ['groupCode', 'projectTitle', 'publication', 'date', 'place', 'paperTitle', 'authors', 'recognition'];

function validateFinalists(finalists, label) {
  if (!Array.isArray(finalists)) {
    throw new Error(`The ${label} finalist response is invalid.`);
  }

  return finalists.map((finalist) => {
    if (!finalist || finalistFields.some((field) => typeof finalist[field] !== 'string')) {
      throw new Error(`The ${label} finalist response is invalid.`);
    }
    return finalist;
  });
}

export function validatePublishedProjects(projects) {
  if (!Array.isArray(projects)) return [];
  return projects.map((item) => {
    const obj = {};
    publishedFields.forEach((field) => {
      obj[field] = String(item?.[field] || '').trim();
    });
    obj.projectName = obj.projectTitle || '';
    return obj;
  });
}

export async function getPublishedProjects() {
  try {
    const response = await request('getPublishedProjects');
    if (response?.data && Array.isArray(response.data)) {
      return validatePublishedProjects(response.data);
    }
  } catch {
    // If endpoint is not directly available, check getFinalists
  }
  return [];
}

export async function exportFinalistLogos(category) {
  if (!category) throw new Error('A finalist category is required.');
  const response = await request('exportFinalistLogos', {
    authenticated: true,
    query: { category },
  });

  if (!response.base64 || !response.fileName || !response.exportedCount) {
    throw new Error('The server returned an invalid finalist logo archive.');
  }

  const binary = atob(response.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: response.mimeType || 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = response.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return response.exportedCount;
}

export async function getFinalists() {
  const response = await request('getFinalists');
  if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
    throw new Error('The finalist response is invalid.');
  }

  const result = {
    pitchPerfect: validateFinalists(response.data.pitchPerfect, 'Pitch Perfect'),
    research: validateFinalists(response.data.research, 'Research Conference'),
    psc: response.data.psc && Array.isArray(response.data.psc)
      ? validateFinalists(response.data.psc, 'PSC')
      : [],
  };

  if (response.data.publishedProjects && Array.isArray(response.data.publishedProjects)) {
    result.publishedProjects = validatePublishedProjects(response.data.publishedProjects);
  }

  return result;
}
