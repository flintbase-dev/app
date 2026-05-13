/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import { showError, formatMessageForAPI, isValidMessage } from './utils';
import axios from 'axios';
import { MESSAGE_ROLES } from '../constants/playground.constants';
import {
  API_OPERATIONS,
  buildGraphQLDocument,
  getAPIOperationType,
} from './apiOperations';

const GRAPHQL_API_ENDPOINT = '/api/graphql';

let graphQLClient = createGraphQLClient();
let inFlightQueryRequests = new Map();

function createGraphQLClient() {
  const client = axios.create({
    baseURL: import.meta.env.VITE_REACT_APP_SERVER_URL
      ? import.meta.env.VITE_REACT_APP_SERVER_URL
      : '',
    headers: {
      'Cache-Control': 'no-store',
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.config && error.config.skipErrorHandler) {
        return Promise.reject(error);
      }
      showError(error);
      return Promise.reject(error);
    },
  );

  return client;
}

function normalizeGraphQLVariables(variables = {}, operationType = 'query') {
  const hasExplicitShape =
    Object.prototype.hasOwnProperty.call(variables, 'input') ||
    Object.prototype.hasOwnProperty.call(variables, 'params');
  if (!hasExplicitShape) {
    return operationType === 'query'
      ? { input: null, params: variables }
      : { input: variables, params: null };
  }
  return {
    input: variables.input ?? null,
    params: variables.params ?? null,
  };
}

function createGraphQLError(response, operation) {
  const message =
    response.data?.errors?.[0]?.message ||
    `GraphQL API operation failed: ${operation}`;
  const error = new Error(message);
  error.response = response;
  return error;
}

async function executeGraphQLOperation(operation, variables = {}, config = {}) {
  const operationType = getAPIOperationType(operation);
  const payload = {
    query: buildGraphQLDocument(operation),
    variables: normalizeGraphQLVariables(variables, operationType),
  };

  const request = graphQLClient.post(GRAPHQL_API_ENDPOINT, payload, config);
  const response = await request;
  if (Array.isArray(response.data?.errors) && response.data.errors.length > 0) {
    const error = createGraphQLError(response, operation);
    error.config = config;
    throw error;
  }
  return {
    ...response,
    data: response.data?.data?.[operation],
    operation,
    operationType,
  };
}

function executeDedupedGraphQLQuery(operation, variables = {}, config = {}) {
  if (config?.disableDuplicate) {
    return executeGraphQLOperation(operation, variables, config);
  }

  const key = JSON.stringify({ operation, variables });
  if (inFlightQueryRequests.has(key)) {
    return inFlightQueryRequests.get(key);
  }

  const request = executeGraphQLOperation(operation, variables, config).finally(
    () => {
      inFlightQueryRequests.delete(key);
    },
  );
  inFlightQueryRequests.set(key, request);
  return request;
}

function createGraphQLAPI() {
  return {
    request(operation, variables = {}, config = {}) {
      const operationType = getAPIOperationType(operation);
      if (operationType === 'query') {
        return executeDedupedGraphQLQuery(operation, variables, config);
      }
      return executeGraphQLOperation(operation, variables, config);
    },
    query(operation, variables = {}, config = {}) {
      const operationType = getAPIOperationType(operation);
      if (operationType !== 'query') {
        throw new Error(`${operation} is not a GraphQL query operation`);
      }
      return executeDedupedGraphQLQuery(operation, variables, config);
    },
    mutation(operation, variables = {}, config = {}) {
      const operationType = getAPIOperationType(operation);
      if (operationType !== 'mutation') {
        throw new Error(`${operation} is not a GraphQL mutation operation`);
      }
      return executeGraphQLOperation(operation, variables, config);
    },
    async redirect(operation, variables = {}, config = {}) {
      const response = await this.mutation(operation, variables, config);
      const location = response.data?.data?.location;
      if (!location) {
        throw new Error(
          `GraphQL redirect operation ${operation} returned no location`,
        );
      }
      window.location.assign(normalizeRedirectLocation(location));
      return response;
    },
  };
}

function normalizeRedirectLocation(location) {
  try {
    const target = new URL(location, window.location.origin);
    if (
      target.origin === window.location.origin ||
      isLoopbackHost(target.hostname)
    ) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    return location;
  }
  return location;
}

