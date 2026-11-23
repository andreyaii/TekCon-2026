
/*******************************************************
 * TECHCON 2026 - GOOGLE APPS SCRIPT BACKEND
 *******************************************************/


// =====================================================
// 1. SPREADSHEET CONNECTION TEST
// =====================================================

function testSpreadsheetConnection() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty("SPREADSHEET_ID");

  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID is missing from Script Properties.");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  const requiredSheets = [
    "Students",
    "Groups",
    "Evaluations",
    "Faculty",
    "EvaluationSettings"
  ];

  const results = [];

  requiredSheets.forEach(function(sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      results.push(sheetName + ": NOT FOUND");
      return;
    }

    const headers = sheet.getLastColumn() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
      : [];

    results.push(sheetName + ": FOUND | Columns: " + headers.join(", "));
  });

  Logger.log("Spreadsheet connected: " + spreadsheet.getName());

  results.forEach(function(result) {
    Logger.log(result);
  });
}


// =====================================================
// 2. HEADER AND DATA HELPERS
// =====================================================

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getHeaderIndex(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);

  return headers.findIndex(function(header) {
    return normalizedAliases.indexOf(normalizeHeader(header)) !== -1;
  });
}

function getStudentField(student, aliases) {
  if (!student) return "";

  const headers = Object.keys(student);
  const headerIndex = getHeaderIndex(headers, aliases);

  return headerIndex < 0 ? "" : student[headers[headerIndex]];
}

function normalizeGroupCode(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function getSheetData(sheet) {
  if (!sheet) {
    throw new Error("Cannot read data from a missing sheet.");
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];

  const headers = data.shift().map(function(header) {
    return String(header).trim();
  });

  return data
    .filter(function(row) {
      return row.some(function(cell) {
        return cell !== "" && cell !== null;
      });
    })
    .map(function(row) {
      const obj = {};

      headers.forEach(function(header, index) {
        obj[header] = row[index];
      });

      return obj;
    });
}

function getSpreadsheet() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty("SPREADSHEET_ID");

  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID is missing from Script Properties.");
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function getRequiredSheet(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(sheetName + " sheet not found.");
  }

  return sheet;
}

function getFinalistRows(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return [];
  }

  const rows = sheet.getDataRange().getDisplayValues();
  const headers = rows.shift().map(function(header) {
    return String(header).trim();
  });
  const fields = {
    groupCode: "GROUP CODE",
    projectName: "PROJECT NAME",
    description: "DESCRIPTION",
    category: "CATEGORY",
    adviser: "ADVISER"
  };
  const indexes = {};

  Object.keys(fields).forEach(function(field) {
    indexes[field] = getHeaderIndex(headers, [fields[field]]);
  });

  if (Object.keys(indexes).some(function(field) {
    return indexes[field] < 0;
  })) {
    return [];
  }

  return rows
    .filter(function(row) {
      return row.some(function(cell) {
        return cell !== "";
      });
    })
    .map(function(row) {
      const finalist = {};

      Object.keys(indexes).forEach(function(field) {
        finalist[field] = row[indexes[field]] || "";
      });

      return finalist;
    });
}

function getPublishedProjectRows(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return [];
  }

  const rows = sheet.getDataRange().getDisplayValues();
  const headers = rows.shift().map(function(header) {
    return String(header).trim();
  });
  const fields = {
    groupCode: ["GROUP CODE", "GROUPCODE", "GROUP"],
    projectTitle: ["PROJECT TITLE", "PROJECTTITLE", "PROJECT NAME", "TITLE"],
    publication: ["PUBLICATION", "PUBLICATION "],
    date: ["DATE", "Date"],
    place: ["PLACE", "Place"],
    paperTitle: ["PAPER TITLE", "PAPERTITLE"],
    authors: ["AUTHORS", "AUTHORS ", "AUTHOR"],
    recognition: ["RECOGNITION", "Recognition"]
  };
  const indexes = {};

  Object.keys(fields).forEach(function(field) {
    indexes[field] = getHeaderIndex(headers, fields[field]);
  });

  return rows
    .filter(function(row) {
      return row.some(function(cell) {
        return String(cell).trim() !== "";
      });
    })
    .map(function(row) {
      const item = {};

      Object.keys(fields).forEach(function(field) {
        const index = indexes[field];
        item[field] = index >= 0 ? (row[index] || "") : "";
      });

      return item;
    });
}

function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeFacultyRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/^faculty[\s_-]+/, "");
}


// =====================================================
// 3. STUDENT AND GROUP DATA
// =====================================================

function getStudentsByGroupCode(spreadsheet) {
  const sheet = getRequiredSheet(spreadsheet, "Students");
  const students = getSheetData(sheet);
  const membersByGroupCode = {};

  students.forEach(function(student) {
    const groupCode = normalizeGroupCode(
      getStudentField(student, [
        "team code",
        "group code",
        "groupcode"
      ])
    );

    const studentId = String(getStudentField(student, [
      "student id",
      "student no.",
      "student number"
    ]) || "").trim();

    const name = String(getStudentField(student, [
      "name",
      "name of student",
      "student name",
      "full name"
    ]) || "").trim();

    if (!groupCode || !name) return;

    if (!membersByGroupCode[groupCode]) {
      membersByGroupCode[groupCode] = [];
    }

    membersByGroupCode[groupCode].push({
      id: studentId || name,
      studentId: studentId,
      name: name
    });
  });

  return membersByGroupCode;
}


function getPublicGroups(spreadsheet) {
  spreadsheet = spreadsheet || getSpreadsheet();

  const sheet = getRequiredSheet(spreadsheet, "Groups");
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];

  const membersByGroupCode = getStudentsByGroupCode(spreadsheet);
  const descriptionOverrides = getGroupDescriptionOverrides(spreadsheet);

  const headers = data[0].map(function(header) {
    return String(header).trim();
  });

  const groupCodeIndex = getHeaderIndex(headers, [
    "group code",
    "groupcode"
  ]);

  if (groupCodeIndex < 0) {
    throw new Error("The Groups sheet is missing its GROUP CODE column.");
  }

  const resourceColumns = [
    { key: "thumbnail", aliases: ["thumbnail", "logo"] },
    { key: "researchPaperLink", aliases: ["research paper", "researchpaperlink"] },
    { key: "pitchVideoLink", aliases: ["video", "pitch video link"] },
    { key: "posterLink", aliases: ["poster", "poster link"] }
  ];

  const resourceIndexes = resourceColumns
    .map(function(resource) {
      return getHeaderIndex(headers, resource.aliases);
    })
    .filter(function(index) {
      return index >= 0;
    });

  let resourceRichText = [];
  let resourceFormulas = [];
  let resourceStartColumn = 0;

  if (resourceIndexes.length > 0) {
    resourceStartColumn = Math.min.apply(null, resourceIndexes);

    const resourceEndColumn = Math.max.apply(null, resourceIndexes);

    const resourceRange = sheet.getRange(
      2,
      resourceStartColumn + 1,
      data.length - 1,
      resourceEndColumn - resourceStartColumn + 1
    );

    resourceRichText = resourceRange.getRichTextValues();
    resourceFormulas = resourceRange.getFormulas();
  }

  const linkColumns = {};

  resourceColumns.forEach(function(resource) {
    const columnIndex = getHeaderIndex(headers, resource.aliases);

    linkColumns[resource.key] = columnIndex < 0
      ? []
      : getSheetResourceLinks(
          resourceRichText,
          resourceFormulas,
          columnIndex - resourceStartColumn,
          data.slice(1).map(function(row) {
            return row[columnIndex];
          })
        );
  });

  return data.slice(1)
    .map(function(row, index) {
      const group = {};

      headers.forEach(function(header, columnIndex) {
        group[header] = row[columnIndex];
      });

      return {
        group: group,
        groupCode: String(row[groupCodeIndex] || "").trim(),
        thumbnail:
          linkColumns.thumbnail[index] ||
          getStudentField(group, ["thumbnail", "logo"]),
        researchPaperLink:
          linkColumns.researchPaperLink[index] ||
          getStudentField(group, ["research paper", "researchpaperlink"]),
        pitchVideoLink:
          linkColumns.pitchVideoLink[index] ||
          getStudentField(group, ["video", "pitch video link"]),
        posterLink:
          linkColumns.posterLink[index] ||
          getStudentField(group, ["poster", "poster link"])
      };
    })
    .filter(function(record) {
      return Boolean(normalizeGroupCode(record.groupCode));
    })
    .map(function(record) {
      const group = record.group;
      const groupCode = record.groupCode;

      return {
        groupCode: groupCode,
        title: getStudentField(group, ["software name", "title"]),
        description: Object.prototype.hasOwnProperty.call(
          descriptionOverrides,
          normalizeGroupCode(groupCode)
        )
          ? descriptionOverrides[normalizeGroupCode(groupCode)]
          : getStudentField(group, ["description"]),
        tag: getStudentField(group, ["category", "tag"]),
        stage: getStudentField(group, ["status", "stage"]),

        // Preserve the existing API property name.
        facultyId: getStudentField(group, ["adviser"]),

        thumbnail: resolveGroupThumbnail(record.thumbnail),
        researchPaperLink: record.researchPaperLink,
        pitchVideoLink: record.pitchVideoLink,

        members:
          membersByGroupCode[normalizeGroupCode(groupCode)] || [],

        // Preserve the existing API property name.
        documentationLink: record.posterLink
      };
    });
}

