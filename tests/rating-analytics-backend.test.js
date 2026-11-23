import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
const validSubcriteriaRatings = {
  logo_relevance_identity: 2,
  logo_creativity_originality: 2,
  logo_visual_appeal_clarity: 2,
  poster_content_relevance: 3,
  poster_visual_design_organization: 3,
  poster_clarity_communication: 3,
  video_content_message: 4,
  video_presentation_engagement: 4,
  video_production_quality: 4,
};

function createBackend(role, facultyRows = [['FAC-2', 'Faculty Evaluator', 'Adviser']]) {
  const evaluations = [
    ['EV-1', 'STUDENT-1', 'GROUP-1', 4, 3, 4, '', '2026-11-12 10:00:00'],
    ['EV-2', 'FAC-2', 'GROUP-2', 3, 4, 5, '', '2026-11-12 11:00:00'],
    ['EV-3', 'ADMIN-1', 'GROUP-3', 4, 4, 3, '', '2026-11-12 12:00:00'],
  ];
  const sheets = {
    Evaluations: [
      ['EvaluationID', 'StudentID', 'GroupCode', 'PitchVideoRating', 'PosterRating', 'LogoRating', 'Comment', 'SubmittedAt'],
      ...evaluations,
    ],
    Students: [['StudentID', 'GroupCode'], ['STUDENT-1', 'GROUP-1']],
    Faculty: [['FacultyID', 'FullName', 'Role'], ...facultyRows],
    Groups: [
      ['GroupCode', 'Adviser', 'Description', 'RESEARCH PAPER', 'VIDEO', 'POSTER', 'Thumbnail', 'Status'],
      ['GROUP-1', 'Other Faculty', 'Original description', 'https://example.com/paper.pdf', 'https://example.com/pitch.mp4', 'https://example.com/poster.pdf', 'https://example.com/logo.png', 'Posted'],
      ['GROUP-2', 'Other Faculty', 'Group two description', 'https://example.com/paper.pdf', 'https://example.com/pitch.mp4', 'https://example.com/poster.pdf', 'https://example.com/logo.png', 'Posted'],
      ['GROUP-3', 'Other Faculty', 'Group three description', 'https://example.com/paper.pdf', 'https://example.com/pitch.mp4', 'https://example.com/poster.pdf', 'https://example.com/logo.png', 'Posted'],
      ['GROUP-4', 'Other Faculty', 'Group four description', 'https://example.com/paper.pdf', 'https://example.com/pitch.mp4', 'https://example.com/poster.pdf', 'https://example.com/logo.png', 'Posted'],
    ],
    GroupOverrides: [
      ['GroupCode', 'DescriptionOverride', 'UpdatedAt'],
    ],
    EvaluationDetails: [
      ['EvaluationID', 'Criterion', 'Subcriterion', 'Rating'],
    ],
    PitchPerfectFinalist: [
      ['GROUP CODE', 'PROJECT NAME', 'DESCRIPTION', 'CATEGORY', 'ADVISER'],
      ['PITCH-1', 'Pitch Project', 'Pitch description', 'Innovation', 'Adviser One'],
    ],
    ResearchFinalist: [
      ['NO.', 'ADVISER', 'CATEGORY', 'DESCRIPTION', 'PROJECT NAME', 'GROUP CODE'],
      [9, 'Adviser Two', 'Research', 'Research description', 'Research Project', 'RES-2'],
    ],
    'PSC Finalist': [
      ['', '', ''],
      ['GROUP CODE', 'PROJECT TITLE', 'DESCRIPTION'],
      ['PSC-1', 'PSC Project', 'PSC description'],
    ],
  };
  const cache = new Map([[
    'faculty-session:test-token',
    JSON.stringify({ facultyId: 'ADMIN-1', role }),
  ], [
    'student-session:test-student-token',
    JSON.stringify({ studentId: 'STUDENT-1' }),
  ]]);
  const driveFolders = new Map();
  const driveFolderScans = new Map();
  let detailAppendCount = 0;
  let failDetailAppendAt = 0;
  const spreadsheet = {
    getSheetByName(name) {
      const values = sheets[name];
      if (!values) return null;
      return {
        getLastColumn: () => values[0].length,
        getLastRow: () => values.length,
        getRange(row, column, rowCount = 1, columnCount = values[0].length) {
          const selectedValues = values
            .slice(row - 1, row - 1 + rowCount)
            .map((valueRow) => valueRow.slice(column - 1, column - 1 + columnCount));
          return {
            getDisplayValues: () => selectedValues,
            getRichTextValues: () => selectedValues.map((valueRow) => valueRow.map(() => null)),
            getFormulas: () => selectedValues.map((valueRow) => valueRow.map(() => '')),
            setValue(value) {
              values[row - 1][column - 1] = value;
            },
          };
        },
        getDataRange: () => ({
          getValues: () => values.map((row) => [...row]),
          getDisplayValues: () => values.map((row) => row.map(String)),
        }),
        appendRow(row) {
          if (name === 'EvaluationDetails') {
            detailAppendCount += 1;
            if (detailAppendCount === failDetailAppendAt) {
              failDetailAppendAt = 0;
              throw new Error('Simulated EvaluationDetails write failure.');
            }
          }
          values.push([...row]);
        },
        deleteRow: (row) => values.splice(row - 1, 1),
      };
    },
  };
  const context = {
    CacheService: {
      getScriptCache: () => ({
        get: (key) => cache.get(key) || null,
        put: (key, value) => cache.set(key, value),
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-sheet' }) },
    SpreadsheetApp: { openById: () => spreadsheet },
    DriveApp: {
      getFileById(id) {
        return {
          isTrashed: () => false,
          getBlob: () => ({
            name: id + '.png',
            setName(name) { this.name = name; return this; },
            getName() { return this.name; },
            getContentType: () => 'image/png',
          }),
        };
      },
      getFolderById(id) {
        driveFolderScans.set(id, (driveFolderScans.get(id) || 0) + 1);
        const files = driveFolders.get(id);
        if (!files) throw new Error('Folder is inaccessible.');
        return {
          getFiles() {
            let index = 0;
            return {
              hasNext: () => index < files.length,
              next: () => {
                const file = files[index++];
                return {
                  getId: () => file.id,
                  getName: () => file.name,
                  getMimeType: () => file.mimeType,
                };
              },
            };
          },
        };
      },
    },
    LockService: {
      getScriptLock: () => ({
        waitLock() {},
        releaseLock() {},
      }),
    },
    Utilities: {
      getUuid: () => 'new-test-student-token',
      formatDate: () => '2026-11-14 09:00:00',
      zip: (blobs, name) => ({
        getBytes: () => [80, 75, 3, 4],
        getName: () => name,
      }),
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
    },
    Logger: { log() {} },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(content) {
        return { content, setMimeType() { return this; } };
      },
    },
  };
  context.sheets = sheets;
  context.driveFolders = driveFolders;
  context.driveFolderScans = driveFolderScans;
  context.failDetailAppendAt = (count) => {
    detailAppendCount = 0;
    failDetailAppendAt = count;
  };
  runInNewContext(script, context);
  return context;
}

test('getFinalists reads the named columns and ignores the Research numbering column', () => {
  const backend = createBackend('Adviser');
  const result = JSON.parse(backend.doGet({ parameter: { action: 'getFinalists' } }).content);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.pitchPerfect, [{
    groupCode: 'PITCH-1',
    projectName: 'Pitch Project',
    description: 'Pitch description',
    category: 'Innovation',
    adviser: 'Adviser One',
  }]);
  assert.deepEqual(result.data.research, [{
    groupCode: 'RES-2',
    projectName: 'Research Project',
    description: 'Research description',
    category: 'Research',
    adviser: 'Adviser Two',
  }]);
  assert.deepEqual(result.data.psc, [{
    groupCode: 'PSC-1',
    projectName: 'PSC Project',
    description: 'PSC description',
    category: '',
    adviser: '',
  }]);
});

test('getFinalists returns empty lists when finalist sheets are unavailable', () => {
  const backend = createBackend('Adviser');
  delete backend.sheets.PitchPerfectFinalist;
  delete backend.sheets.ResearchFinalist;
  delete backend.sheets['PSC Finalist'];
  const result = JSON.parse(backend.doGet({ parameter: { action: 'getFinalists' } }).content);

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { pitchPerfect: [], research: [], psc: [] });
});

