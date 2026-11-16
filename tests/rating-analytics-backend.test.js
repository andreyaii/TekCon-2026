import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');

function createBackend(role, facultyRows = [['FAC-2', 'Faculty Evaluator', 'Adviser']]) {
  const evaluations = [
    ['EV-1', 'STUDENT-1', 'GROUP-1', 5, 4, 3, 4, '', '2026-11-12 10:00:00'],
    ['EV-2', 'FAC-2', 'GROUP-2', 2, 3, 4, 5, '', '2026-11-12 11:00:00'],
    ['EV-3', 'ADMIN-1', 'GROUP-3', 4, 4, 4, 3, '', '2026-11-12 12:00:00'],
  ];
  const sheets = {
    Evaluations: [
      ['EvaluationID', 'StudentID', 'GroupCode', 'ResearchPaperRating', 'PitchVideoRating', 'PosterRating', 'LogoRating', 'Comment', 'SubmittedAt'],
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
        getDataRange: () => ({ getValues: () => values.map((row) => [...row]) }),
        appendRow: (row) => values.push([...row]),
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
  runInNewContext(script, context);
  return context;
}

test('Admin analytics uses the authenticated Admin session without an Admin Faculty row or group assignment', () => {
  const backend = createBackend('Admin');
  const response = backend.doGet({ parameter: { action: 'getRatingAnalytics', sessionToken: 'test-token' } });
  const result = JSON.parse(response.content);

  assert.equal(result.success, true, result.message);
  assert.deepEqual(result.data.evaluations.map((evaluation) => evaluation.GroupCode), ['GROUP-1', 'GROUP-2', 'GROUP-3']);
  assert.equal(result.data.evaluations[0].ResearchPaperRating, 5);
  assert.equal(result.data.evaluations[0].LogoRating, 4);
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

test('Apps Script stores the Research Paper and Logo ratings in the matching sheet columns', () => {
  const backend = createBackend('Adviser');
  const cache = backend.CacheService.getScriptCache();
  cache.put('faculty-session:test-token', JSON.stringify({ facultyId: 'FAC-2', role: 'Adviser' }));
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
        researchPaperRating: 5,
        pitchVideoRating: 4,
        posterRating: 3,
        logoRating: 2,
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
  assert.equal(savedEvaluation.ResearchPaperRating, 5);
  assert.equal(savedEvaluation.PitchVideoRating, 4);
  assert.equal(savedEvaluation.PosterRating, 3);
  assert.equal(savedEvaluation.LogoRating, 2);
  assert.equal(savedEvaluation.Comment, 'Clear and relevant.');
  assert.equal(savedEvaluation.SubmittedAt, '2026-11-14 09:00:00');
});

test('backend rejects ratings for missing resources and stores those criteria as blank', () => {
  for (const evaluator of [
    { sessionToken: 'test-student-token', role: 'Student' },
    { sessionToken: 'test-token', role: 'Adviser' },
  ]) {
    const backend = createBackend('Adviser');
    backend.sheets.Groups[4][3] = 'not submitted yet';
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
          researchPaperRating: 5,
          pitchVideoRating: 4,
          posterRating: 3,
          logoRating: 2,
        }),
      },
    }).content);
    assert.equal(rejected.success, false);
    assert.match(rejected.message, /Research Paper has not been submitted/i);
    assert.equal(backend.sheets.Evaluations.length, initialRowCount);

    const accepted = JSON.parse(backend.doPost({
      postData: {
        contents: JSON.stringify({
          action: 'submitEvaluation',
          sessionToken: evaluator.sessionToken,
          groupCode: 'GROUP-4',
          researchPaperRating: null,
          pitchVideoRating: 4,
          posterRating: 3,
          logoRating: 2,
        }),
      },
    }).content);
    assert.equal(accepted.success, true, accepted.message);
    const saved = backend.sheets.Evaluations.at(-1);
    assert.equal(saved[3], '');
    assert.equal(saved[4], 4);
    assert.equal(saved[5], 3);
    assert.equal(saved[6], 2);
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
        researchPaperRating: 4,
        pitchVideoRating: 4,
        posterRating: 4,
        logoRating: 4,
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