function getDriveFolderId(url) {
  const driveUrl = String(url || "").trim();
  if (!/^https?:\/\/(?:www\.)?drive\.google\.com\//i.test(driveUrl)) {
    return "";
  }

  const folderPathMatch = driveUrl.match(/\/folders\/([A-Za-z0-9_-]+)/i);
  if (folderPathMatch) return folderPathMatch[1];

  const folderViewMatch = driveUrl.match(/\/folderview(?:[?#]|$)/i);
  if (!folderViewMatch) return "";

  const folderIdMatch = driveUrl.match(/[?&]id=([A-Za-z0-9_-]+)/i);
  return folderIdMatch ? folderIdMatch[1] : "";
}

function isSupportedDriveImage(file) {
  const name = String(file.getName() || "");
  const extensionMatch = name.match(/\.([^.]+)$/);
  if (!extensionMatch) return false;

  const extension = extensionMatch[1].toLowerCase();
  const mimeType = String(file.getMimeType() || "").toLowerCase();
  const supportedTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp"
  };

  return supportedTypes[extension] === mimeType;
}

function compareDriveImages(a, b) {
  const aName = a.name.toLowerCase();
  const bName = b.name.toLowerCase();
  if (aName !== bName) return aName < bName ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function resolveGroupThumbnail(thumbnailUrl) {
  const folderId = getDriveFolderId(thumbnailUrl);
  if (!folderId) return String(thumbnailUrl || "").trim();

  const cache = CacheService.getScriptCache();
  const cacheKey = "project-folder-thumbnail:" + folderId;
  const cachedUrl = cache.get(cacheKey);
  if (cachedUrl !== null) {
    return cachedUrl === "__NO_IMAGE__" ? "" : cachedUrl;
  }

  try {
    const files = DriveApp.getFolderById(folderId).getFiles();
    const images = [];

    while (files.hasNext()) {
      const file = files.next();
      if (!isSupportedDriveImage(file)) continue;
      images.push({
        id: String(file.getId()),
        name: String(file.getName())
      });
    }

    images.sort(compareDriveImages);
    const selectedUrl = images.length
      ? "https://drive.google.com/thumbnail?id=" +
        encodeURIComponent(images[0].id) +
        "&sz=w1200"
      : "";

    cache.put(cacheKey, selectedUrl || "__NO_IMAGE__", selectedUrl ? 1800 : 300);
    return selectedUrl;
  } catch (error) {
    Logger.log(
      "Could not resolve project thumbnail folder " +
      folderId +
      ": " +
      error.message
    );
    cache.put(cacheKey, "__NO_IMAGE__", 300);
    return "";
  }
}

function getGroupOverrideColumns(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headers = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function(header) {
      return String(header).trim();
    })
    : [];
  const columns = {
    groupCode: getHeaderIndex(headers, ["group code", "groupcode"]),
    description: getHeaderIndex(headers, ["description override"]),
    updatedAt: getHeaderIndex(headers, ["updated at"])
  };

  if (columns.groupCode < 0 || columns.description < 0 || columns.updatedAt < 0) {
    throw new Error(
      "The GroupOverrides sheet must include GroupCode, DescriptionOverride, and UpdatedAt columns."
    );
  }
  return columns;
}

function getGroupDescriptionOverrides(spreadsheet) {
  const sheet = getRequiredSheet(spreadsheet, "GroupOverrides");
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return {};

  const columns = getGroupOverrideColumns(sheet);
  const overrides = {};
  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const groupCode = normalizeGroupCode(values[rowIndex][columns.groupCode]);
    if (!groupCode) continue;
    overrides[groupCode] = values[rowIndex][columns.description];
  }
  return overrides;
}


function getSheetResourceLinks(richTextValues, formulas, columnIndex, values) {
  return values.map(function(value, index) {
    const richText = richTextValues[index][columnIndex];
    const directLink = richText && richText.getLinkUrl();

    if (directLink) return directLink;

    if (richText) {
      const runLinks = richText.getRuns()
        .map(function(run) {
          return run.getLinkUrl();
        })
        .filter(Boolean);

      if (runLinks.length === 1) return runLinks[0];
    }

    const formula = formulas[index][columnIndex];

    const formulaMatch = formula &&
      formula.match(/^\s*=\s*HYPERLINK\s*\(\s*"((?:[^"]|"")*)"/i);

    if (formulaMatch) {
      return formulaMatch[1].replace(/""/g, '"');
    }

    return String(value || "").trim();
  });
}


function getGroupCodes(spreadsheet) {
  return getSheetData(getRequiredSheet(spreadsheet, "Groups"))
    .map(function(group) {
      return String(getStudentField(group, [
        "group code",
        "groupcode"
      ]) || "").trim();
    })
    .filter(function(groupCode) {
      return Boolean(normalizeGroupCode(groupCode));
    });
}


// =====================================================
// 4. GET REQUEST HANDLER
// =====================================================

