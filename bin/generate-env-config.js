const { writeFileSync } = require('fs');
const { join } = require('path');

const gitCommitHash = process.env.CF_PAGES_COMMIT_SHA || null;

const content =
`export const gitCommitHash = ${gitCommitHash ? '\'' + gitCommitHash + '\'' : 'null'};
`;

writeFileSync(join(__dirname, '../src/environments/config.ts'), content);