test('exportFinalistLogos creates a Drive-backed ZIP for administrators', () => {
  const backend = createBackend('Admin');
  backend.sheets.Groups.push([
    'PITCH-1',
    'Other Faculty',
    'Pitch description',
    'https://example.com/paper.pdf',
    'https://example.com/pitch.mp4',
    'https://example.com/poster.pdf',
    'https://drive.google.com/thumbnail?id=logo-file',
    'Posted',
  ]);
  const result = JSON.parse(backend.doGet({
    parameter: {
      action: 'exportFinalistLogos',
      category: 'pitchPerfect',
      sessionToken: 'test-token',
    },
  }).content);

  assert.equal(result.success, true);
  assert.equal(result.exportedCount, 1);
  assert.equal(result.fileName, 'Pitch-Perfect-Logos.zip');
  assert.equal(result.base64, 'UEsDBA==');
});

test('Admin analytics uses the authenticated Admin session without an Admin Faculty row or group assignment', () => {
  const backend = createBackend('Admin');
  backend.sheets.EvaluationDetails.push([
    'EV-1',
    'Project Logo',
    'Relevance and Identity',
    5,
  ]);
  const response = backend.doGet({ parameter: { action: 'getRatingAnalytics', sessionToken: 'test-token' } });
  const result = JSON.parse(response.content);

  assert.equal(result.success, true, result.message);
  assert.deepEqual(result.data.evaluations.map((evaluation) => evaluation.GroupCode), ['GROUP-1', 'GROUP-2', 'GROUP-3']);
  assert.equal(Object.hasOwn(result.data.evaluations[0], 'ResearchPaperRating'), false);
  assert.equal(result.data.evaluations[0].LogoRating, 4);
  assert.equal(result.data.evaluations[0].SubcriteriaRatings.logo_relevance_identity, 5);
});