function doGet(e) {
  try {
    const action = e && e.parameter
      ? e.parameter.action
      : "";

    const spreadsheet = getSpreadsheet();

    // PUBLIC FINALIST LISTS
    if (action === "getFinalists") {
      const finalistData = {
        pitchPerfect: getFinalistRows(spreadsheet, "PitchPerfectFinalist"),
        research: getFinalistRows(spreadsheet, "ResearchFinalist")
      };
      const pubSheet = spreadsheet.getSheetByName("PublishedProjects");
      if (pubSheet) {
        finalistData.publishedProjects = getPublishedProjectRows(spreadsheet, "PublishedProjects");
      }
      return responseJSON({
        success: true,
        data: finalistData
      });
    }

    // PUBLISHED PROJECTS
    if (action === "getPublishedProjects") {
      return responseJSON({
        success: true,
        data: getPublishedProjectRows(spreadsheet, "PublishedProjects")
      });
    }

    // ADMIN RATING ANALYTICS
    if (action === "getRatingAnalytics") {
      getAuthenticatedAdmin(e.parameter.sessionToken);

      const evalSheet = getRequiredSheet(spreadsheet, "Evaluations");
      const evaluations = getEvaluationRows(evalSheet);
      const subcriteriaByEvaluation = getEvaluationSubcriteriaById(spreadsheet, evaluations);

      return responseJSON({
        success: true,
        data: {
          evaluations: getRatingAnalyticsRows(spreadsheet, evaluations).map(function(evaluation) {
            return {
              ...evaluation,
              SubcriteriaRatings:
                subcriteriaByEvaluation[evaluation.EvaluationID] || {}
            };
          })
        }
      });
    }

    // FACULTY EVALUATION HISTORY
    if (action === "getFacultyEvaluationData") {
      const evaluator = getAuthenticatedFacultyForEvaluationHistory(
        spreadsheet,
        e.parameter.sessionToken
      );

      const evaluations = getEvaluationRows(
        getRequiredSheet(spreadsheet, "Evaluations")
      ).filter(function(evaluation) {
        return String(
          getStudentField(evaluation, ["student id"]) || ""
        ).trim() === evaluator.facultyId;
      });

      return responseJSON({
        success: true,
        data: { evaluations: evaluations }
      });
    }

    // EVALUATION-RELATED GET ACTIONS
    if (
      action === "getMyEvaluations" ||
      action === "getEvaluations" ||
      action === "getEvaluationsForGroup" ||
      action === "getStudentEvaluationData" ||
      action === "getEvaluationStatus" ||
      action === "getEvaluationEligibility"
    ) {
      const evaluator = getAuthenticatedEvaluator(
        spreadsheet,
        e.parameter.sessionToken
      );

      if (evaluator.type === "guest") {
        return responseJSON({
          success: false,
          message: "Guests cannot view or submit evaluations."
        });
      }

      const evalSheet = getRequiredSheet(spreadsheet, "Evaluations");
      const evaluatorId = evaluator.type === "student"
        ? evaluator.studentId
        : evaluator.facultyId;

      const allEvaluations = getEvaluationRows(evalSheet);

      const evaluations = allEvaluations.filter(function(evaluation) {
        return String(
          getStudentField(evaluation, ["student id"]) || ""
        ).trim() === evaluatorId;
      });

      if (action === "getEvaluationsForGroup") {
        if (evaluator.type !== "faculty") {
          throw new Error(
            "Only signed-in faculty can view received evaluation details."
          );
        }

        const groupCode = normalizeGroupCode(e.parameter.groupCode);

        if (!groupCode) {
          throw new Error("Group Code is required.");
        }

        const groupEvaluations = allEvaluations.filter(function(evaluation) {
          return normalizeGroupCode(
            getStudentField(evaluation, ["group code"])
          ) === groupCode;
        });

        return responseJSON({
          success: true,
          data: getRatingAnalyticsRows(
            spreadsheet,
            groupEvaluations
          ).map(function(evaluation, index) {
            return {
              ...evaluation,
              Comment: getStudentField(
                groupEvaluations[index],
                ["comment"]
              )
            };
          })
        });
      }

      const groups = action === "getEvaluationEligibility"
        ? getGroupCodes(spreadsheet)
        : null;

      if (action === "getStudentEvaluationData") {
        return responseJSON({
          success: true,
          data: {
            evaluations: evaluations,
            status: getEvaluationStatusData(evaluations.length)
          }
        });
      }

      if (action === "getMyEvaluations" || action === "getEvaluations") {
        const isFacultyAdmin =
          evaluator.type === "faculty" &&
          evaluator.role === "admin";

        return responseJSON({
          success: true,
          data: isFacultyAdmin
            ? getEvaluationRows(evalSheet)
            : evaluations
        });
      }

      if (action === "getEvaluationStatus") {
        return responseJSON({
          success: true,
          data: getEvaluationStatusData(evaluations.length)
        });
      }

      return responseJSON({
        success: true,
        data: getEvaluationEligibility(
          evaluator,
          e.parameter.groupCode,
          evaluations,
          groups,
          spreadsheet
        )
      });
    }

    // GET PROJECTS / GROUPS
    if (action === "getGroups" || action === "getProjects") {
      return responseJSON({
        success: true,
        data: getPublicGroups(spreadsheet).filter(function(project) {
          return String(project.stage || "").trim().toLowerCase() === "posted";
        })
      });
    }

    // GET EVALUATION SETTINGS
    if (action === "getSettings") {
      const sheet = getRequiredSheet(
        spreadsheet,
        "EvaluationSettings"
      );

      const rows = getSheetData(sheet);
      const settings = {};

      rows.forEach(function(row) {
        const setting = String(row.Setting || "").trim();

        if (setting !== "") {
          settings[setting] = row.Value;
        }
      });

      return responseJSON({
        success: true,
        data: settings
      });
    }

    return responseJSON({
      success: false,
      message: "Invalid GET action: " + action
    });

  } catch (error) {
    Logger.log("GET Error: " + error.message);

    return responseJSON({
      success: false,
      message: error.message
    });
  }
}


