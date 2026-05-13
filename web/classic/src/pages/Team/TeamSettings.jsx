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

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { API, showError, showSuccess } from '../../helpers';

const { Title, Text } = Typography;

const TeamSettings = () => {
  const { teamId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [disabledModels, setDisabledModels] = useState([]);
  const [disabledGroups, setDisabledGroups] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [
        teamRes,
        membersRes,
        invitationsRes,
        policyRes,
        modelsRes,
        groupsRes,
      ] = await Promise.all([
        API.query('team', { team_id: teamId }),
        API.query('teamMembers', { team_id: teamId }),
        API.query('teamInvitations', { team_id: teamId }),
        API.query('teamPolicy', { team_id: teamId }),
        API.query('userModels'),
        API.query('selfGroups'),
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
    } catch (error) {
      showError(error.message || 'Failed to load Team settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) load();
  }, [teamId]);

  const updateTeam = async () => {
    const res = await API.mutation('updateTeam', { team_id: teamId, name });
    if (res.data?.success) {
      showSuccess('Team updated');
      load();
    } else {
      showError(res.data?.message || 'Failed to update Team');
    }
  };

  const invite = async () => {
    const res = await API.mutation('inviteTeamMember', {
      team_id: teamId,
      email: inviteEmail,
      role: inviteRole,
    });
    if (res.data?.success) {
      showSuccess('Invitation sent');
      setInviteEmail('');
      load();
    } else {
      showError(res.data?.message || 'Failed to send invitation');
    }
  };

  const updateRole = async (userId, role) => {
    const res = await API.mutation('updateTeamMemberRole', {
      team_id: teamId,
      user_id: userId,
      role,
    });
    if (res.data?.success) {
      showSuccess('Role updated');
      load();
    } else {
      showError(res.data?.message || 'Failed to update role');
    }
  };

  const removeMember = async (userId) => {
    const res = await API.mutation('removeTeamMember', {
      team_id: teamId,
      user_id: userId,
    });
    if (res.data?.success) {
      showSuccess('Member removed');
      load();
    } else {
      showError(res.data?.message || 'Failed to remove member');
    }
  };

  const revokeInvitation = async (invitationId) => {
    const res = await API.mutation('revokeTeamInvitation', {
      team_id: teamId,
      invitation_id: invitationId,
    });
    if (res.data?.success) {
      showSuccess('Invitation revoked');
      load();
    } else {
      showError(res.data?.message || 'Failed to revoke invitation');
    }
  };

  const updatePolicy = async () => {
    const res = await API.mutation('updateTeamPolicy', {
      team_id: teamId,
      model_policy: {
        default_enabled: true,
        disabled: disabledModels,
      },
      group_policy: {
        default_enabled: true,
        disabled: disabledGroups,
      },
    });
    if (res.data?.success) {
      showSuccess('Policy updated');
      load();
    } else {
      showError(res.data?.message || 'Failed to update policy');
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

  return (
    <div className='mt-[60px] px-2'>
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
              <Input value={name} onChange={setName} placeholder='Team name' />
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

export default TeamSettings;
