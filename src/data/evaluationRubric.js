export const evaluationRubric = [
  {
    id: 'c4',
    criterion: 'Project Logo',
    resourceCriterionId: 'c4',
    subcriteria: [
      {
        id: 'logo_relevance_identity',
        label: 'Relevance and Identity',
        guide: "Effectively represents the project's purpose, concept, and identity.",
      },
      {
        id: 'logo_creativity_originality',
        label: 'Creativity and Originality',
        guide: 'Demonstrates uniqueness, creativity, and a distinctive visual identity.',
      },
      {
        id: 'logo_visual_appeal_clarity',
        label: 'Visual Appeal and Clarity',
        guide: 'Uses appropriate colors, typography, and visual elements to create an attractive, clear, and recognizable logo.',
      },
    ],
  },
  {
    id: 'c3',
    criterion: 'Project Poster',
    resourceCriterionId: 'c3',
    subcriteria: [
      {
        id: 'poster_content_relevance',
        label: 'Content and Relevance',
        guide: "Clearly communicates the project's problem, solution, key features, and value proposition.",
      },
      {
        id: 'poster_visual_design_organization',
        label: 'Visual Design and Organization',
        guide: 'Demonstrates effective use of layout, graphics, colors, and typography, with information presented in a logical and organized manner.',
      },
      {
        id: 'poster_clarity_communication',
        label: 'Clarity and Communication',
        guide: "Presents information in a clear, readable, and engaging way that effectively captures the audience's attention.",
      },
    ],
  },
  {
    id: 'c2',
    criterion: 'Video Pitch',
    resourceCriterionId: 'c2',
    subcriteria: [
      {
        id: 'video_content_message',
        label: 'Content and Message',
        guide: 'Clearly and effectively communicates the problem, proposed solution, key features, and value proposition of the project.',
      },
      {
        id: 'video_presentation_engagement',
        label: 'Presentation and Engagement',
        guide: 'Demonstrates effective storytelling, creativity, confidence, and the ability to engage the audience.',
      },
      {
        id: 'video_production_quality',
        label: 'Production Quality',
        guide: 'Demonstrates appropriate audio, video, editing, and overall presentation quality.',
      },
    ],
  },
];

export const evaluationSubcriteria = evaluationRubric.flatMap((category) =>
  category.subcriteria.map((subcriterion) => ({
    ...subcriterion,
    categoryId: category.id,
    criterion: category.criterion,
    resourceCriterionId: category.resourceCriterionId,
  }))
);