// =====================================================
// 5. POST REQUEST HANDLER
// =====================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No POST data received.");
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const spreadsheet = getSpreadsheet();


    // -------------------------------------------------
    // A. LOGIN
    // -------------------------------------------------

    if (action === "login") {
      const identifier = String(payload.identifier || "").trim();
      const password = String(payload.password || "").trim();
      const requestedRole = String(payload.role || "").trim();

      if (!identifier || !password || !requestedRole) {
        throw new Error("Please provide your login credentials and role.");
      }

      const role =
        requestedRole.toLowerCase() === "faculty" &&
        identifier.toLowerCase() === "guest"
          ? "Guest"
          : requestedRole;

      const isGuest = role.toLowerCase() === "guest";

      const isFacultyOrAdmin =
        role.toLowerCase() === "faculty" ||
        role.toLowerCase() === "admin";

      if (
        !isFacultyOrAdmin &&
        !isGuest &&
        role.toLowerCase() !== "student"
      ) {
        throw new Error("Invalid login role.");
      }

      // GUEST LOGIN
      if (isGuest) {
        let guestUser = null;
        const guestSheet = spreadsheet.getSheetByName("Guests");

        if (guestSheet) {
          const guests = getSheetData(guestSheet);

          guestUser = guests.find(function(g) {
            const gid = String(
              g.GuestID || g.ID || g.Email || g.Username || ""
            ).trim().toLowerCase();

            const gpass = String(g.Password || "").trim();

            return gid === identifier.toLowerCase() &&
              gpass === password;
          });
        }

        if (!guestUser) {
          const validGuestId = [
            "guest",
            "guest@techcon.edu",
            "guest-001"
          ].indexOf(identifier.toLowerCase()) !== -1;

          const validGuestPass = [
            "guest",
            "techcon123",
            "guest123"
          ].indexOf(password) !== -1;

          if (validGuestId && validGuestPass) {
            guestUser = {
              GuestID: "GUEST-001",
              FullName: "Guest User",
              Role: "Guest"
            };
          }
        }

        if (!guestUser) {
          return responseJSON({
            success: false,
            message: "Invalid credentials for Guest. Use guest / guest."
          });
        }

        const sessionToken = createGuestSession(
          guestUser.GuestID || "GUEST-001"
        );

        return responseJSON({
          success: true,
          sessionToken: sessionToken,
          user: {
            GuestID: guestUser.GuestID || "GUEST-001",
            FullName: guestUser.FullName || "Guest User",
            Role: "Guest"
          },
          role: "guest"
        });
      }

      const sheetName = isFacultyOrAdmin
        ? "Faculty"
        : "Students";

      const sheet = getRequiredSheet(spreadsheet, sheetName);
      const users = getSheetData(sheet);

      const user = users.find(function(u) {
        if (isFacultyOrAdmin) {
          const facultyId = String(u.FacultyID || "").trim();
          const facultyPassword = String(u.Password || "").trim();
          const facultyRole = normalizeFacultyRole(u.Role);

          const matchesCredentials =
            facultyId === identifier &&
            facultyPassword === password;

          const matchesRole = role.toLowerCase() === "faculty"
            ? ["faculty", "adviser", "admin"].indexOf(facultyRole) !== -1
            : facultyRole === role.toLowerCase();

          return matchesCredentials && matchesRole;
        }

        // STUDENT LOGIN
        const studentNo = String(getStudentField(u, [
          "student id",
          "student no.",
          "student number"
        ]) || "").trim();

        const studentName = String(getStudentField(u, [
          "name",
          "name of student",
          "student name",
          "full name"
        ]) || "").trim();

        const memberNo = String(getStudentField(u, [
          "member id",
          "member #",
          "member number"
        ]) || "").trim();

        const studentPin = String(getStudentField(u, [
          "pin",
          "password"
        ]) || "").trim();

        const matchesIdentifier =
          studentNo === identifier ||
          studentName === identifier ||
          memberNo === identifier;

        return matchesIdentifier && studentPin === password;
      });

      if (!user) {
        return responseJSON({
          success: false,
          message: "Invalid ID or Password for " + role + "."
        });
      }

      // FACULTY / ADMIN RESPONSE
      if (isFacultyOrAdmin) {
        const sessionToken = createFacultySession(
          user.FacultyID,
          normalizeFacultyRole(user.Role)
        );

        return responseJSON({
          success: true,
          sessionToken: sessionToken,
          user: {
            FacultyID: user.FacultyID,
            FullName: user.FullName,
            Role: user.Role
          },
          role: normalizeFacultyRole(user.Role)
        });
      }

      // STUDENT RESPONSE
      const studentId = String(getStudentField(user, [
        "student id",
        "student no.",
        "student number"
      ]) || "").trim();

      if (!studentId) {
        throw new Error(
          "The authenticated student does not have a StudentID."
        );
      }

      const sessionToken = createStudentSession(studentId);

      return responseJSON({
        success: true,
        sessionToken: sessionToken,
        user: {
          StudentID: studentId,
          StudentNo: studentId,
          FullName: getStudentField(user, [
            "name",
            "name of student",
            "student name",
            "full name"
          ]),
          GroupCode: getStudentField(user, [
            "team code",
            "group code",
            "groupcode"
          ]),
          Program: getStudentField(user, [
            "course",
            "program"
          ]),
          Sec: getStudentField(user, [
            "section",
            "sec"
          ])
        },
        role: "student"
      });
    }


    // -------------------------------------------------
    // B. SUBMIT EVALUATION
    // -------------------------------------------------

    if (action === "submitEvaluation") {
      const evalSheet = getRequiredSheet(
        spreadsheet,
        "Evaluations"
      );

      const lock = LockService.getScriptLock();
      lock.waitLock(10000);

      try {
        const evaluator = getAuthenticatedEvaluator(
          spreadsheet,
          payload.sessionToken
        );

        if (evaluator.type === "guest") {
          throw new Error("Guests cannot evaluate projects.");
        }

        const requestedGroupCode = String(
          payload.groupCode || ""
        ).trim();

        if (!requestedGroupCode) {
          throw new Error("Group Code is required.");
        }

        const comment = payload.comment === undefined
          ? ""
          : payload.comment;

        if (typeof comment !== "string") {
          throw new Error("Comment must be text.");
        }

        if (comment.trim().length > 500) {
          throw new Error(
            "Comment must be 500 characters or fewer."
          );
        }

        const groupsSheet = getRequiredSheet(
          spreadsheet,
          "Groups"
        );

        const groupsData = getSheetData(groupsSheet);

        const group = groupsData.find(function(candidate) {
          return normalizeGroupCode(
            getStudentField(candidate, [
              "group code",
              "groupcode"
            ])
          ) === normalizeGroupCode(requestedGroupCode);
        });

        if (!group) {
          throw new Error("This project group could not be found.");
        }

        const project = getPublicGroups(spreadsheet).find(function(candidate) {
          return normalizeGroupCode(candidate.groupCode) ===
            normalizeGroupCode(requestedGroupCode);
        });

        if (!project) {
          throw new Error("This project group could not be found.");
        }

        const rubricRatings = validateEvaluationSubcriteria(
          project,
          payload.subcriteriaRatings
        );
        const categoryRatings = calculateRubricCategoryAverages(rubricRatings);
        const availableCategories = evaluationRubricCategories().filter(function(category) {
          return categoryRatings[category.ratingField] !== "";
        }).length;

        if (availableCategories === 0) {
          throw new Error("This project has no submitted resources to evaluate.");
        }

        const groupCode = getStudentField(group, [
          "group code",
          "groupcode"
        ]);

        if (evaluator.type === "student") {
          if (
            normalizeGroupCode(evaluator.groupCode) ===
            normalizeGroupCode(groupCode)
          ) {
            throw new Error("You cannot evaluate your own group.");
          }
        } else if (evaluator.type === "faculty") {
          const adviser = String(
            getStudentField(group, ["adviser"]) || ""
          ).trim().toLowerCase();

          const facultyId = String(
            evaluator.facultyId || ""
          ).trim().toLowerCase();

          const facultyName = String(
            evaluator.fullName || ""
          ).trim().toLowerCase();

          if (
            adviser &&
            (adviser === facultyId || adviser === facultyName)
          ) {
            throw new Error(
              "Faculty advisers cannot evaluate groups assigned to them."
            );
          }
        }

        const evaluatorId = evaluator.type === "student"
          ? evaluator.studentId
          : evaluator.facultyId;

        const evaluations = getEvaluationRows(evalSheet);

        const mine = evaluations.filter(function(evaluation) {
          return String(
            getStudentField(evaluation, ["student id"]) || ""
          ).trim() === evaluatorId;
        });

        if (mine.some(function(evaluation) {
          return normalizeGroupCode(
            getStudentField(evaluation, ["group code"])
          ) === normalizeGroupCode(groupCode);
        })) {
          throw new Error("You have already evaluated this group.");
        }

        const evaluationId = generateEvaluationId(evalSheet);
        const detailsSheet = getEvaluationDetailsSheet(spreadsheet, true);

        const submittedAt = Utilities.formatDate(
          new Date(),
          "Asia/Manila",
          "yyyy-MM-dd HH:mm:ss"
        );

        const evaluation = {
          EvaluationID: evaluationId,
          StudentID: evaluatorId,
          GroupCode: groupCode,
          PitchVideoRating: categoryRatings.PitchVideoRating,
          PosterRating: categoryRatings.PosterRating,
          LogoRating: categoryRatings.LogoRating,
          Comment: comment.trim(),
          SubmittedAt: submittedAt
        };

        deleteEvaluationDetailsForId(detailsSheet, evaluationId);
        try {
          rubricRatings.forEach(function(detail) {
            detailsSheet.appendRow([
              evaluationId,
              detail.criterion,
              detail.subcriterion,
              detail.rating === null ? "" : detail.rating
            ]);
          });

          evalSheet.appendRow(
            getEvaluationHeaders(evalSheet).map(function(header) {
              return getStudentField(evaluation, [header]);
            })
          );
        } catch (writeError) {
          const evaluationWasWritten = getEvaluationRows(evalSheet).some(function(row) {
            return String(getStudentField(row, ["evaluation id"]) || "") === evaluationId;
          });
          if (!evaluationWasWritten) {
            try {
              deleteEvaluationDetailsForId(detailsSheet, evaluationId);
            } catch (cleanupError) {
              Logger.log(
                "Could not roll back evaluation detail rows for " +
                evaluationId +
                ": " +
                cleanupError.message
              );
              throw new Error(
                "Evaluation submission failed and its detail rows could not be rolled back. " +
                "Contact an administrator before retrying."
              );
            }
          }
          throw writeError;
        }

        return responseJSON({
          success: true,
          evaluationId: evaluationId,
          submittedAt: submittedAt
        });

      } finally {
        lock.releaseLock();
      }
    }


    // -------------------------------------------------
    // C. UPDATE EVALUATION SETTINGS
    // -------------------------------------------------

    if (action === "updateSettings") {
      const settingsSheet = getRequiredSheet(
        spreadsheet,
        "EvaluationSettings"
      );

      const setting = String(payload.setting || "").trim();

      if (!setting) {
        throw new Error("Setting name is required.");
      }

      const data = settingsSheet.getDataRange().getValues();
      let settingFound = false;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === setting) {
          settingsSheet.getRange(i + 1, 2).setValue(payload.value);
          settingFound = true;
          break;
        }
      }

      if (!settingFound) {
        throw new Error("Setting not found: " + setting);
      }

      return responseJSON({
        success: true,
        message: "Evaluation setting updated successfully."
      });
    }


    // -------------------------------------------------
    // D. UPDATE GROUP DESCRIPTION
    // -------------------------------------------------

    if (action === "updateGroupDescription") {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);

      try {
        const student = getAuthenticatedStudent(
          spreadsheet,
          payload.sessionToken
        );

        const groupCode = normalizeGroupCode(student.groupCode);

        if (!groupCode) {
          throw new Error("You are not currently assigned to a group.");
        }

        if (typeof payload.description !== "string") {
          throw new Error("The group description must be text.");
        }

        const description = payload.description.trim();

        if (description.length > 2000) {
          throw new Error(
            "The group description must be 2000 characters or fewer."
          );
        }

        const groupsSheet = getRequiredSheet(
          spreadsheet,
          "Groups"
        );

        const values = groupsSheet.getDataRange().getValues();

        if (values.length < 2) {
          throw new Error(
            "The Groups sheet does not contain any project rows."
          );
        }

        const headers = values[0].map(function(header) {
          return String(header).trim();
        });

        const groupCodeIndex = getHeaderIndex(
          headers,
          ["group code", "groupcode"]
        );

        const descriptionIndex = getHeaderIndex(
          headers,
          ["description"]
        );

        if (groupCodeIndex < 0 || descriptionIndex < 0) {
          throw new Error(
            "The Groups sheet must contain GROUP CODE and DESCRIPTION columns."
          );
        }

        let targetRow = -1;

        for (let i = 1; i < values.length; i++) {
          if (
            normalizeGroupCode(values[i][groupCodeIndex]) === groupCode
          ) {
            targetRow = i + 1;
            break;
          }
        }

        if (targetRow < 0) {
          throw new Error("Your assigned group could not be found.");
        }

        const overridesSheet = getRequiredSheet(
          spreadsheet,
          "GroupOverrides"
        );
        const overrideValues = overridesSheet.getDataRange().getValues();
        const overrideColumns = getGroupOverrideColumns(overridesSheet);
        const matchingRows = [];
        for (let i = 1; i < overrideValues.length; i++) {
          if (
            normalizeGroupCode(overrideValues[i][overrideColumns.groupCode]) ===
            groupCode
          ) {
            matchingRows.push(i + 1);
          }
        }

        const updatedAt = new Date();
        if (matchingRows.length > 0) {
          const targetOverrideRow = matchingRows[0];
          overridesSheet
            .getRange(targetOverrideRow, overrideColumns.groupCode + 1)
            .setValue(String(student.groupCode).trim());
          overridesSheet
            .getRange(targetOverrideRow, overrideColumns.description + 1)
            .setValue(description);
          overridesSheet
            .getRange(targetOverrideRow, overrideColumns.updatedAt + 1)
            .setValue(updatedAt);

          matchingRows.slice(1).reverse().forEach(function(rowNumber) {
            overridesSheet.deleteRow(rowNumber);
          });
        } else {
          const overrideHeaders = overridesSheet
            .getRange(1, 1, 1, overridesSheet.getLastColumn())
            .getDisplayValues()[0]
            .map(function(header) {
              return String(header).trim();
            });
          const newOverride = new Array(overrideHeaders.length).fill("");
          newOverride[overrideColumns.groupCode] = String(student.groupCode).trim();
          newOverride[overrideColumns.description] = description;
          newOverride[overrideColumns.updatedAt] = updatedAt;
          overridesSheet.appendRow(newOverride);
        }

        return responseJSON({
          success: true,
          message: "Group description updated successfully.",
          description: description
        });

      } finally {
        lock.releaseLock();
      }
    }

    if (action === "uploadThumbnail" || action === "deleteThumbnail") {
      throw new Error("Project thumbnails are managed through the Groups sheet.");
    }


    // -------------------------------------------------
    // E. UPLOAD PROJECT THUMBNAIL
    // -------------------------------------------------

    if (action === "uploadThumbnail") {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);

      try {
        const student = getAuthenticatedStudent(
          spreadsheet,
          payload.sessionToken
        );

        const groupCode = normalizeGroupCode(student.groupCode);

        if (!groupCode) {
          throw new Error("You are not currently assigned to a group.");
        }

        const imageData = String(payload.imageData || "");

        const match = imageData.match(
          /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
        );

        if (!match) {
          throw new Error(
            "Please upload a valid JPG, PNG, or WebP image."
          );
        }

        const mimeType = match[1];
        const base64Data = match[2];
        const imageBytes = Utilities.base64Decode(base64Data);

        if (imageBytes.length > 2 * 1024 * 1024) {
          throw new Error("Image size must not exceed 2 MB.");
        }

        const folderId = PropertiesService
          .getScriptProperties()
          .getProperty("THUMBNAIL_FOLDER_ID");

        if (!folderId) {
          throw new Error(
            "THUMBNAIL_FOLDER_ID is missing from Script Properties."
          );
        }

        const folder = DriveApp.getFolderById(folderId);

        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp"
        }[mimeType];

        const groupsSheet = getRequiredSheet(
          spreadsheet,
          "Groups"
        );

        const values = groupsSheet.getDataRange().getValues();

        if (values.length < 2) {
          throw new Error(
            "The Groups sheet does not contain any project rows."
          );
        }

        const headers = values[0].map(function(header) {
          return String(header).trim();
        });

        const groupCodeIndex = getHeaderIndex(
          headers,
          ["group code", "groupcode"]
        );

        const thumbnailIndex = getHeaderIndex(
          headers,
          ["logo", "thumbnail"]
        );

        if (groupCodeIndex < 0 || thumbnailIndex < 0) {
          throw new Error(
            "The Groups sheet must contain GROUP CODE and LOGO columns."
          );
        }

        let targetRow = -1;

        for (let i = 1; i < values.length; i++) {
          if (
            normalizeGroupCode(values[i][groupCodeIndex]) === groupCode
          ) {
            targetRow = i + 1;
            break;
          }
        }

        if (targetRow < 0) {
          throw new Error("Your assigned group could not be found.");
        }

        const thumbnailCell = groupsSheet.getRange(
          targetRow,
          thumbnailIndex + 1
        );

        const existingThumbnailUrl = String(
          thumbnailCell.getValue() || ""
        ).trim();

        const fileName = "thumbnail_" + groupCode + "." + extension;

        const blob = Utilities.newBlob(
          imageBytes,
          mimeType,
          fileName
        );

        const file = replaceGroupThumbnailFile(
          folder,
          folderId,
          groupCode,
          existingThumbnailUrl,
          blob,
          fileName
        );

        const thumbnailUrl =
          "https://drive.google.com/thumbnail?id=" +
          file.getId() +
          "&sz=w1200&v=" +
          new Date().getTime();

        thumbnailCell.setValue(thumbnailUrl);

        return responseJSON({
          success: true,
          message: "Project thumbnail uploaded successfully.",
          thumbnail: thumbnailUrl
        });

      } finally {
        lock.releaseLock();
      }
    }


    // -------------------------------------------------
    // F. DELETE PROJECT THUMBNAIL
    // -------------------------------------------------

    if (action === "deleteThumbnail") {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);

      try {
        const student = getAuthenticatedStudent(
          spreadsheet,
          payload.sessionToken
        );

        const groupCode = normalizeGroupCode(student.groupCode);

        if (!groupCode) {
          throw new Error("You are not currently assigned to a group.");
        }

        const groupsSheet = getRequiredSheet(
          spreadsheet,
          "Groups"
        );

        const values = groupsSheet.getDataRange().getValues();

        if (values.length < 2) {
          throw new Error(
            "The Groups sheet does not contain any project rows."
          );
        }

        const headers = values[0].map(function(header) {
          return String(header).trim();
        });

        const groupCodeIndex = getHeaderIndex(
          headers,
          ["group code", "groupcode"]
        );

        const thumbnailIndex = getHeaderIndex(
          headers,
          ["logo", "thumbnail"]
        );

        if (groupCodeIndex < 0 || thumbnailIndex < 0) {
          throw new Error(
            "The Groups sheet must contain GROUP CODE and LOGO columns."
          );
        }

        let targetRow = -1;

        for (let i = 1; i < values.length; i++) {
          if (
            normalizeGroupCode(values[i][groupCodeIndex]) === groupCode
          ) {
            targetRow = i + 1;
            break;
          }
        }

        if (targetRow < 0) {
          throw new Error("Your assigned group could not be found.");
        }

        const thumbnailCell = groupsSheet.getRange(
          targetRow,
          thumbnailIndex + 1
        );

        const thumbnailUrl = String(
          thumbnailCell.getValue() || ""
        ).trim();

        if (thumbnailUrl) {
          const fileId = getThumbnailFileId(thumbnailUrl);

          const folderId = PropertiesService
            .getScriptProperties()
            .getProperty("THUMBNAIL_FOLDER_ID");

          if (!folderId) {
            throw new Error(
              "THUMBNAIL_FOLDER_ID is missing from Script Properties."
            );
          }

          const file = DriveApp.getFileById(fileId);

          if (!thumbnailFileBelongsToFolder(file, folderId)) {
            throw new Error(
              "The saved thumbnail is not in the configured thumbnail folder."
            );
          }

          file.setTrashed(true);
          thumbnailCell.clearContent();
        }

        return responseJSON({
          success: true,
          message: "Project thumbnail deleted successfully.",
          thumbnail: null
        });

      } finally {
        lock.releaseLock();
      }
    }


    // -------------------------------------------------
    // INVALID POST ACTION
    // -------------------------------------------------

    return responseJSON({
      success: false,
      message: "Invalid POST action: " + action
    });

  } catch (error) {
    Logger.log("POST Error: " + error.message);

    return responseJSON({
      success: false,
      message: error.message
    });
  }
}