test('Faculty Advisers cannot access Admin analytics', () => {
  const backend = createBackend('Adviser');
  const response = backend.doGet({ parameter: { action: 'getRatingAnalytics', sessionToken: 'test-token' } });
  const result = JSON.parse(response.content);

  assert.equal(result.success, false);
  assert.match(result.message, /Only faculty administrators/);
});

test('Faculty evaluation history returns only the authenticated Admin’s rows without a profile lookup', () => {
  const backend = createBackend('Admin');
  const response = backend.doGet({ parameter: { action: 'getFacultyEvaluationData', sessionToken: 'test-token' } });
  const result = JSON.parse(response.content);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.evaluations.map((evaluation) => evaluation.EvaluationID), ['EV-3']);
});

test('Faculty Adviser evaluation history is scoped to the Adviser account', () => {
  const backend = createBackend('Adviser');
  const cache = backend.CacheService.getScriptCache();
  cache.put('faculty-session:test-token', JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }));
  const response = backend.doGet({ parameter: { action: 'getFacultyEvaluationData', sessionToken: 'test-token' } });
  const result = JSON.parse(response.content);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.evaluations.map((evaluation) => evaluation.EvaluationID), ['EV-2']);
});

test('Apps Script stores the three category averages without a Research Paper rating column', () => {
  const backend = createBackend('Adviser');
  const cache = backend.CacheService.getScriptCache();
  cache.put('faculty-session:test-token', JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }));
  const subcriteriaRatings = {
    ...validSubcriteriaRatings,
    logo_creativity_originality: 3,
    poster_visual_design_organization: 4,
    video_presentation_engagement: 5,
  };
  const evaluations = backend.sheets.Evaluations;
  const headers = evaluations[0];
  const reorderedHeaders = [...headers.filter((header) => header !== 'LogoRating'), 'LogoRating'];
  evaluations.forEach((row, index) => {
    const values = Object.fromEntries(headers.map((header, column) => [header, row[column]]));
    evaluations[index] = reorderedHeaders.map((header) => values[header]);
  });

  const response = backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'submitEvaluation',
        sessionToken: 'test-token',
        groupCode: 'GROUP-4',
        pitchVideoRating: 4,
        posterRating: 3,
        logoRating: 2,
        subcriteriaRatings,
        comment: 'Clear and relevant.',
      }),
    },
  });
  const result = JSON.parse(response.content);

  assert.equal(result.success, true, result.message);
  const savedRow = backend.sheets.Evaluations.at(-1);
  const savedEvaluation = Object.fromEntries(reorderedHeaders.map((header, index) => [header, savedRow[index]]));
  assert.equal(savedEvaluation.EvaluationID, result.evaluationId);
  assert.equal(savedEvaluation.StudentID, 'FAC-2');
  assert.equal(savedEvaluation.GroupCode, 'GROUP-4');
  assert.equal(savedEvaluation.PitchVideoRating, 4.33);
  assert.equal(savedEvaluation.PosterRating, 3.33);
  assert.equal(savedEvaluation.LogoRating, 2.33);
  assert.equal(savedEvaluation.Comment, 'Clear and relevant.');
  assert.equal(savedEvaluation.SubmittedAt, '2026-11-14 09:00:00');
  assert.equal(backend.sheets.EvaluationDetails.length, 10);
  assert.deepEqual(
    backend.sheets.EvaluationDetails.slice(1).map((row) => row.slice(1)),
    [
      ['Project Logo', 'Relevance and Identity', 2],
      ['Project Logo', 'Creativity and Originality', 3],
      ['Project Logo', 'Visual Appeal and Clarity', 2],
      ['Project Poster', 'Content and Relevance', 3],
      ['Project Poster', 'Visual Design and Organization', 4],
      ['Project Poster', 'Clarity and Communication', 3],
      ['Video Pitch', 'Content and Message', 4],
      ['Video Pitch', 'Presentation and Engagement', 5],
      ['Video Pitch', 'Production Quality', 4],
    ],
  );
  assert.ok(backend.sheets.EvaluationDetails.slice(1).every((row) => row[0] === result.evaluationId));

  const retryResponse = JSON.parse(backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'submitEvaluation',
        sessionToken: 'test-token',
        groupCode: 'GROUP-4',
        pitchVideoRating: 4,
        posterRating: 3,
        logoRating: 2,
        subcriteriaRatings,
        comment: 'Clear and relevant.',
      }),
    },
  }).content);
  assert.equal(retryResponse.success, false);
  assert.equal(backend.sheets.EvaluationDetails.length, 10);
});

