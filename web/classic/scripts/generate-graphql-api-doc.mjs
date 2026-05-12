import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { API_OPERATION_TYPES } from '../src/helpers/apiOperations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const appRoot = path.resolve(frontendRoot, '../..');
const backendPath = path.join(appRoot, 'router/graphql_api.go');
const frontendManifestPath = path.join(
  frontendRoot,
  'src/helpers/apiOperations.js',
);
const outputPath = path.join(appRoot, 'web/new/docs/graphql-api.md');
const command = 'cd web/classic && node ./scripts/generate-graphql-api-doc.mjs';
const checkOnly = process.argv.includes('--check');

const backendSource = fs.readFileSync(backendPath, 'utf8');
const frontendManifestSource = fs.readFileSync(frontendManifestPath, 'utf8');

function findMatching(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (quote !== '`' && char === '\\') {
        index += 1;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error(`No matching ${closeChar} found`);
}

function splitTopLevelArgs(source) {
  const args = [];
  let start = 0;
  let depth = 0;
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (quote !== '`' && char === '\\') {
        index += 1;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      continue;
    }
    if (char === ',' && depth === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  const tail = source.slice(start).trim();
  if (tail) {
    args.push(tail);
  }
  return args;
}

function parseGoStringLiteral(source) {
  const trimmed = source.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    throw new Error(`Expected Go string literal, got ${source}`);
  }
  return JSON.parse(trimmed);
}

function extractStringArgs(source) {
  return [...source.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) =>
    JSON.parse(`"${match[1]}"`),
  );
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function findRegistryBody(source) {
  const marker = 'var graphqlAPIOperations = []apiOperation';
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Could not find ${marker}`);
  }
  const openIndex = source.indexOf('{', markerIndex);
  const closeIndex = findMatching(source, openIndex, '{', '}');
  return {
    body: source.slice(openIndex + 1, closeIndex),
    offset: openIndex + 1,
  };
}

function parseOption(option) {
  const result = {
    auth: [],
    guards: [],
    audit: [],
    activity: [],
    resourceParams: [],
  };

  const add = (key, value) => {
    if (!result[key].includes(value)) {
      result[key].push(value);
    }
  };

  if (option === 'tryUserAuth()') {
    add('auth', 'tryUser');
    add('guards', 'TryUserAuth');
  } else if (option === 'userAuth()') {
    add('auth', 'user');
    add('guards', 'UserAuth');
  } else if (option === 'adminAuth()') {
    add('auth', 'admin');
    add('guards', 'AdminAuth');
  } else if (option === 'rootAuth()') {
    add('auth', 'root');
    add('guards', 'RootAuth');
  } else if (option.startsWith('userActivity(')) {
    const [resource] = extractStringArgs(option);
    add('auth', 'user');
    add('guards', 'UserAuth');
    add('guards', `ActivityMutation(${resource})`);
    add('activity', resource);
  } else if (option.startsWith('adminAudit(')) {
    const [resource] = extractStringArgs(option);
    add('auth', 'admin');
    add('guards', 'AdminAuth');
    add('guards', `AuditMutation(${resource})`);
    add('audit', resource);
  } else if (option.startsWith('rootAudit(')) {
    const [resource] = extractStringArgs(option);
    add('auth', 'root');
    add('guards', 'RootAuth');
    add('guards', `AuditMutation(${resource})`);
    add('audit', resource);
  } else if (option.startsWith('logAuditWithAuth(')) {
    add('guards', 'AuditMutation(log)');
    add('audit', 'log');
    if (option.includes('middleware.AdminAuth()')) {
      add('auth', 'admin');
      add('guards', 'AdminAuth');
    } else if (option.includes('middleware.UserAuth()')) {
      add('auth', 'user');
      add('guards', 'UserAuth');
    } else {
      add('guards', option);
    }
  } else if (option === 'criticalRateLimit()') {
    add('guards', 'CriticalRateLimit');
  } else if (option === 'searchRateLimit()') {
    add('guards', 'SearchRateLimit');
  } else if (option === 'disableCache()') {
    add('guards', 'DisableCache');
  } else if (option === 'hcaptchaCheck()') {
    add('guards', 'HCaptchaCheck');
  } else if (option.startsWith('withResourceParams(')) {
    for (const name of extractStringArgs(option)) {
      add('resourceParams', name);
    }
  } else {
    add('guards', option);
  }

  return result;
}

function mergeMetadata(target, source) {
  for (const key of Object.keys(source)) {
    for (const value of source[key]) {
      if (!target[key].includes(value)) {
        target[key].push(value);
      }
    }
  }
}

function parseBackendOperations(source) {
  const registry = findRegistryBody(source);
  const operations = [];
  const operationPattern = /\bapi(Query|Mutation)\s*\(/g;
  let match;

  while ((match = operationPattern.exec(registry.body)) !== null) {
    const callStart = registry.offset + match.index;
    const openIndex = registry.offset + operationPattern.lastIndex - 1;
    const closeIndex = findMatching(source, openIndex, '(', ')');
    const args = splitTopLevelArgs(source.slice(openIndex + 1, closeIndex));
    const kind = match[1].toLowerCase();
    const name = parseGoStringLiteral(args[0]);
    const handler = args[1];
    const options = args.slice(2);
    const metadata = {
      auth: [],
      guards: [],
      audit: [],
      activity: [],
      resourceParams: [],
    };

    for (const option of options) {
      mergeMetadata(metadata, parseOption(option));
    }

    operations.push({
      name,
      kind,
      handler,
      options,
      auth: metadata.auth,
      guards: metadata.guards,
      audit: metadata.audit,
      activity: metadata.activity,
      resourceParams: metadata.resourceParams,
      line: lineNumberAt(source, callStart),
    });
  }

  return operations;
}

function authLabel(operation) {
  if (operation.auth.length === 0) {
    return 'public';
  }
  const order = ['tryUser', 'user', 'admin', 'root'];
  return order.filter((level) => operation.auth.includes(level)).join(' + ');
}

function operationDocument(operation) {
  const documentName = operation.name
    .replace(/^[a-z]/, (char) => char.toUpperCase())
    .replace(/[^_0-9A-Za-z]/g, '');
  return `${operation.kind} ${documentName}($input: JSON, $params: JSON) {\n  ${operation.name}(input: $input, params: $params)\n}`;
}

function escapeTableCell(value) {
  const text = String(value);
  if (!text) {
    return '-';
  }
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function code(value) {
  return value ? `\`${value}\`` : '-';
}

function codeList(values) {
  return values.length > 0 ? values.map(code).join(', ') : '-';
}

function rawOptions(operation) {
  return operation.options.length > 0
    ? operation.options.map(code).join(', ')
    : '-';
}

function metadataList(operation) {
  const items = [];
  for (const value of operation.audit) {
    items.push(`audit:${value}`);
  }
  for (const value of operation.activity) {
    items.push(`activity:${value}`);
  }
  return items.length > 0 ? items.map(code).join(', ') : '-';
}

function tableFor(title, operations) {
  const lines = [
    `## ${title}`,
    '',
    '| Operation | Auth | Guards | Audit / activity | Resource params | Handler | Registry options | Source |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const operation of operations) {
    lines.push(
      [
        code(operation.name),
        code(authLabel(operation)),
        codeList(operation.guards),
        metadataList(operation),
        codeList(operation.resourceParams),
        code(operation.handler),
        rawOptions(operation),
        code(`router/graphql_api.go:${operation.line}`),
      ]
        .map(escapeTableCell)
        .join(' | ')
        .replace(/^/, '| ')
        .replace(/$/, ' |'),
    );
  }

  return lines.join('\n');
}

function schemaFor(operations) {
  const fields = operations
    .map((operation) => `  ${operation.name}(input: JSON, params: JSON): JSON`)
    .join('\n');
  return fields || '  _empty: JSON';
}

function hashSource(...sources) {
  return crypto
    .createHash('sha256')
    .update(sources.join('\n---\n'))
    .digest('hex')
    .slice(0, 16);
}

function validateOperations(operations) {
  const seen = new Map();
  for (const operation of operations) {
    if (seen.has(operation.name)) {
      throw new Error(
        `Duplicate GraphQL operation ${operation.name} at lines ${seen.get(
          operation.name,
        )} and ${operation.line}`,
      );
    }
    seen.set(operation.name, operation.line);

    const frontendKind = API_OPERATION_TYPES[operation.name];
    if (frontendKind !== operation.kind) {
      throw new Error(
        `Frontend manifest mismatch for ${operation.name}: backend=${operation.kind}, frontend=${frontendKind}`,
      );
    }
  }

  for (const [name, kind] of Object.entries(API_OPERATION_TYPES)) {
    if (!seen.has(name)) {
      throw new Error(
        `Frontend manifest contains ${name}:${kind}, but backend registry does not`,
      );
    }
  }
}

function generateMarkdown(operations) {
  const queries = operations.filter((operation) => operation.kind === 'query');
  const mutations = operations.filter(
    (operation) => operation.kind === 'mutation',
  );
  const sourceHash = hashSource(backendSource, frontendManifestSource);

  return `${[
    '<!-- Code-generated by web/classic/scripts/generate-graphql-api-doc.mjs; DO NOT EDIT BY HAND. -->',
    '',
    '# GraphQL API 文档',
    '',
    '> 机器生成，请勿手动编辑。修改 GraphQL 控制面后运行：`' + command + '`。',
    '',
    '## 生成来源',
    '',
    '| Item | Value |',
    '| --- | --- |',
    `| Endpoint | \`POST /api/graphql\` |`,
    `| Backend registry | \`router/graphql_api.go\` |`,
    `| Frontend manifest | \`web/classic/src/helpers/apiOperations.js\` |`,
    `| Generator | \`web/classic/scripts/generate-graphql-api-doc.mjs\` |`,
    `| Source hash | \`${sourceHash}\` |`,
    `| Operations | \`${operations.length}\` total, \`${queries.length}\` queries, \`${mutations.length}\` mutations |`,
    `| Frontend parity | \`verified\` |`,
    '',
    '## 调用契约',
    '',
    '- 浏览器控制面只暴露 `POST /api/graphql`。旧 REST 风格 `/api/status`、`/api/user/*`、`/api/channel/*` 不属于当前控制面。',
    '- `Query` 和 `Mutation` 字段都只接收两个参数：`input: JSON` 与 `params: JSON`，返回值都是 `JSON` scalar。',
    '- 转发到 handler 时，`params` 会变成查询字符串，`input` 会变成 JSON body。',
    '- `Resource params` 中列出的字段必须在 `input` 或 `params` 中提供；解析优先级是 `input` 高于 `params`。',
    '- GraphQL 解析错误、未知 operation、缺少资源参数会通过标准 `errors` 返回。',
    '- handler JSON 通常保持现有 `{ success, message, data }` 形态；3xx handler 响应会被包装为 `{ success: true, message: "", data: { location, status } }`。',
    '',
    '## Schema',
    '',
    '```graphql',
    'scalar JSON',
    '',
    'type Query {',
    schemaFor(queries),
    '}',
    '',
    'type Mutation {',
    schemaFor(mutations),
    '}',
    '```',
    '',
    '## 请求模板',
    '',
    '```graphql',
    operationDocument(queries[0] ?? mutations[0]),
    '```',
    '',
    '```json',
    JSON.stringify(
      {
        query: operationDocument(queries[0] ?? mutations[0]),
        variables: {
          input: null,
          params: {},
        },
      },
      null,
      2,
    ),
    '```',
    '',
    tableFor('Queries', queries),
    '',
    tableFor('Mutations', mutations),
    '',
    '',
  ].join('\n')}`;
}

const operations = parseBackendOperations(backendSource);
validateOperations(operations);
const markdown = generateMarkdown(operations);

if (checkOnly) {
  const existing = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, 'utf8')
    : '';
  if (existing !== markdown) {
    console.error(
      'web/new/docs/graphql-api.md is out of date. Run: ' + command,
    );
    process.exit(1);
  }
  console.log('web/new/docs/graphql-api.md is up to date');
} else {
  fs.writeFileSync(outputPath, markdown);
  console.log(`Generated ${path.relative(appRoot, outputPath)}`);
}