// =====================================================
// 6. AUTHENTICATION AND SESSION HELPERS
// =====================================================

function createStudentSession(studentId) {
  if (!studentId) {
    throw new Error(
      "The authenticated student does not have a StudentID."
    );
  }

  const sessionToken = Utilities.getUuid();

  CacheService.getScriptCache().put(
    "student-session:" + sessionToken,
    JSON.stringify({ studentId: studentId }),
    21600
  );

  return sessionToken;
}


function createFacultySession(facultyId, role) {
  const normalizedFacultyId = String(facultyId || "").trim();

  if (!normalizedFacultyId) {
    throw new Error(
      "The authenticated faculty does not have a FacultyID."
    );
  }

  const sessionToken = Utilities.getUuid();

  CacheService.getScriptCache().put(
    "faculty-session:" + sessionToken,
    JSON.stringify({
      facultyId: normalizedFacultyId,
      role: role
    }),
    21600
  );

  return sessionToken;
}


function createGuestSession(guestId) {
  const sessionToken = Utilities.getUuid();

  CacheService.getScriptCache().put(
    "guest-session:" + sessionToken,
    JSON.stringify({
      guestId: guestId || "GUEST-001"
    }),
    21600
  );

  return sessionToken;
}


function getAuthenticatedAdmin(sessionToken) {
  const token = String(sessionToken || "").trim();

  if (!token) {
    throw new Error(
      "A valid session is required. Please sign in again."
    );
  }

  const sessionData = CacheService.getScriptCache().get(
    "faculty-session:" + token
  );

  if (!sessionData) {
    throw new Error(
      "Your session has expired. Please sign in again."
    );
  }

  let session;

  try {
    session = JSON.parse(sessionData);
  } catch (error) {
    throw new Error(
      "Your faculty session is invalid. Please sign in again."
    );
  }

  if (
    !String(session.facultyId || "").trim() ||
    normalizeFacultyRole(session.role) !== "admin"
  ) {
    throw new Error(
      "Only faculty administrators can view rating analytics."
    );
  }

  return {
    type: "faculty",
    facultyId: String(session.facultyId).trim(),
    role: "admin"
  };
}


