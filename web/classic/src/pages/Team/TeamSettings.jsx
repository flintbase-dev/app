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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  Send,
  Trash2,
} from 'lucide-react';
import {
  API,
  formatSiteCurrency,
  renderQuota,
  renderQuotaWithAmount,
  showError,
  showSuccess,
} from '../../helpers';
import PaymentConfirmModal from '../../components/topup/modals/PaymentConfirmModal';

const { Title, Text } = Typography;

const TeamSettings = () => {
  const { teamId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [billingSummary, setBillingSummary] = useState(null);
  const [topupOrders, setTopupOrders] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [disabledModels, setDisabledModels] = useState([]);
  const [disabledGroups, setDisabledGroups] = useState([]);
  const [topUpCount, setTopUpCount] = useState(5);
  const [amount, setAmount] = useState(0);
  const [amountLoading, setAmountLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSession, setPaymentSession] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        teamRes,
        membersRes,
        invitationsRes,
        policyRes,
        modelsRes,
        groupsRes,
        billingRes,
        topupsRes,
      ] = await Promise.all([
        API.query('team', { team_id: teamId }),
        API.query('teamMembers', { team_id: teamId }),
        API.query('teamInvitations', { team_id: teamId }),
        API.query('teamPolicy', { team_id: teamId }),
        API.query('userModels'),
        API.query('selfGroups'),
        API.query('teamBillingSummary', { team_id: teamId }),
        API.query('teamTopups', { team_id: teamId }),
      ]);
      if (teamRes.data?.success) {
        setTeam(teamRes.data.data);
        setName(teamRes.data.data?.name || '');
      }
      if (membersRes.data?.success) setMembers(membersRes.data.data || []);
      if (invitationsRes.data?.success) {
        setInvitations(invitationsRes.data.data || []);
      }
      if (policyRes.data?.success) {
        const nextPolicy = policyRes.data.data;
        setDisabledModels(nextPolicy?.model_policy?.disabled || []);
        setDisabledGroups(nextPolicy?.group_policy?.disabled || []);
      }
      if (modelsRes.data?.success) {
        setAvailableModels(modelsRes.data.data || []);
      }
      if (groupsRes.data?.success) {
        const groups = groupsRes.data.data || {};
        setAvailableGroups(
          Object.entries(groups).map(([name, config]) => ({
            name,
            label: config?.desc || name,
          })),
        );
      }
      if (billingRes.data?.success) setBillingSummary(billingRes.data.data);
      if (topupsRes.data?.success) setTopupOrders(topupsRes.data.data || []);
    } catch (error) {
      showError(error.message || 'Failed to load Team settings');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) load();
  }, [teamId, load]);

  const runTeamMutation = async (
    operation,
    payload,
    successMessage,
    failureMessage,
    onSuccess,
  ) => {
    try {
      const res = await API.mutation(operation, payload);
      if (res.data?.success) {
        showSuccess(successMessage);
        onSuccess?.();
        load();
      } else {
        showError(res.data?.message || failureMessage);
      }
    } catch (error) {
      showError(error.message || failureMessage);
    }
  };

  const updateTeam = async () => {
    await runTeamMutation(
      'updateTeam',
      { team_id: teamId, name },
      'Team updated',
      'Failed to update Team',
    );
  };

  const invite = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showError('Enter a valid email address');
      return;
    }
    await runTeamMutation(
      'inviteTeamMember',
      {
        team_id: teamId,
        email: normalizedEmail,
        role: inviteRole,
      },
      'Invitation sent',
      'Failed to send invitation',
      () => setInviteEmail(''),
    );
  };

  const updateRole = async (userId, role) => {
    await runTeamMutation(
      'updateTeamMemberRole',
      {
        team_id: teamId,
        user_id: userId,
        role,
      },
      'Role updated',
      'Failed to update role',
    );
  };

  const removeMember = async (userId) => {
    await runTeamMutation(
      'removeTeamMember',
      {
        team_id: teamId,
        user_id: userId,
      },
      'Member removed',
      'Failed to remove member',
    );
  };

  const revokeInvitation = async (invitationId) => {
    await runTeamMutation(
      'revokeTeamInvitation',
      {
        team_id: teamId,
        invitation_id: invitationId,
      },
      'Invitation revoked',
      'Failed to revoke invitation',
    );
  };

  const updatePolicy = async () => {
    await runTeamMutation(
      'updateTeamPolicy',
      {
        team_id: teamId,
        model_policy: {
          default_enabled: true,
          disabled: disabledModels,
        },
        group_policy: {
          default_enabled: true,
          disabled: disabledGroups,
        },
      },
      'Policy updated',
      'Failed to update policy',
    );
  };

  const getStripeAmount = async (value = topUpCount) => {
    setAmountLoading(true);
    try {
      const res = await API.mutation('teamStripeAmount', {
        team_id: teamId,
        amount: Number(value),
        payment_method: 'stripe',
      });
      if (res.data?.message === 'success') {
        setAmount(Number(res.data.data || 0));
        return true;
      }
      showError(res.data?.data || 'Failed to calculate Stripe amount');
      return false;
    } catch (error) {
      showError(error.message || 'Failed to calculate Stripe amount');
      return false;
    } finally {
      setAmountLoading(false);
    }
  };

  const preTopUp = async () => {
    setPaymentLoading(true);
    try {
      const amountOk = await getStripeAmount(topUpCount);
      if (!amountOk) return;
      const res = await API.mutation('teamStripePay', {
        team_id: teamId,
        amount: Number(topUpCount),
        payment_method: 'stripe',
        return_url: `${window.location.origin}/teams/${teamId}/console/settings?show_history=true&session_id={CHECKOUT_SESSION_ID}`,
      });
      if (res.data?.message === 'success') {
        setPaymentSession(res.data.data);
        setConfirmOpen(true);
      } else {
        showError(res.data?.data || 'Failed to start Stripe payment');
      }
    } catch (error) {
      showError(error.message || 'Failed to start Stripe payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      const res = await API.mutation('teamStripeBillingPortal', {
        team_id: teamId,
        return_url: window.location.href,
      });
      if (res.data?.message === 'success' && res.data?.data?.url) {
        window.location.assign(res.data.data.url);
        return;
      }
      showError(res.data?.data || 'Billing portal is not available');
    } catch (error) {
      showError(error.message || 'Billing portal is not available');
    }
  };

  const togglePolicyItem = (value, enabled, disabled, setDisabled) => {
    setDisabled(
      enabled
        ? disabled.filter((item) => item !== value)
        : Array.from(new Set([...disabled, value])),
    );
  };

  const disabledModelSet = useMemo(
    () => new Set(disabledModels),
    [disabledModels],
  );
  const disabledGroupSet = useMemo(
    () => new Set(disabledGroups),
    [disabledGroups],
  );

  const quota = Number(billingSummary?.quota || 0);
  const usedQuota = Number(billingSummary?.used_quota || 0);

  const memberColumns = useMemo(
    () => [
      { title: 'User', dataIndex: 'user_id' },
      {
        title: 'Role',
        render: (_, record) => (
          <Select
            size='small'
            value={record.role}
            style={{ width: 120 }}
            onChange={(role) => updateRole(record.user_id, role)}
            optionList={[
              { label: 'Admin', value: 'admin' },
              { label: 'Member', value: 'member' },
            ]}
          />
        ),
      },
      {
        title: 'Status',
        render: (_, record) => <Tag>{record.status}</Tag>,
      },
      {
        title: 'Actions',
        render: (_, record) => (
          <Button
            size='small'
            type='danger'
            theme='borderless'
            icon={<Trash2 size={14} />}
            onClick={() => removeMember(record.user_id)}
          />
        ),
      },
    ],
    [teamId],
  );

  const invitationColumns = [
    { title: 'Email', dataIndex: 'email' },
    { title: 'Role', dataIndex: 'role' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Actions',
      render: (_, record) =>
        record.status === 'pending' ? (
          <Button size='small' onClick={() => revokeInvitation(record.id)}>
            Revoke
          </Button>
        ) : null,
    },
  ];

  const topupColumns = [
    { title: 'Order', dataIndex: 'id' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Credits',
      render: (_, record) => renderQuota(record.credit_units || 0),
    },
    {
      title: 'Paid',
      render: (_, record) => formatSiteCurrency(record.money || 0, 2),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <PaymentConfirmModal
        t={(value) => value}
        open={confirmOpen}
        handleCancel={() => setConfirmOpen(false)}
        topUpCount={topUpCount}
        renderQuotaWithAmount={renderQuotaWithAmount}
        amountLoading={amountLoading}
        renderAmount={() => formatSiteCurrency(amount, 2)}
        payWay='stripe'
        stripePaymentOptions={[{ type: 'stripe', name: 'Stripe' }]}
        amountNumber={amount}
        discountRate={1}
        paymentSession={paymentSession}
        onPaymentSuccess={() => {
          setConfirmOpen(false);
          setPaymentSession(null);
          showSuccess('Payment submitted');
          load();
        }}
      />
      <Skeleton loading={loading} active>
        <div className='mb-4 flex items-center gap-2'>
          <Link to={`/teams/${teamId}/console`}>
            <Button icon={<ArrowLeft size={16} />} type='tertiary'>
              Back
            </Button>
          </Link>
          <div>
            <Text type='tertiary'>Team settings</Text>
            <Title heading={3} className='!m-0'>
              {team?.name || 'Team'}
            </Title>
          </div>
        </div>
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          <Card className='!rounded-xl'>
            <Space vertical align='start' className='w-full'>
              <Text strong>Profile</Text>
              <label className='text-sm font-medium' htmlFor='team-name'>
                Team name
              </label>
              <Input
                id='team-name'
                value={name}
                onChange={setName}
                placeholder='Team name'
              />
              <Button theme='solid' onClick={updateTeam}>
                Save Team
              </Button>
            </Space>
          </Card>
          <Card className='!rounded-xl'>
            <Space vertical align='start' className='w-full'>
              <Text strong>Invite member</Text>
              <Input
                value={inviteEmail}
                onChange={setInviteEmail}
                placeholder='name@example.com'
              />
              <Select
                value={inviteRole}
                onChange={setInviteRole}
                optionList={[
                  { label: 'Member', value: 'member' },
                  { label: 'Admin', value: 'admin' },
                ]}
                style={{ width: 160 }}
              />
              <Button theme='solid' icon={<Send size={16} />} onClick={invite}>
                Send invitation
              </Button>
            </Space>
          </Card>
        </div>
        <div className='mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3'>
          <Card className='!rounded-xl xl:col-span-1'>
            <Space vertical align='start' className='w-full'>
              <Text strong>Billing management</Text>
              <BillingMetric
                title='Available balance'
                value={renderQuota(quota)}
              />
              <BillingMetric
                title='Used credit'
                value={renderQuota(usedQuota)}
              />
              <BillingMetric
                title='Total credit'
                value={renderQuota(quota + usedQuota)}
              />
            </Space>
          </Card>
          <Card className='!rounded-xl xl:col-span-2'>
            <Space vertical align='start' className='w-full'>
              <div className='flex w-full flex-wrap items-center justify-between gap-3'>
                <Text strong>Add credits</Text>
                <Button
                  icon={<ExternalLink size={16} />}
                  onClick={openBillingPortal}
                >
                  Stripe portal
                </Button>
              </div>
              <InputNumber
                min={1}
                value={topUpCount}
                onChange={(value) => {
                  setTopUpCount(Number(value || 1));
                  getStripeAmount(Number(value || 1));
                }}
              />
              <Text type='tertiary'>
                Estimated charge: {formatSiteCurrency(amount, 2)}
              </Text>
              <Button
                theme='solid'
                icon={<CreditCard size={16} />}
                loading={paymentLoading}
                onClick={preTopUp}
              >
                Pay with Stripe
              </Button>
            </Space>
          </Card>
        </div>
        <Card className='!rounded-xl mt-4'>
          <Text strong>Team top-ups</Text>
          <Table
            className='mt-3'
            rowKey='id'
            columns={topupColumns}
            dataSource={topupOrders}
            pagination={false}
          />
        </Card>
        <Card className='!rounded-xl mt-4'>
          <Text strong>Members</Text>
          <Table
            className='mt-3'
            rowKey='id'
            columns={memberColumns}
            dataSource={members}
            pagination={false}
          />
        </Card>
        <Card className='!rounded-xl mt-4'>
          <Text strong>Invitations</Text>
          <Table
            className='mt-3'
            rowKey='id'
            columns={invitationColumns}
            dataSource={invitations}
            pagination={false}
          />
        </Card>
        <Card className='!rounded-xl mt-4'>
          <Space vertical align='start' className='w-full'>
            <Text strong>Team policy</Text>
            <div className='grid w-full grid-cols-1 gap-4 xl:grid-cols-2'>
              <div>
                <Text type='tertiary'>Models</Text>
                <div className='mt-2 max-h-[320px] overflow-auto rounded border border-semi-color-border px-3 py-2'>
                  {availableModels.map((model) => (
                    <div
                      key={model}
                      className='flex items-center justify-between gap-3 py-1'
                    >
                      <Text className='truncate font-mono text-xs'>
                        {model}
                      </Text>
                      <Switch
                        checked={!disabledModelSet.has(model)}
                        onChange={(checked) =>
                          togglePolicyItem(
                            model,
                            checked,
                            disabledModels,
                            setDisabledModels,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Text type='tertiary'>Groups</Text>
                <div className='mt-2 max-h-[320px] overflow-auto rounded border border-semi-color-border px-3 py-2'>
                  {availableGroups.map((group) => (
                    <div
                      key={group.name}
                      className='flex items-center justify-between gap-3 py-1'
                    >
                      <div className='min-w-0'>
                        <Text className='block truncate'>{group.name}</Text>
                        {group.label !== group.name ? (
                          <Text
                            type='tertiary'
                            size='small'
                            className='block truncate'
                          >
                            {group.label}
                          </Text>
                        ) : null}
                      </div>
                      <Switch
                        checked={!disabledGroupSet.has(group.name)}
                        onChange={(checked) =>
                          togglePolicyItem(
                            group.name,
                            checked,
                            disabledGroups,
                            setDisabledGroups,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button theme='solid' onClick={updatePolicy}>
              Save policy
            </Button>
          </Space>
        </Card>
      </Skeleton>
    </div>
  );
};

const BillingMetric = ({ title, value }) => (
  <div>
    <Text type='tertiary'>{title}</Text>
    <Title heading={5} className='!mt-1 !mb-0'>
      {value}
    </Title>
  </div>
);

export default TeamSettings;