test('submission accepts the legacy ResearchPaperRating column without using or changing it', () => {
  const backend = createBackend('Adviser');
  backend.CacheService.getScriptCache().put(
    'faculty-session:test-token',
    JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }),
  );
  const evaluations = backend.sheets.Evaluations;
  const currentHeaders = evaluations[0];
  const legacyHeaders = [
    'EvaluationID',
    'StudentID',
    'GroupCode',
    'ResearchPaperRating',
    'PitchVideoRating',
    'PosterRating',
    'LogoRating',
    'Comment',
    'SubmittedAt',
  ];
  const existingRatings = ['5', '2', '4'];
  const legacyRows = evaluations.slice(1).map((row, rowIndex) => {
    const values = Object.fromEntries(currentHeaders.map((header, index) => [header, row[index]]));
    return legacyHeaders.map((header) => (
      header === 'ResearchPaperRating' ? existingRatings[rowIndex] : values[header]
    ));
  });
  evaluations.splice(0, evaluations.length, legacyHeaders, ...legacyRows);
  const priorLegacyRatings = evaluations.slice(1).map((row) => row[3]);

  const result = JSON.parse(backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'submitEvaluation',
        sessionToken: 'test-token',
        groupCode: 'GROUP-4',
        subcriteriaRatings: validSubcriteriaRatings,
      }),
    },
  }).content);

  assert.equal(result.success, true, result.message);
  assert.deepEqual(evaluations.slice(1, 4).map((row) => row[3]), priorLegacyRatings);
  assert.equal(evaluations.at(-1)[3], '');
  assert.equal(evaluations.at(-1)[4], 4);
});

test('failed detail writes roll back and can be retried without duplicate detail rows', () => {
  const backend = createBackend('Adviser');
  backend.CacheService.getScriptCache().put(
    'faculty-session:test-token',
    JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }),
  );
  const payload = {
    action: 'submitEvaluation',
    sessionToken: 'test-token',
    groupCode: 'GROUP-4',
    subcriteriaRatings: validSubcriteriaRatings,
  };
  backend.failDetailAppendAt(4);
  const failed = JSON.parse(backend.doPost({
    postData: { contents: JSON.stringify(payload) },
  }).content);
  assert.equal(failed.success, false);
  assert.match(failed.message, /Simulated EvaluationDetails write failure/);
  assert.equal(backend.sheets.EvaluationDetails.length, 1);
  assert.equal(backend.sheets.Evaluations.length, 4);

  const retried = JSON.parse(backend.doPost({
    postData: { contents: JSON.stringify(payload) },
  }).content);
  assert.equal(retried.success, true, retried.message);
  assert.equal(backend.sheets.EvaluationDetails.length, 10);
  assert.equal(backend.sheets.Evaluations.length, 5);
});