function getAuthenticatedFacultyForEvaluationHistory(
  spreadsheet,
  sessionToken
) {
  const token = String(sessionToken || "").trim();

  const sessionData = token
    ? CacheService.getScriptCache().get("faculty-session:" + token)
    : null;

  if (!sessionData) {
    throw new Error(
      "A valid faculty session is required. Please sign in again."
    );
  }

  let session;

  try {
    session = JSON.parse(sessionData);
  } catch (error) {
    throw new Error(
      "Your faculty session is invalid. Please sign in again."
    );
  }

  if (normalizeFacultyRole(session.role) === "admin") {
    return getAuthenticatedAdmin(token);
  }

  const evaluator = getAuthenticatedEvaluator(
    spreadsheet,
    token
  );

  if (evaluator.type !== "faculty") {
    throw new Error(
      "Only signed-in faculty can view their evaluations."
    );
  }

  return evaluator;
}


function getAuthenticatedEvaluator(spreadsheet, sessionToken) {
  const token = String(sessionToken || "").trim();

  if (!token) {
    throw new Error(
      "A valid session is required. Please sign in again."
    );
  }

  // GUEST SESSION
  const guestData = CacheService.getScriptCache().get(
    "guest-session:" + token
  );

  if (guestData) {
    return {
      type: "guest",
      guestId: "GUEST-001"
    };
  }

  // FACULTY SESSION
  const facultyData = CacheService.getScriptCache().get(
    "faculty-session:" + token
  );

  if (facultyData) {
    let parsed;

    try {
      parsed = JSON.parse(facultyData);
    } catch (error) {
      throw new Error(
        "Your faculty session is invalid. Please sign in again."
      );
    }

    const facultySheet = getRequiredSheet(
      spreadsheet,
      "Faculty"
    );

    const facultyMembers = getSheetData(facultySheet);
    const sessionFacultyId = String(
      parsed.facultyId || ""
    ).trim();

    if (!sessionFacultyId) {
      throw new Error(
        "Your faculty session is invalid. Please sign in again."
      );
    }

    const member = facultyMembers.find(function(f) {
      return String(f.FacultyID || "").trim() === sessionFacultyId;
    });

    if (!member) {
      throw new Error(
        "The faculty account for this session could not be found."
      );
    }

    return {
      type: "faculty",
      facultyId: String(member.FacultyID || "").trim(),
      fullName: String(member.FullName || "").trim(),
      role: normalizeFacultyRole(member.Role)
    };
  }

  // STUDENT SESSION
  const student = getAuthenticatedStudent(
    spreadsheet,
    token
  );

  return {
    type: "student",
    studentId: student.studentId,
    groupCode: student.groupCode
  };
}


function getAuthenticatedStudent(spreadsheet, sessionToken) {
  const token = String(sessionToken || "").trim();

  if (!token) {
    throw new Error(
      "A valid student session is required. Please sign in again."
    );
  }

  const sessionData = CacheService.getScriptCache().get(
    "student-session:" + token
  );

  if (!sessionData) {
    throw new Error(
      "Your student session has expired. Please sign in again."
    );
  }

  let session;

  try {
    session = JSON.parse(sessionData);
  } catch (error) {
    throw new Error(
      "Your student session is invalid. Please sign in again."
    );
  }

  const students = getSheetData(
    getRequiredSheet(spreadsheet, "Students")
  );

  const student = students.find(function(record) {
    const id = String(getStudentField(record, [
      "student id",
      "student no.",
      "student number"
    ]) || "").trim();

    return id === session.studentId;
  });

  if (!student) {
    throw new Error(
      "The student account for this session could not be found."
    );
  }

  return {
    studentId: String(getStudentField(student, [
      "student id",
      "student no.",
      "student number"
    ]) || "").trim(),

    groupCode: String(getStudentField(student, [
      "team code",
      "group code",
      "groupcode"
    ]) || "").trim()
  };
}


// =====================================================
// 7. EVALUATION HELPERS
// =====================================================

const EVALUATION_HEADERS = [
  "EvaluationID",
  "StudentID",
  "GroupCode",
  "PitchVideoRating",
  "PosterRating",
  "LogoRating",
  "Comment",
  "SubmittedAt"
];

const EVALUATION_DETAILS_HEADERS = [
  "EvaluationID",
  "Criterion",
  "Subcriterion",
  "Rating"
];