function isLoopbackHost(hostname) {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  );
}

export { API_OPERATIONS };

export let API = createGraphQLAPI();

export function updateAPI() {
  graphQLClient = createGraphQLClient();
  inFlightQueryRequests = new Map();
  API = createGraphQLAPI();
}

// playground

// 构建API请求负载
export const buildApiPayload = (
  messages,
  systemPrompt,
  inputs,
  parameterEnabled,
) => {
  const processedMessages = messages
    .filter(isValidMessage)
    .map(formatMessageForAPI)
    .filter(Boolean);

  // 如果有系统提示，插入到消息开头
  if (systemPrompt && systemPrompt.trim()) {
    processedMessages.unshift({
      role: MESSAGE_ROLES.SYSTEM,
      content: systemPrompt.trim(),
    });
  }

  const payload = {
    model: inputs.model,
    group: inputs.group,
    messages: processedMessages,
    stream: inputs.stream,
  };

  // 添加启用的参数
  const parameterMappings = {
    temperature: 'temperature',
    top_p: 'top_p',
    max_tokens: 'max_tokens',
    frequency_penalty: 'frequency_penalty',
    presence_penalty: 'presence_penalty',
    seed: 'seed',
  };

  Object.entries(parameterMappings).forEach(([key, param]) => {
    const enabled = parameterEnabled[key];
    const value = inputs[param];
    const hasValue = value !== undefined && value !== null;

    if (!enabled) {
      return;
    }

    if (param === 'max_tokens') {
      if (typeof value === 'number') {
        payload[param] = value;
      }
      return;
    }

    if (hasValue) {
      payload[param] = value;
    }
  });

  return payload;
};

// 处理API错误响应
export const handleApiError = (error, response = null) => {
  const errorInfo = {
    error: error.message || '未知错误',
    timestamp: new Date().toISOString(),
    stack: error.stack,
  };

  if (response) {
    errorInfo.status = response.status;
    errorInfo.statusText = response.statusText;
  }

  if (error.message.includes('HTTP error')) {
    errorInfo.details = '服务器返回了错误状态码';
  } else if (error.message.includes('Failed to fetch')) {
    errorInfo.details = '网络连接失败或服务器无响应';
  }

  return errorInfo;
};

// 处理模型数据
export const processModelsData = (data, currentModel) => {
  const modelOptions = data.map((model) => ({
    label: model,
    value: model,
  }));

  const hasCurrentModel = modelOptions.some(
    (option) => option.value === currentModel,
  );
  const selectedModel =
    hasCurrentModel && modelOptions.length > 0
      ? currentModel
      : modelOptions[0]?.value;

  return { modelOptions, selectedModel };
};

// 处理分组数据
export const processGroupsData = (data, userGroup) => {
  let groupOptions = Object.entries(data).map(([group, info]) => ({
    label:
      info.desc.length > 20 ? info.desc.substring(0, 20) + '...' : info.desc,
    value: group,
    ratio: info.ratio,
    fullLabel: info.desc,
  }));

  if (groupOptions.length === 0) {
    groupOptions = [
      {
        label: '用户分组',
        value: '',
        ratio: 1,
      },
    ];
  } else if (userGroup) {
    const userGroupIndex = groupOptions.findIndex((g) => g.value === userGroup);
    if (userGroupIndex > -1) {
      const userGroupOption = groupOptions.splice(userGroupIndex, 1)[0];
      groupOptions.unshift(userGroupOption);
    }
  }

  return groupOptions;
};

let channelModels = undefined;
export async function loadChannelModels() {
  const res = await API.query(API_OPERATIONS.dashboardModels);
  const { success, data } = res.data;
  if (!success) {
    return;
  }
  channelModels = data;
  localStorage.setItem('channel_models', JSON.stringify(data));
}

export function getChannelModels(type) {
  if (channelModels !== undefined && type in channelModels) {
    if (!channelModels[type]) {
      return [];
    }
    return channelModels[type];
  }
  let models = localStorage.getItem('channel_models');
  if (!models) {
    return [];
  }
  channelModels = JSON.parse(models);
  if (type in channelModels) {
    return channelModels[type];
  }
  return [];
}