test('submission refuses to alter EvaluationDetails with unexpected headers', () => {
  const backend = createBackend('Adviser');
  backend.CacheService.getScriptCache().put(
    'faculty-session:test-token',
    JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }),
  );
  backend.sheets.EvaluationDetails[0] = [
    'EvaluationID',
    'Subcriterion',
    'Criterion',
    'Rating',
  ];
  const before = backend.sheets.Evaluations.map((row) => [...row]);
  const result = JSON.parse(backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'submitEvaluation',
        sessionToken: 'test-token',
        groupCode: 'GROUP-4',
        subcriteriaRatings: validSubcriteriaRatings,
      }),
    },
  }).content);

  assert.equal(result.success, false);
  assert.match(result.message, /exact headers in order/);
  assert.deepEqual(backend.sheets.Evaluations, before);
  assert.equal(backend.sheets.EvaluationDetails.length, 1);
});

test('unsubmitted rubric categories save blank detail ratings and blank category averages', () => {
  const backend = createBackend('Adviser');
  backend.CacheService.getScriptCache().put(
    'faculty-session:test-token',
    JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }),
  );
  backend.sheets.Groups[4][6] = '';
  const subcriteriaRatings = {
    ...validSubcriteriaRatings,
    logo_relevance_identity: null,
    logo_creativity_originality: null,
    logo_visual_appeal_clarity: null,
  };
  const result = JSON.parse(backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'submitEvaluation',
        sessionToken: 'test-token',
        groupCode: 'GROUP-4',
        subcriteriaRatings,
      }),
    },
  }).content);

  assert.equal(result.success, true, result.message);
  const evaluation = backend.sheets.Evaluations.at(-1);
  assert.equal(evaluation[3], 4);
  assert.equal(evaluation[4], 3);
  assert.equal(evaluation[5], '');
  const logoDetails = backend.sheets.EvaluationDetails.slice(1, 4);
  assert.deepEqual(logoDetails.map((row) => row[3]), ['', '', '']);
  assert.equal(backend.sheets.EvaluationDetails.length, 10);
});

test('backend rejects ratings for missing resources and stores those criteria as blank', () => {
  for (const evaluator of [
    { sessionToken: 'test-student-token', role: 'Student' },
    { sessionToken: 'test-token', role: 'Adviser' },
  ]) {
    const backend = createBackend('Adviser');
    backend.sheets.Groups[4][6] = '';
    if (evaluator.role === 'Adviser') {
      backend.CacheService.getScriptCache().put(
        'faculty-session:test-token',
        JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }),
      );
    }

    const initialRowCount = backend.sheets.Evaluations.length;
    const rejected = JSON.parse(backend.doPost({
      postData: {
        contents: JSON.stringify({
          action: 'submitEvaluation',
          sessionToken: evaluator.sessionToken,
          groupCode: 'GROUP-4',
          pitchVideoRating: 4,
          posterRating: 3,
          logoRating: 2,
          subcriteriaRatings: validSubcriteriaRatings,
        }),
      },
    }).content);
    assert.equal(rejected.success, false);
    assert.match(rejected.message, /Project Logo has not been submitted/i);
    assert.equal(backend.sheets.Evaluations.length, initialRowCount);

    const accepted = JSON.parse(backend.doPost({
      postData: {
        contents: JSON.stringify({
          action: 'submitEvaluation',
          sessionToken: evaluator.sessionToken,
          groupCode: 'GROUP-4',
          pitchVideoRating: 4,
          posterRating: 3,
          logoRating: null,
          subcriteriaRatings: {
            ...validSubcriteriaRatings,
            logo_relevance_identity: null,
            logo_creativity_originality: null,
            logo_visual_appeal_clarity: null,
          },
        }),
      },
    }).content);
    assert.equal(accepted.success, true, accepted.message);
    const saved = backend.sheets.Evaluations.at(-1);
    assert.equal(saved[3], 4);
    assert.equal(saved[4], 3);
    assert.equal(saved[5], '');
  }
});