const EVALUATION_RUBRIC = [
  {
    criterion: "Project Logo",
    resourceField: "thumbnail",
    ratingField: "LogoRating",
    subcriteria: [
      { id: "logo_relevance_identity", label: "Relevance and Identity" },
      { id: "logo_creativity_originality", label: "Creativity and Originality" },
      { id: "logo_visual_appeal_clarity", label: "Visual Appeal and Clarity" }
    ]
  },
  {
    criterion: "Project Poster",
    resourceField: "documentationLink",
    ratingField: "PosterRating",
    subcriteria: [
      { id: "poster_content_relevance", label: "Content and Relevance" },
      { id: "poster_visual_design_organization", label: "Visual Design and Organization" },
      { id: "poster_clarity_communication", label: "Clarity and Communication" }
    ]
  },
  {
    criterion: "Video Pitch",
    resourceField: "pitchVideoLink",
    ratingField: "PitchVideoRating",
    subcriteria: [
      { id: "video_content_message", label: "Content and Message" },
      { id: "video_presentation_engagement", label: "Presentation and Engagement" },
      { id: "video_production_quality", label: "Production Quality" }
    ]
  }
];


function getEvaluationHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();

  const headers = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn)
        .getDisplayValues()[0]
        .map(function(header) {
          return String(header).trim();
        })
    : [];

  const hasLegacyResearchPaperRating =
    getHeaderIndex(headers, ["ResearchPaperRating"]) !== -1;
  const expectedHeaderCount = EVALUATION_HEADERS.length +
    (hasLegacyResearchPaperRating ? 1 : 0);

  if (
    headers.length !== expectedHeaderCount ||
    !EVALUATION_HEADERS.every(function(header) {
      return getHeaderIndex(headers, [header]) !== -1;
    })
  ) {
    throw new Error(
      "The Evaluations sheet must include these columns: " +
      EVALUATION_HEADERS.join(", ")
    );
  }

  return headers;
}


function getEvaluationRows(sheet) {
  getEvaluationHeaders(sheet);
  return getSheetData(sheet);
}

function evaluationRubricCategories() {
  return EVALUATION_RUBRIC;
}

function getEvaluationDetailsSheet(spreadsheet, required) {
  const sheet = spreadsheet.getSheetByName("EvaluationDetails");
  if (!sheet) {
    if (required) {
      throw new Error(
        "EvaluationDetails sheet not found. Create it with the headers: " +
        EVALUATION_DETAILS_HEADERS.join(", ")
      );
    }
    return null;
  }

  const lastColumn = sheet.getLastColumn();
  const headers = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function(header) {
      return String(header);
    })
    : [];
  if (
    headers.length !== EVALUATION_DETAILS_HEADERS.length ||
    !EVALUATION_DETAILS_HEADERS.every(function(header, index) {
      return headers[index] === header;
    })
  ) {
    throw new Error(
      "The EvaluationDetails sheet must have these exact headers in order: " +
      EVALUATION_DETAILS_HEADERS.join(", ")
    );
  }

  return sheet;
}

function validateEvaluationSubcriteria(project, submittedRatings) {
  if (!submittedRatings || typeof submittedRatings !== "object" || Array.isArray(submittedRatings)) {
    throw new Error("Please rate each submitted rubric subcriterion.");
  }

  const details = [];
  EVALUATION_RUBRIC.forEach(function(category) {
    const hasSubmission = hasValidResourceUrl(project[category.resourceField]);
    category.subcriteria.forEach(function(subcriterion) {
      const value = submittedRatings[subcriterion.id];
      let rating = null;
      if (hasSubmission) {
        rating = validateRating(value);
      } else if (value !== undefined && value !== null && value !== "") {
        throw new Error(
          category.criterion + " has not been submitted and cannot be rated."
        );
      }

      details.push({
        id: subcriterion.id,
        criterion: category.criterion,
        subcriterion: subcriterion.label,
        rating: rating
      });
    });
  });
  return details;
}

function calculateRubricCategoryAverages(details) {
  const averages = {};
  EVALUATION_RUBRIC.forEach(function(category) {
    const ratings = details
      .filter(function(detail) {
        return detail.criterion === category.criterion && detail.rating !== null;
      })
      .map(function(detail) {
        return detail.rating;
      });
    averages[category.ratingField] = ratings.length
      ? Math.round(
        (ratings.reduce(function(total, rating) {
          return total + rating;
        }, 0) / ratings.length) * 100
      ) / 100
      : "";
  });
  return averages;
}

function deleteEvaluationDetailsForId(sheet, evaluationId) {
  const values = sheet.getDataRange().getValues();
  const evaluationIdIndex = EVALUATION_DETAILS_HEADERS.indexOf("EvaluationID");
  for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    if (String(values[rowIndex][evaluationIdIndex] || "") === evaluationId) {
      sheet.deleteRow(rowIndex + 1);
    }
  }
}

function getEvaluationSubcriteriaById(spreadsheet, evaluations) {
  const sheet = getEvaluationDetailsSheet(spreadsheet, false);
  const ratingsByEvaluation = {};
  evaluations.forEach(function(evaluation) {
    const evaluationId = String(getStudentField(evaluation, ["evaluation id"]) || "");
    if (evaluationId) ratingsByEvaluation[evaluationId] = {};
  });
  if (!sheet) return ratingsByEvaluation;

  const rows = getSheetData(sheet);
  const subcriterionByLabel = {};
  EVALUATION_RUBRIC.forEach(function(category) {
    category.subcriteria.forEach(function(subcriterion) {
      subcriterionByLabel[
        normalizeHeader(category.criterion) + "|" + normalizeHeader(subcriterion.label)
      ] = subcriterion.id;
    });
  });
  rows.forEach(function(row) {
    const evaluationId = String(getStudentField(row, ["evaluation id"]) || "");
    const key = normalizeHeader(getStudentField(row, ["criterion"])) +
      "|" + normalizeHeader(getStudentField(row, ["subcriterion"]));
    const subcriterionId = subcriterionByLabel[key];
    if (!subcriterionId || !ratingsByEvaluation[evaluationId]) return;

    const value = getStudentField(row, ["rating"]);
    ratingsByEvaluation[evaluationId][subcriterionId] =
      value === "" || value === null || value === undefined ? null : Number(value);
  });

  return ratingsByEvaluation;
}


function generateEvaluationId(sheet) {
  const lastRow = sheet.getLastRow();

  const idColumn = getHeaderIndex(
    getEvaluationHeaders(sheet),
    ["evaluation id"]
  ) + 1;

  if (lastRow <= 1) {
    return "EV-0001";
  }

  const existingIds = sheet
    .getRange(2, idColumn, lastRow - 1, 1)
    .getDisplayValues()
    .flat();

  let highestNumber = 0;

  existingIds.forEach(function(id) {
    const match = String(id).trim().match(/^EV-(\d+)$/);

    if (match) {
      const number = Number(match[1]);

      if (number > highestNumber) {
        highestNumber = number;
      }
    }
  });

  return "EV-" + String(highestNumber + 1).padStart(4, "0");
}


function validateRating(value) {
  if (
    typeof value !== "number" ||
    !isFinite(value) ||
    Math.floor(value) !== value ||
    value < 1 ||
    value > 5
  ) {
    throw new Error(
      "Ratings must be whole numbers from 1 to 5."
    );
  }

  return value;
}

