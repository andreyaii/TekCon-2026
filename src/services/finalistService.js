import { request } from '../config/apiConfig.js';

const finalistFields = ['groupCode', 'projectName', 'description', 'category', 'adviser'];

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

export async function getFinalists() {
  const response = await request('getFinalists');
  if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
    throw new Error('The finalist response is invalid.');
  }

  return {
    pitchPerfect: validateFinalists(response.data.pitchPerfect, 'Pitch Perfect'),
    research: validateFinalists(response.data.research, 'Research Conference'),
  };
}