test('students save group descriptions as overrides without editing imported groups', () => {
  const backend = createBackend('Adviser');
  const response = backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'updateGroupDescription',
        sessionToken: 'test-student-token',
        groupCode: 'GROUP-2',
        description: '  Updated group description  ',
      }),
    },
  });
  const result = JSON.parse(response.content);

  assert.equal(result.success, true, result.message);
  assert.equal(result.description, 'Updated group description');
  assert.equal(backend.sheets.Groups[1][2], 'Original description');
  assert.equal(backend.sheets.Groups[2][2], 'Group two description');
  assert.deepEqual(backend.sheets.GroupOverrides[1].slice(0, 2), [
    'GROUP-1',
    'Updated group description',
  ]);
  assert.equal(backend.sheets.GroupOverrides.length, 2);

  const projects = JSON.parse(backend.doGet({
    parameter: { action: 'getProjects' },
  }).content).data;
  assert.equal(projects[0].description, 'Updated group description');
});

test('updating a group description reuses and deduplicates existing overrides', () => {
  const backend = createBackend('Adviser');
  backend.sheets.GroupOverrides.push(
    ['GROUP-1', 'Older override', '2026-11-14T00:00:00.000Z'],
    [' group-1 ', 'Duplicate override', '2026-11-15T00:00:00.000Z'],
  );

  const response = backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'updateGroupDescription',
        sessionToken: 'test-student-token',
        description: 'Latest override',
      }),
    },
  });
  const result = JSON.parse(response.content);

  assert.equal(result.success, true, result.message);
  assert.equal(backend.sheets.GroupOverrides.length, 2);
  assert.deepEqual(backend.sheets.GroupOverrides[1].slice(0, 2), [
    'GROUP-1',
    'Latest override',
  ]);
  assert.equal(backend.sheets.Groups[1][2], 'Original description');
});