function hasValidResourceUrl(value) {
  if (typeof value !== "string") return false;
  const resource = value.trim();
  if (!resource) return false;

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(resource);
  const looksLikeWebHost =
    /^(?:www\.)?[a-z\d](?:[a-z\d.-]*[a-z\d])?\.[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(resource);
  if (!hasScheme && !looksLikeWebHost) return false;

  const url = hasScheme ? resource : "https://" + resource;
  const match = url.match(/^(https?):\/\/([^/?#\s]+)(?:[/?#]|$)/i);
  return Boolean(match && match[2] && match[2].indexOf("@") === -1);
}


function getEvaluationStatusData(submitted) {
  return {
    submitted: submitted
  };
}


function getRatingAnalyticsRows(spreadsheet, evaluations) {
  const students = getSheetData(
    getRequiredSheet(spreadsheet, "Students")
  );

  const faculty = getSheetData(
    getRequiredSheet(spreadsheet, "Faculty")
  );

  const studentIds = new Set(
    students.map(function(student) {
      return String(getStudentField(student, [
        "student id",
        "student no.",
        "student number"
      ]) || "").trim();
    }).filter(Boolean)
  );

  const facultyIds = new Set(
    faculty.map(function(member) {
      return String(getStudentField(member, [
        "faculty id",
        "facultyid"
      ]) || "").trim();
    }).filter(Boolean)
  );

  return evaluations.map(function(evaluation) {
    const evaluatorId = String(
      getStudentField(evaluation, ["student id"]) || ""
    ).trim();

    const evaluatorType = studentIds.has(evaluatorId)
      ? "student"
      : facultyIds.has(evaluatorId)
        ? "faculty"
        : "unknown";

    return {
      EvaluationID: getStudentField(evaluation, ["evaluation id"]),
      StudentID: evaluatorId,
      GroupCode: getStudentField(evaluation, ["group code"]),
      PitchVideoRating: getStudentField(
        evaluation,
        ["pitch video rating"]
      ),
      PosterRating: getStudentField(
        evaluation,
        ["poster rating"]
      ),
      LogoRating: getStudentField(
        evaluation,
        ["logo rating"]
      ),
      SubmittedAt: getStudentField(
        evaluation,
        ["submitted at"]
      ),
      EvaluatorType: evaluatorType
    };
  });
}


function getEvaluationEligibility(
  evaluator,
  groupCode,
  evaluations,
  groups,
  spreadsheet
) {
  if (evaluator.type === "guest") {
    return {
      canEvaluate: false,
      code: "guest",
      reason: "Guests cannot evaluate projects.",
      submitted: 0
    };
  }

  const requestedGroupCode = normalizeGroupCode(groupCode);

  const foundGroup = groups.some(function(candidate) {
    return normalizeGroupCode(candidate) === requestedGroupCode;
  });

  const submitted = evaluations.length;

  const existing = evaluations.some(function(evaluation) {
    return normalizeGroupCode(
      getStudentField(evaluation, ["group code"])
    ) === requestedGroupCode;
  });

  let reason = "";
  let code = "ok";

  if (!foundGroup) {
    code = "missing-group";
    reason = "This project group could not be found.";

  } else if (
    evaluator.type === "student" &&
    normalizeGroupCode(evaluator.groupCode) === requestedGroupCode
  ) {
    code = "own-group";
    reason = "You cannot evaluate your own group.";

  } else if (
    evaluator.type === "faculty" &&
    spreadsheet
  ) {
    const groupsSheet = getRequiredSheet(
      spreadsheet,
      "Groups"
    );

    const groupsData = getSheetData(groupsSheet);

    const targetGroup = groupsData.find(function(group) {
      return normalizeGroupCode(
        getStudentField(group, ["group code", "groupcode"])
      ) === requestedGroupCode;
    });

    if (targetGroup) {
      const adviser = String(
        getStudentField(targetGroup, ["adviser"]) || ""
      ).trim().toLowerCase();

      const facultyId = String(
        evaluator.facultyId || ""
      ).trim().toLowerCase();

      const facultyName = String(
        evaluator.fullName || ""
      ).trim().toLowerCase();

      if (
        adviser &&
        (adviser === facultyId || adviser === facultyName)
      ) {
        code = "assigned-team";
        reason = "Faculty advisers cannot evaluate groups assigned to them.";
      }
    }
  }

  if (code === "ok" && existing) {
    code = "duplicate";
    reason = "You have already evaluated this group.";
  }

  return {
    canEvaluate: code === "ok",
    code: code,
    reason: reason,
    ...getEvaluationStatusData(submitted)
  };
}


// =====================================================
// 8. THUMBNAIL / GOOGLE DRIVE HELPERS
// =====================================================

function replaceGroupThumbnailFile(
  folder,
  folderId,
  groupCode,
  existingThumbnailUrl,
  blob,
  fileName
) {
  const existingFiles = findGroupThumbnailFiles(
    folder,
    groupCode
  );

  const referencedFile = findReferencedThumbnailFile(
    existingThumbnailUrl,
    folderId
  );

  if (
    referencedFile &&
    !existingFiles.some(function(candidate) {
      return candidate.getId() === referencedFile.getId();
    })
  ) {
    existingFiles.push(referencedFile);
  }

  const file = folder.createFile(blob);
  file.setName(fileName);

  existingFiles.forEach(function(candidate) {
    if (
      candidate.getId() !== file.getId() &&
      !candidate.isTrashed()
    ) {
      candidate.setTrashed(true);
    }
  });

  return file;
}


function findReferencedThumbnailFile(thumbnailUrl, folderId) {
  if (!thumbnailUrl) return null;

  let fileId;

  try {
    fileId = getThumbnailFileId(thumbnailUrl);
  } catch (error) {
    return null;
  }

  let file;

  try {
    file = DriveApp.getFileById(fileId);
  } catch (error) {
    return null;
  }

  if (file.isTrashed()) return null;

  if (!thumbnailFileBelongsToFolder(file, folderId)) {
    throw new Error(
      "The saved thumbnail is not in the configured thumbnail folder."
    );
  }

  return file;
}


function findGroupThumbnailFiles(folder, groupCode) {
  const matches = [];
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();

    if (
      !file.isTrashed() &&
      isGroupThumbnailFileName(file.getName(), groupCode)
    ) {
      matches.push(file);
    }
  }

  return matches;
}


function isGroupThumbnailFileName(name, groupCode) {
  const upperName = String(name || "").toUpperCase();

  const prefix =
    "THUMBNAIL_" + String(groupCode || "").toUpperCase();

  if (upperName.indexOf(prefix) !== 0) return false;

  const nextCharacter = upperName.charAt(prefix.length);

  return nextCharacter === "." || nextCharacter === "_";
}


function thumbnailFileBelongsToFolder(file, folderId) {
  const parents = file.getParents();

  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) {
      return true;
    }
  }

  return false;
}


function getThumbnailFileId(thumbnailUrl) {
  if (
    !/^https:\/\/drive\.google\.com\/(?:thumbnail|uc|file\/d\/)/.test(
      thumbnailUrl
    )
  ) {
    throw new Error("The saved thumbnail URL is invalid.");
  }

  const match = thumbnailUrl.match(
    /(?:[?&]id=|\/file\/d\/)([A-Za-z0-9_-]+)/
  );

  if (!match) {
    throw new Error(
      "The saved thumbnail URL does not contain a valid file ID."
    );
  }

  return match[1];
}


// =====================================================
// 9. AUTHORIZATION TEST FUNCTIONS
// =====================================================

function authorizeDriveAccess() {
  const folder = DriveApp.getFolderById(
    PropertiesService.getScriptProperties()
      .getProperty("THUMBNAIL_FOLDER_ID")
  );

  Logger.log(folder.getName());
}


function authorizeDriveWriteAccess() {
  const folderId = PropertiesService
    .getScriptProperties()
    .getProperty("THUMBNAIL_FOLDER_ID");

  if (!folderId) {
    throw new Error(
      "THUMBNAIL_FOLDER_ID is missing from Script Properties."
    );
  }

  const folder = DriveApp.getFolderById(folderId);

  const testFile = folder.createFile(
    "drive-authorization-test.txt",
    "Temporary authorization test."
  );

  Logger.log("File created: " + testFile.getName());

  testFile.setTrashed(true);

  Logger.log("Drive write authorization successful.");
}


function testEditorExecution() {
  Logger.log("Apps Script editor is working.");
  return "SUCCESS";
}


function testDriveRootWrite() {
  const file = DriveApp.createFile(
    "drive-test.txt",
    "Testing Drive write access."
  );

  Logger.log("Created file: " + file.getName());

  file.setTrashed(true);

  Logger.log("Test successful. File moved to trash.");
}


function authorizeExternalRequest() {
  const response = UrlFetchApp.fetch(
    "https://www.google.com",
    {
      muteHttpExceptions: true
    }
  );

  Logger.log("External request authorization successful.");
  Logger.log("Response code: " + response.getResponseCode());
}
