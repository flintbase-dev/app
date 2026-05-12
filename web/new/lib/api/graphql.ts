import { headers } from "next/headers";

export type GraphQLValue =
  | string
  | number
  | boolean
  | null
  | GraphQLValue[]
  | { [key: string]: GraphQLValue };

export type GraphQLObject = Record<string, GraphQLValue>;

export type GraphQLOperationField = {
  operation: string;
  alias?: string;
  input?: GraphQLObject;
  params?: GraphQLObject;
};

export type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const GRAPHQL_PATH = "/api/graphql";
const BACKEND_BASE_ENV = "FLINT_BACKEND_BASE_URL";
const SERVER_API_ENV = "FLINT_API_BASE_URL";
const PUBLIC_API_ENV = "NEXT_PUBLIC_FLINT_API_BASE_URL";

export async function graphqlQuery<T extends Record<string, unknown>>(
  fields: GraphQLOperationField[],
): Promise<T> {
  return callGraphQL<T>("query", fields);
}

export async function graphqlMutation<T extends Record<string, unknown>>(
  fields: GraphQLOperationField[],
): Promise<T> {
  return callGraphQL<T>("mutation", fields);
}

export async function graphqlMutationFromRequest<
  T extends Record<string, unknown>,
>(request: Request, fields: GraphQLOperationField[]): Promise<T> {
  return callGraphQL<T>("mutation", fields, request.headers);
}

export async function graphqlOperation<T = unknown>(
  kind: "query" | "mutation",
  operation: string,
  options: Omit<GraphQLOperationField, "operation"> = {},
): Promise<T> {
  const payload =
    kind === "query"
      ? await graphqlQuery<Record<string, T>>([{ operation, ...options }])
      : await graphqlMutation<Record<string, T>>([{ operation, ...options }]);
  return payload[options.alias ?? operation];
}

export function unwrapApiData<T>(payload: unknown, fallback: T): T {
  if (!isRecord(payload)) return fallback;
  if (payload.success === false) {
    throw new Error(String(payload.message || "GraphQL operation failed"));
  }
  if (Object.hasOwn(payload, "data")) return payload.data as T;
  return payload as T;
}

export function assertApiSuccess(payload: unknown): ApiEnvelope {
  if (!isRecord(payload)) return { success: true, data: payload };
  const message = typeof payload.message === "string" ? payload.message : "";
  if (payload.success === false || message === "error") {
    const data = payload.data;
    throw new Error(
      typeof data === "string" && data ? data : message || "Operation failed",
    );
  }
  return payload as ApiEnvelope;
}

async function callGraphQL<T extends Record<string, unknown>>(
  kind: "query" | "mutation",
  fields: GraphQLOperationField[],
  sourceHeaders?: RequestHeaderSource,
): Promise<T> {
  if (fields.length === 0) return {} as T;
  const { query, variables } = buildDocument(kind, fields);
  const requestHeaders = sourceHeaders ?? (await headers());
  const response = await fetch(getGraphQLEndpoint(requestHeaders), {
    method: "POST",
    headers: buildRequestHeaders(requestHeaders),
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as GraphQLResponse<T>) : null;
  if (!response.ok) {
    throw new Error(
      `GraphQL request failed with ${response.status}: ${response.statusText}`,
    );
  }
  if (!body) throw new Error("GraphQL request returned an empty response");
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "));
  }
  if (!body.data) throw new Error("GraphQL response did not include data");
  return body.data;
}

function buildDocument(
  kind: "query" | "mutation",
  fields: GraphQLOperationField[],
): { query: string; variables: Record<string, GraphQLObject> } {
  const variables: Record<string, GraphQLObject> = {};
  const definitions: string[] = [];
  const selections = fields.map((field, index) => {
    const alias = field.alias ?? field.operation;
    const safeAlias = sanitizeGraphQLName(alias, `field${index}`);
    const inputName = `${safeAlias}Input`;
    const paramsName = `${safeAlias}Params`;
    const args: string[] = [];

    if (field.input && Object.keys(field.input).length > 0) {
      variables[inputName] = field.input;
      definitions.push(`$${inputName}: JSON`);
      args.push(`input: $${inputName}`);
    }
    if (field.params && Object.keys(field.params).length > 0) {
      variables[paramsName] = field.params;
      definitions.push(`$${paramsName}: JSON`);
      args.push(`params: $${paramsName}`);
    }

    const fieldName =
      safeAlias === field.operation
        ? field.operation
        : `${safeAlias}: ${field.operation}`;
    return `  ${fieldName}${args.length ? `(${args.join(", ")})` : ""}`;
  });
  const definition = definitions.length ? `(${definitions.join(", ")})` : "";
  return {
    query: `${kind} FlintWebNew${definition} {\n${selections.join("\n")}\n}`,
    variables,
  };
}

function sanitizeGraphQLName(value: string, fallback: string): string {
  const cleaned = value.replace(/[^_0-9A-Za-z]/g, "_");
  if (/^[_A-Za-z][_0-9A-Za-z]*$/.test(cleaned)) return cleaned;
  return fallback;
}

function getGraphQLEndpoint(requestHeaders: RequestHeaderSource): string {
  const explicitBase =
    process.env[BACKEND_BASE_ENV] ||
    process.env[SERVER_API_ENV] ||
    process.env[PUBLIC_API_ENV] ||
    "";
  if (explicitBase) return endpointFromBase(explicitBase);

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host) {
    const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}${GRAPHQL_PATH}`;
  }
  return `http://127.0.0.1:3000${GRAPHQL_PATH}`;
}

function endpointFromBase(rawBase: string): string {
  const base = rawBase.trim().replace(/\/+$/, "");
  if (!base) return GRAPHQL_PATH;
  if (base.endsWith(GRAPHQL_PATH)) return base;
  return `${base}${GRAPHQL_PATH}`;
}

function buildRequestHeaders(requestHeaders: RequestHeaderSource): HeadersInit {
  const result: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  for (const name of [
    "cookie",
    "accept-language",
    "user-agent",
    "x-forwarded-for",
    "x-real-ip",
  ]) {
    const value = requestHeaders.get(name);
    if (value) result[name] = value;
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

type RequestHeaderSource = {
  get(name: string): string | null;
};