test('updated Students and Groups headers preserve group access and project data', () => {
  const backend = createBackend('Adviser');
  backend.sheets.Students = [
    ['NAME', 'STUDENT ID', 'COURSE', 'SECTION', 'TEAM CODE', 'MEMBER ID', 'PIN'],
    ['Student One', 'STUDENT-1', 'BSCS', 'A', 'GROUP-1', 'MEMBER-1', '1234'],
  ];
  backend.sheets.Groups = [
    ['GROUP CODE', 'SOFTWARE NAME', 'DESCRIPTION', 'CATEGORY', 'ADVISER', 'Thumbnail', 'RESEARCH PAPER', 'VIDEO', 'POSTER', 'STATUS'],
    ['GROUP-1', 'Project One', 'Project description', 'Technology', 'FAC-2', 'https://example.com/logo.png', 'https://example.com/paper.pdf', 'https://example.com/pitch.mp4', 'https://example.com/poster.pdf', ' posted '],
    ['GROUP-2', 'Draft Project', 'Not posted yet', 'Technology', 'FAC-2', 'https://example.com/draft.png', '', '', '', ''],
  ];

  const groupsResponse = backend.doGet({ parameter: { action: 'getProjects' } });
  const groups = JSON.parse(groupsResponse.content).data;
  assert.equal(groups.length, 1);
  assert.equal(groups[0].groupCode, 'GROUP-1');
  assert.equal(groups[0].title, 'Project One');
  assert.equal(groups[0].description, 'Project description');
  assert.equal(groups[0].tag, 'Technology');
  assert.equal(groups[0].stage, ' posted ');
  assert.equal(groups[0].facultyId, 'FAC-2');
  assert.equal(groups[0].thumbnail, 'https://example.com/logo.png');
  assert.deepEqual(groups[0].members.map((member) => member.studentId), ['STUDENT-1']);
  assert.deepEqual(groups[0].members.map((member) => member.name), ['Student One']);
  assert.equal(groups[0].researchPaperLink, 'https://example.com/paper.pdf');
  assert.equal(groups[0].pitchVideoLink, 'https://example.com/pitch.mp4');
  assert.equal(groups[0].documentationLink, 'https://example.com/poster.pdf');

  const loginResponse = backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'login',
        identifier: 'STUDENT-1',
        password: '1234',
        role: 'Student',
      }),
    },
  });
  const loginResult = JSON.parse(loginResponse.content);
  assert.equal(loginResult.success, true, loginResult.message);
  assert.equal(loginResult.user.StudentID, 'STUDENT-1');
  assert.equal(loginResult.user.StudentNo, 'STUDENT-1');
  assert.equal(loginResult.user.GroupCode, 'GROUP-1');
  assert.equal(loginResult.user.Program, 'BSCS');
  assert.equal(loginResult.user.Sec, 'A');

  const memberLoginResponse = backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'login',
        identifier: 'MEMBER-1',
        password: '1234',
        role: 'Student',
      }),
    },
  });
  const memberLoginResult = JSON.parse(memberLoginResponse.content);
  assert.equal(memberLoginResult.success, true, memberLoginResult.message);
  assert.equal(memberLoginResult.user.StudentID, 'STUDENT-1');
  assert.equal(memberLoginResult.user.GroupCode, 'GROUP-1');

  const studentEligibilityResponse = backend.doGet({
    parameter: {
      action: 'getEvaluationEligibility',
      groupCode: 'GROUP-1',
      sessionToken: memberLoginResult.sessionToken,
    },
  });
  assert.equal(JSON.parse(studentEligibilityResponse.content).data.code, 'own-group');

  backend.CacheService.getScriptCache().put(
    'faculty-session:test-token',
    JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }),
  );
  const adviserEligibilityResponse = backend.doGet({
    parameter: {
      action: 'getEvaluationEligibility',
      groupCode: 'GROUP-1',
      sessionToken: 'test-token',
    },
  });
  assert.equal(JSON.parse(adviserEligibilityResponse.content).data.code, 'assigned-team');

  const adviserSubmissionResponse = backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'submitEvaluation',
        sessionToken: 'test-token',
        groupCode: 'GROUP-1',
        pitchVideoRating: 4,
        posterRating: 4,
        logoRating: 4,
        subcriteriaRatings: validSubcriteriaRatings,
      }),
    },
  });
  assert.match(JSON.parse(adviserSubmissionResponse.content).message, /Faculty advisers cannot evaluate/);

  const updateResponse = backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'updateGroupDescription',
        sessionToken: memberLoginResult.sessionToken,
        description: 'Updated with the new headers',
      }),
    },
  });
  assert.equal(JSON.parse(updateResponse.content).success, true);
  assert.equal(backend.sheets.Groups[1][2], 'Project description');
  assert.deepEqual(backend.sheets.GroupOverrides[1].slice(0, 2), [
    'GROUP-1',
    'Updated with the new headers',
  ]);
  const updatedProjects = JSON.parse(backend.doGet({
    parameter: { action: 'getProjects' },
  }).content).data;
  assert.equal(updatedProjects[0].description, 'Updated with the new headers');

  const groupsBeforeThumbnailActions = backend.sheets.Groups.map((row) => [...row]);
  for (const action of ['uploadThumbnail', 'deleteThumbnail']) {
    const response = backend.doPost({
      postData: {
        contents: JSON.stringify({
          action,
          sessionToken: memberLoginResult.sessionToken,
          imageData: 'data:image/png;base64,aW1hZ2U=',
        }),
      },
    });
    const result = JSON.parse(response.content);
    assert.equal(result.success, false);
    assert.match(result.message, /managed through the Groups sheet/i);
  }
  assert.deepEqual(backend.sheets.Groups, groupsBeforeThumbnailActions);
});

test('only projects with Posted status are included in project listings', () => {
  const backend = createBackend('Adviser');
  backend.sheets.Groups = [
    ['GROUP CODE', 'SOFTWARE NAME', 'STATUS'],
    ['GROUP-1', 'Posted project', 'Posted'],
    ['GROUP-2', 'Blank status', ''],
    ['GROUP-3', 'Draft project', 'Draft'],
    ['GROUP-4', 'Lowercase posted', ' posted '],
  ];

  const result = JSON.parse(backend.doGet({
    parameter: { action: 'getProjects' },
  }).content);
  assert.equal(result.success, true, result.message);
  assert.deepEqual(result.data.map((project) => project.groupCode), ['GROUP-1', 'GROUP-4']);
});

