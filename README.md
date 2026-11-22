# TechCon: Project Showcase and Evaluation System

## App overview

The application is a React/Vite app. Authentication, project listing, evaluation submission and history, faculty group evaluation details, Admin rating analytics, and evaluation settings use the Google Apps Script endpoint configured in `src/config/apiConfig.js`. Ratings, aggregates, and adjustable evaluation settings are read from Google Sheets.

Install the existing dependencies and start the app:

```sh
npm ci
npm run dev
```

Run the production build and lightweight service tests:

```sh
npm run build
npm test
```

Development demo/reset controls and unused sample-data paths have been removed. Browser storage is used for the signed-in session and theme preference, not project, faculty, student, or evaluation records.

## Evaluation API

The student login operation issues a six-hour session token stored in Apps Script cache. Authenticated evaluation operations use that token; the backend looks up the student from the session and does not accept a submitted student ID as identity. Submission rules are checked on the server, and a script lock protects duplicate and five-evaluation-limit checks while writing.

The `Evaluations` tab must include these columns: `EvaluationID, StudentID, GroupCode, PitchVideoRating, PosterRating, LogoRating, Comment, SubmittedAt`. The Apps Script reads and writes by header, so these columns may be in any order. Only Project Logo, Project Poster, and Video Pitch are rated; the three category columns store the equal-weight average of their rubric subcriteria. The former `ResearchPaperRating` column may remain during migration; the backend ignores it and leaves existing values unchanged. Research Paper remains available as a project resource, but is not an evaluation criterion. Create the `EvaluationDetails` tab manually with exactly these headers in order: `EvaluationID, Criterion, Subcriterion, Rating`; the app validates this tab and appends the nine individual subcriterion records for each evaluation but never creates or changes its headers. On a failed detail or parent evaluation write, the backend rolls back the new detail rows where possible. After changing `google-apps-script/Code.gs`, redeploy the Apps Script web app so the endpoint runs the updated backend.

The `Students` sheet uses `NAME, STUDENT ID, COURSE, SECTION, TEAM CODE, MEMBER ID, PIN`. The `Groups` sheet uses `GROUP CODE, SOFTWARE NAME, DESCRIPTION, CATEGORY, ADVISER, Thumbnail, RESEARCH PAPER, VIDEO, POSTER, STATUS`. Header matching ignores capitalization and spaces; `STATUS` may be blank, and only groups whose status is `Posted` are included in project listings (case-insensitive, surrounding spaces ignored). The backend maps `TEAM CODE` to each student's group, `Thumbnail` to the project image, and `RESEARCH PAPER`, `VIDEO`, and `POSTER` to the corresponding project resources. Project thumbnails are read-only and managed in the live sheet. A Thumbnail value may be a single image link or a Google Drive folder link; for folders, the backend selects the alphabetically first PNG, JPG, JPEG, or WEBP image and caches its URL. Empty or inaccessible folders use the standard project image fallback.

Students can edit their own group's description from My Group. The authenticated `updateGroupDescription` operation derives the group from the student's session and saves the description in the `GroupOverrides` sheet (`GroupCode`, `DescriptionOverride`, `UpdatedAt`) without modifying live imported rows in `Groups`. Project reads prefer a matching description override and otherwise use the imported description. Deploy the updated Apps Script backend after changing the sheet headers or backend code.

The Admin Rating Analytics page reads all evaluation records and available rubric details through the authenticated `getRatingAnalytics` operation. The operation is restricted to faculty administrators and classifies each evaluator against the live Faculty and Students sheets; unknown historical IDs and evaluations without rubric detail rows remain accessible. Analytics reports major-category averages, individual-subcriterion averages, strongest/weakest subcriteria, and group-level breakdowns. Other clients receive only empty aggregate data unless signed in as an Admin, consistent with the rating visibility policy. The Groups sheet's `RESEARCH PAPER` column is shown as the Research Paper link.

The default API base URL can be overridden with `VITE_API_URL`. Remaining backend integration includes production deployment and operational monitoring.

## Finalists

The shared Finalists page reads the `PitchPerfectFinalist` and `ResearchFinalist` tabs through the public, read-only `getFinalists` Apps Script action. Both tabs use the `GROUP CODE`, `PROJECT NAME`, `DESCRIPTION`, `CATEGORY`, and `ADVISER` headers; the Research Conference list is mapped by header and ignores its numbering column. Missing sheets or sheets without finalist rows are returned as empty lists. After changing `google-apps-script/Code.gs`, redeploy the Apps Script web app so the endpoint serves the new action.
