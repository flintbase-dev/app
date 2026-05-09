import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  API_OPERATION_TYPES,
  buildGraphQLDocument,
} from '../src/helpers/apiOperations.js';

const appRoot = path.resolve(process.cwd(), '../..');
const frontendRoot = process.cwd();
const backendSource = fs.readFileSync(
  path.join(appRoot, 'router/graphql_api.go'),
  'utf8',
);

const backendOperations = {};
const operationPattern = /\bapi(Query|Mutation)\(\s*"([^"]+)"/g;
let match;
while ((match = operationPattern.exec(backendSource)) !== null) {
  backendOperations[match[2]] = match[1].toLowerCase();
}

const fail = (message) => {
  console.error(message);
  process.exitCode = 1;
};

const forbiddenBackendPatterns = [
  {
    pattern: /\bnewInternalGraphQLAPIRouter\b/,
    message: 'Backend still contains the old internal REST GraphQL router',
  },
  {
    pattern: /\bregisterGraphQLResolverRoutes\b/,
    message: 'Backend still contains REST resolver route registration',
  },
  {
    pattern: /\bhttptest\b/,
    message: 'Backend GraphQL API still forwards through HTTP test transport',
  },
  {
    pattern: /\b(Method|Path):\s*http\.Method|\bPath:\s*"/,
    message:
      'Backend GraphQL operation registry still contains REST method/path metadata',
  },
];

for (const { pattern, message } of forbiddenBackendPatterns) {
  if (pattern.test(backendSource)) {
    fail(message);
  }
}

for (const [operation, operationType] of Object.entries(API_OPERATION_TYPES)) {
  if (!/^[A-Za-z_][0-9A-Za-z_]*$/.test(operation)) {
    fail(`Invalid GraphQL operation name: ${operation}`);
  }
  if (backendOperations[operation] !== operationType) {
    fail(
      `Frontend operation ${operation}:${operationType} does not match backend manifest`,
    );
  }
  const document = buildGraphQLDocument(operation);
  if (
    !document.includes(`${operationType} `) ||
    !document.includes(operation)
  ) {
    fail(`Invalid GraphQL document for ${operation}`);
  }
}

for (const [operation, operationType] of Object.entries(backendOperations)) {
  if (API_OPERATION_TYPES[operation] !== operationType) {
    fail(
      `Backend operation ${operation}:${operationType} is missing from frontend manifest`,
    );
  }
}

const sourceFiles = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(fullPath);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      sourceFiles.push(fullPath);
    }
  }
};
collect(path.join(frontendRoot, 'src'));

const restAPITransportPattern = /\bAPI\.(get|post|put|delete|patch)\s*\(/;
const restPathVariablePattern =
  /\bAPI\.(query|mutation|redirect)\s*\([\s\S]{0,240}\bpath\s*:\s*\{/;
for (const filePath of sourceFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  if (restAPITransportPattern.test(source)) {
    fail(
      `REST-style API transport remains in ${path.relative(frontendRoot, filePath)}`,
    );
  }
  if (restPathVariablePattern.test(source)) {
    fail(
      `REST-style GraphQL path variables remain in ${path.relative(frontendRoot, filePath)}`,
    );
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