test('folder thumbnails select the alphabetically first supported image and cache the result', () => {
  const backend = createBackend('Adviser');
  const folderId = 'logo-folder';
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
  const singleImageUrl = 'https://drive.google.com/file/d/single-logo/view?usp=sharing';
  backend.sheets.Groups = [
    ['GROUP CODE', 'SOFTWARE NAME', 'DESCRIPTION', 'CATEGORY', 'ADVISER', 'Thumbnail', 'STATUS'],
    ['GROUP-1', 'Project One', 'Description', 'Technology', 'FAC-2', folderUrl, 'Posted'],
    ['GROUP-2', 'Project Two', 'Description', 'Technology', 'FAC-2', singleImageUrl, 'Posted'],
  ];
  backend.driveFolders.set(folderId, [
    { id: 'later-image', name: 'Beta.png', mimeType: 'image/png' },
    { id: 'first-image', name: 'alpha.jpeg', mimeType: 'image/jpeg' },
    { id: 'unsupported-image', name: 'Aardvark.gif', mimeType: 'image/gif' },
    { id: 'mismatched-file', name: 'Aardvark.png', mimeType: 'application/pdf' },
  ]);
  const originalGroups = backend.sheets.Groups.map((row) => [...row]);

  const firstResult = JSON.parse(backend.doGet({
    parameter: { action: 'getProjects' },
  }).content);
  assert.equal(firstResult.success, true, firstResult.message);
  assert.equal(
    firstResult.data[0].thumbnail,
    'https://drive.google.com/thumbnail?id=first-image&sz=w1200',
  );
  assert.equal(firstResult.data[1].thumbnail, singleImageUrl);
  assert.equal(backend.driveFolderScans.get(folderId), 1);
  assert.deepEqual(backend.sheets.Groups, originalGroups);

  const cachedResult = JSON.parse(backend.doGet({
    parameter: { action: 'getProjects' },
  }).content);
  assert.equal(cachedResult.data[0].thumbnail, firstResult.data[0].thumbnail);
  assert.equal(backend.driveFolderScans.get(folderId), 1);
  assert.deepEqual(backend.sheets.Groups, originalGroups);
});

test('empty, inaccessible, or image-free Drive folders return no thumbnail', () => {
  const backend = createBackend('Adviser');
  backend.sheets.Groups = [
    ['GROUP CODE', 'SOFTWARE NAME', 'Thumbnail', 'STATUS'],
    ['GROUP-1', 'Empty folder', 'https://drive.google.com/drive/folders/empty-folder', 'Posted'],
    ['GROUP-2', 'Inaccessible folder', 'https://drive.google.com/drive/folders/missing-folder', 'Posted'],
    ['GROUP-3', 'No supported images', 'https://drive.google.com/folderview?id=unsupported-folder', 'Posted'],
  ];
  backend.driveFolders.set('empty-folder', []);
  backend.driveFolders.set('unsupported-folder', [
    { id: 'gif-image', name: 'logo.gif', mimeType: 'image/gif' },
  ]);

  const result = JSON.parse(backend.doGet({
    parameter: { action: 'getProjects' },
  }).content);
  assert.equal(result.success, true, result.message);
  assert.deepEqual(result.data.map((project) => project.thumbnail), ['', '', '']);
});

test('folder thumbnails support PNG, JPG, JPEG, and WEBP files', () => {
  const backend = createBackend('Adviser');
  const extensions = [
    ['png-folder', 'logo.png', 'image/png'],
    ['jpg-folder', 'logo.jpg', 'image/jpeg'],
    ['jpeg-folder', 'logo.jpeg', 'image/jpeg'],
    ['webp-folder', 'logo.webp', 'image/webp'],
  ];
  backend.sheets.Groups = [
    ['GROUP CODE', 'SOFTWARE NAME', 'Thumbnail', 'STATUS'],
    ...extensions.map(([folderId]) => [
      folderId,
      folderId,
      `https://drive.google.com/drive/folders/${folderId}`,
      'Posted',
    ]),
  ];
  extensions.forEach(([folderId, name, mimeType]) => {
    backend.driveFolders.set(folderId, [
      { id: `${folderId}-image`, name, mimeType },
    ]);
  });

  const result = JSON.parse(backend.doGet({
    parameter: { action: 'getProjects' },
  }).content);
  assert.equal(result.success, true, result.message);
  assert.deepEqual(
    result.data.map((project) => project.thumbnail),
    extensions.map(([folderId]) =>
      `https://drive.google.com/thumbnail?id=${folderId}-image&sz=w1200`
    ),
  );
});

test('only authenticated students can update group descriptions', () => {
  const backend = createBackend('Adviser');
  const response = backend.doPost({
    postData: {
      contents: JSON.stringify({
        action: 'updateGroupDescription',
        sessionToken: 'test-token',
        description: 'Unauthorized update',
      }),
    },
  });
  const result = JSON.parse(response.content);

  assert.equal(result.success, false);
  assert.match(result.message, /student session/i);
  assert.equal(backend.sheets.Groups[1][2], 'Original description');
  assert.equal(backend.sheets.GroupOverrides.length, 1);
});
