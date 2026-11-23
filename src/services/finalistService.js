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
