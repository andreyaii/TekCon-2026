import { evaluationCriteria } from '../data/settings.js';
import { evaluationSubcriteria } from '../data/evaluationRubric.js';

const scoreIsValid = (score) => Number.isFinite(score) && score >= 1 && score <= 5;
const normalizeGroupId = (value) => String(value || '').trim().replace(/\s+/g, '').toUpperCase();

export function summarizeRatings(evaluations, projects, filters = {}) {
  const { source = 'both', categoryId = 'all', groupId = 'all' } = filters;
  const categories = evaluationCriteria.filter((criterion) => categoryId === 'all' || criterion.id === categoryId);
  const subcriteria = evaluationSubcriteria.filter((criterion) => (
    categoryId === 'all' || criterion.categoryId === categoryId
  ));
  const projectByGroup = new Map(projects.map((project) => [
    normalizeGroupId(project.groupId),
    String(project.title || project.group?.groupName || project.groupId || '').trim(),
  ]));
  const filtered = evaluations.filter((evaluation) => (
    (source === 'both' || evaluation.evaluatorType === source)
    && (groupId === 'all' || normalizeGroupId(evaluation.evaluatedGroupId) === normalizeGroupId(groupId))
  ));
  const groupIds = [...new Set(filtered.map((evaluation) => evaluation.evaluatedGroupId))];
  const summarizeCategory = (criterion) => {
    const groups = groupIds.map((id) => {
      const scores = filtered
        .filter((evaluation) => normalizeGroupId(evaluation.evaluatedGroupId) === normalizeGroupId(id))
        .map((evaluation) => evaluation.ratings[criterion.id])
        .filter(scoreIsValid);
      if (!scores.length) return null;
      return {
        groupId: id,
        groupName: projectByGroup.get(normalizeGroupId(id)) || id,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        count: scores.length,
      };
    }).filter(Boolean).sort((a, b) => b.average - a.average || a.groupName.localeCompare(b.groupName));
    const bestScore = groups[0]?.average;
    return {
      criterion,
      groups,
      leaders: groups.filter((group) => group.average === bestScore),
    };
  };
  const overallGroups = groupIds.map((id) => {
    const groupEvaluations = filtered.filter((evaluation) => normalizeGroupId(evaluation.evaluatedGroupId) === normalizeGroupId(id));
    const categoryAverages = categories.map((criterion) => {
      const scores = groupEvaluations
        .map((evaluation) => evaluation.ratings[criterion.id])
        .filter(scoreIsValid);
      return {
        criterionId: criterion.id,
        average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
        count: scores.length,
      };
    });
    const subcriterionAverages = subcriteria.map((criterion) => {
      const scores = groupEvaluations
        .map((evaluation) => evaluation.subcriteriaRatings?.[criterion.id])
        .filter(scoreIsValid);
      return {
        criterionId: criterion.id,
        average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
        count: scores.length,
      };
    });
    const evaluationScores = groupEvaluations.map((evaluation) => {
      const scores = categories
        .map((criterion) => evaluation.ratings[criterion.id])
        .filter(scoreIsValid);
      return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    }).filter((score) => score !== null);
    if (!evaluationScores.length) return null;
    return {
      groupId: id,
      groupName: projectByGroup.get(normalizeGroupId(id)) || id,
      categories: categoryAverages,
      subcriteria: subcriterionAverages,
      average: evaluationScores.reduce((sum, score) => sum + score, 0) / evaluationScores.length,
      count: groupEvaluations.length,
    };
  }).filter(Boolean).sort((a, b) => b.average - a.average || a.groupName.localeCompare(b.groupName));

  const categoryAverages = categories.map((criterion) => {
    const scores = filtered
      .map((evaluation) => evaluation.ratings[criterion.id])
      .filter(scoreIsValid);
    return {
      criterion,
      average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
      count: scores.length,
    };
  });
  const subcriterionSummaries = subcriteria.map((criterion) => {
    const evaluationsWithScore = filtered.filter((evaluation) =>
      scoreIsValid(evaluation.subcriteriaRatings?.[criterion.id])
    );
    const scores = evaluationsWithScore.map((evaluation) =>
      evaluation.subcriteriaRatings[criterion.id]
    );
    const groups = groupIds.map((id) => {
      const groupScores = evaluationsWithScore
        .filter((evaluation) => normalizeGroupId(evaluation.evaluatedGroupId) === normalizeGroupId(id))
        .map((evaluation) => evaluation.subcriteriaRatings[criterion.id]);
      if (!groupScores.length) return null;
      return {
        groupId: id,
        groupName: projectByGroup.get(normalizeGroupId(id)) || id,
        average: groupScores.reduce((sum, score) => sum + score, 0) / groupScores.length,
        count: groupScores.length,
      };
    }).filter(Boolean).sort((a, b) => b.average - a.average || a.groupName.localeCompare(b.groupName));
    return {
      ...criterion,
      average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
      count: scores.length,
      groups,
    };
  });
  const ratedSubcriteria = subcriterionSummaries.filter((criterion) => criterion.average !== null);
  const highestSubcriterionScore = Math.max(...ratedSubcriteria.map((criterion) => criterion.average));
  const lowestSubcriterionScore = Math.min(...ratedSubcriteria.map((criterion) => criterion.average));

  return {
    evaluationCount: filtered.length,
    categories: categories.map(summarizeCategory),
    categoryAverages,
    subcriteria: subcriterionSummaries,
    strongestSubcriteria: ratedSubcriteria.filter((criterion) => criterion.average === highestSubcriterionScore),
    weakestSubcriteria: ratedSubcriteria.filter((criterion) => criterion.average === lowestSubcriterionScore),
    overallGroups,
  };
}

export function sortOverallGroups(groups, sortBy = 'average') {
  return [...groups].sort((a, b) => {
    if (sortBy === 'evaluations') {
      return b.count - a.count || b.average - a.average || a.groupName.localeCompare(b.groupName);
    }
    return b.average - a.average || a.groupName.localeCompare(b.groupName);
  });
}
