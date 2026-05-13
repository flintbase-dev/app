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

export const API_OPERATION_TYPES = Object.freeze({
  setup: 'query',
  status: 'query',
  uptimeStatus: 'query',
  dashboardModels: 'query',
  adminStatus: 'query',
  userAgreement: 'query',
  privacyPolicy: 'query',
  about: 'query',
  homePageContent: 'query',
  publicBroadcasts: 'query',
  pricing: 'query',
  perfMetricsSummary: 'query',
  perfMetrics: 'query',
  rankings: 'query',
  ratioConfig: 'query',
  workosLogin: 'mutation',
  workosLogout: 'mutation',
  userGroups: 'query',
  selfGroups: 'query',
  self: 'query',
  inbox: 'query',
  inboxUnreadCount: 'query',
  markInboxItemRead: 'mutation',
  markAllInboxRead: 'mutation',
  userModels: 'query',
  accountContext: 'query',
  teams: 'query',
  team: 'query',
  teamMembers: 'query',
  teamInvitations: 'query',
  teamPolicy: 'query',
  teamBillingSummary: 'query',
  teamTopups: 'query',
  teamTokens: 'query',
  teamToken: 'query',
  teamUsage: 'query',
  createTeam: 'mutation',
  updateTeam: 'mutation',
  deleteTeam: 'mutation',
  inviteTeamMember: 'mutation',
  revokeTeamInvitation: 'mutation',
  updateTeamMemberRole: 'mutation',
  removeTeamMember: 'mutation',
  updateTeamPolicy: 'mutation',
  teamStripeAmount: 'mutation',
  teamStripePay: 'mutation',
  teamStripeBillingPortal: 'mutation',
  createTeamToken: 'mutation',
  updateTeamToken: 'mutation',
  deleteTeamToken: 'mutation',
  deleteTeamTokens: 'mutation',
  teamTokenKey: 'mutation',
  teamTokenKeysBatch: 'mutation',
  generateAccessToken: 'mutation',
  affCode: 'query',
  topupInfo: 'query',
  userTopups: 'query',
  topup: 'mutation',
  stripePay: 'mutation',
  stripeAmount: 'mutation',
  stripeCheckoutResult: 'query',
  stripeBillingPortal: 'mutation',
  affTransfer: 'mutation',
  updateSelf: 'mutation',
  deleteSelf: 'mutation',
  updateUserSetting: 'mutation',
  checkinStatus: 'query',
  checkin: 'mutation',
  users: 'query',
  adminBroadcasts: 'query',
  createBroadcast: 'mutation',
  deleteBroadcast: 'mutation',
  adminTopups: 'query',
  searchUsers: 'query',
  user: 'query',
  manageUser: 'mutation',
  updateUser: 'mutation',
  deleteUser: 'mutation',
  subscriptionPlans: 'query',
  subscriptionSelf: 'query',
  updateSubscriptionPreference: 'mutation',
  subscriptionStripePay: 'mutation',
  adminSubscriptionPlans: 'query',
  createSubscriptionPlan: 'mutation',
  updateSubscriptionPlan: 'mutation',
  updateSubscriptionPlanStatus: 'mutation',
  bindSubscription: 'mutation',
  userSubscriptions: 'query',
  createUserSubscription: 'mutation',
  invalidateUserSubscription: 'mutation',
  deleteUserSubscription: 'mutation',
  options: 'query',
  optionRevisions: 'query',
  updateOption: 'mutation',
  channelAffinityCache: 'query',
  clearChannelAffinityCache: 'mutation',
  resetModelPrices: 'mutation',
  performanceStats: 'query',
  clearDiskCache: 'mutation',
  resetPerformanceStats: 'mutation',
  forceGC: 'mutation',
  syncableChannels: 'query',
  fetchUpstreamRatios: 'mutation',
  channels: 'query',
  searchChannels: 'query',
  channelModels: 'query',
  enabledChannelModels: 'query',
  channel: 'query',
  channelKey: 'mutation',
  testAllChannels: 'mutation',
  testChannel: 'mutation',
  updateAllChannelBalance: 'mutation',
  updateChannelBalance: 'mutation',
  createChannel: 'mutation',
  updateChannel: 'mutation',
  deleteDisabledChannels: 'mutation',
  disableTagChannels: 'mutation',
  enableTagChannels: 'mutation',
  editTagChannels: 'mutation',
  deleteChannel: 'mutation',
  deleteChannels: 'mutation',
  fixChannelsAbilities: 'mutation',
  fetchUpstreamModels: 'mutation',
  fetchModels: 'mutation',
  batchSetChannelTag: 'mutation',
  tagModels: 'query',
  copyChannel: 'mutation',
  manageMultiKeys: 'mutation',
  applyChannelUpstreamUpdates: 'mutation',
  applyAllChannelUpstreamUpdates: 'mutation',
  detectChannelUpstreamUpdates: 'mutation',
  detectAllChannelUpstreamUpdates: 'mutation',
  tokens: 'query',
  searchTokens: 'query',
  token: 'query',
  tokenKey: 'mutation',
  createToken: 'mutation',
  updateToken: 'mutation',
  deleteToken: 'mutation',
  deleteTokens: 'mutation',
  tokenKeysBatch: 'mutation',
  redemptions: 'query',
  searchRedemptions: 'query',
  redemption: 'query',
  createRedemption: 'mutation',
  updateRedemption: 'mutation',
  deleteInvalidRedemptions: 'mutation',
  deleteRedemption: 'mutation',
  logs: 'query',
  deleteHistoryLogs: 'mutation',
  logsStat: 'query',
  logsSelfStat: 'query',
  channelAffinityUsageCache: 'query',
  userLogs: 'query',
  quotaDates: 'query',
  quotaDatesByUser: 'query',
  quotaDatesSelf: 'query',
  groups: 'query',
  prefillGroups: 'query',
  createPrefillGroup: 'mutation',
  updatePrefillGroup: 'mutation',
  deletePrefillGroup: 'mutation',
  vendors: 'query',
  searchVendors: 'query',
  vendor: 'query',
  createVendor: 'mutation',
  updateVendor: 'mutation',
  deleteVendor: 'mutation',
  syncUpstreamPreview: 'query',
  syncUpstreamModels: 'mutation',
  missingModels: 'query',
  modelsMeta: 'query',
  searchModelsMeta: 'query',
  modelMeta: 'query',
  createModelMeta: 'mutation',
  updateModelMeta: 'mutation',
  deleteModelMeta: 'mutation',
});

export const API_OPERATIONS = Object.freeze(
  Object.keys(API_OPERATION_TYPES).reduce((operations, operation) => {
    operations[operation] = operation;
    return operations;
  }, {}),
);

export function getAPIOperationType(operation) {
  const operationType = API_OPERATION_TYPES[operation];
  if (!operationType) {
    throw new Error(`Unknown GraphQL API operation: ${operation}`);
  }
  return operationType;
}

export function buildGraphQLDocument(operation) {
  const operationType = getAPIOperationType(operation);
  const documentName = operation
    .replace(/^[a-z]/, (char) => char.toUpperCase())
    .replace(/[^_0-9A-Za-z]/g, '');
  return `${operationType} ${documentName}($input: JSON, $params: JSON) {
  ${operation}(input: $input, params: $params)
}`;
}
