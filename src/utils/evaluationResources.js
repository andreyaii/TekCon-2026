import { getSafeResourceUrl } from './resourceUrl.js';

const resourceByCriterion = {
  c2: (project) => [project?.pitchVideoLink, project?.pitchVideoUrl],
  c3: (project) => [project?.documentationLink, project?.posterLink],
  c4: (project) => [project?.thumbnail, project?.imageUrl],
};

export function hasCriterionSubmission(project, criterionId) {
  const getResources = resourceByCriterion[criterionId];
  return Boolean(getResources && getResources(project).some((resource) => getSafeResourceUrl(resource)));
}
