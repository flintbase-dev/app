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

import React from 'react';
import {
  Button,
  Popover,
  Progress,
  Space,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import {
  renderGroup,
  renderNumber,
  renderQuota,
  timestamp2string,
} from '../../../helpers';

const renderTimestamp = (value) => (value ? timestamp2string(value) : '-');

const renderTeamIdentity = (text, record, t) => {
  return (
    <div className='min-w-[180px]'>
      <div className='font-medium'>{record.name || '-'}</div>
      <div className='text-xs text-gray-500'>{record.slug || '-'}</div>
      <Tooltip content={record.workos_organization_id || '-'}>
        <Tag color='white' shape='circle' className='!text-xs mt-1'>
          {t('WorkOS')}: {record.workos_organization_id || '-'}
        </Tag>
      </Tooltip>
    </div>
  );
};

const renderStatus = (status, t) => {
  const active = status === 'active';
  return (
    <Tag color={active ? 'green' : 'red'} shape='circle'>
      {active ? t('已启用') : t('已停用')}
    </Tag>
  );
};

const renderQuotaUsage = (record, t) => {
  const { Paragraph } = Typography;
  const used = parseInt(record.used_quota) || 0;
  const remain = parseInt(record.quota) || 0;
  const total = used + remain;
  const percent = total > 0 ? (remain / total) * 100 : 0;
  const popoverContent = (
    <div className='text-xs p-2'>
      <Paragraph copyable={{ content: renderQuota(used) }}>
        {t('已用额度')}: {renderQuota(used)}
      </Paragraph>
      <Paragraph copyable={{ content: renderQuota(remain) }}>
        {t('剩余额度')}: {renderQuota(remain)} ({percent.toFixed(0)}%)
      </Paragraph>
      <Paragraph copyable={{ content: renderQuota(total) }}>
        {t('总额度')}: {renderQuota(total)}
      </Paragraph>
    </div>
  );
  return (
    <Popover content={popoverContent} position='top'>
      <Tag color='white' shape='circle'>
        <div className='flex flex-col items-end min-w-[132px]'>
          <span className='text-xs leading-none'>{`${renderQuota(remain)} / ${renderQuota(total)}`}</span>
          <Progress
            percent={percent}
            aria-label='team quota usage'
            format={() => `${percent.toFixed(0)}%`}
            style={{ width: '100%', marginTop: '1px', marginBottom: 0 }}
          />
        </div>
      </Tag>
    </Popover>
  );
};

const renderCreator = (record) => {
  return (
    <div className='min-w-[160px]'>
      <div>
        {record.created_by_username || record.created_by_user_id || '-'}
      </div>
      <div className='text-xs text-gray-500'>
        {record.created_by_email || '-'}
      </div>
    </div>
  );
};

const renderOperations = (
  record,
  { setEditingTeam, setShowEditTeam, showDeactivateTeamModal, t },
) => {
  if (record.status !== 'active') return null;
  return (
    <Space>
      <Button
        type='tertiary'
        size='small'
        onClick={() => {
          setEditingTeam(record);
          setShowEditTeam(true);
        }}
      >
        {t('编辑')}
      </Button>
      <Button
        type='danger'
        size='small'
        onClick={() => showDeactivateTeamModal(record)}
      >
        {t('停用')}
      </Button>
    </Space>
  );
};

export const getTeamsColumns = ({
  t,
  setEditingTeam,
  setShowEditTeam,
  showDeactivateTeamModal,
}) => {
  return [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: t('团队'),
      dataIndex: 'name',
      render: (text, record) => renderTeamIdentity(text, record, t),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      render: (status) => renderStatus(status, t),
    },
    {
      title: t('分组'),
      dataIndex: 'group',
      render: (group) => <div>{renderGroup(group)}</div>,
    },
    {
      title: t('剩余额度/总额度'),
      key: 'quota_usage',
      render: (text, record) => renderQuotaUsage(record, t),
    },
    {
      title: t('成员'),
      dataIndex: 'active_member_count',
      render: (count) => renderNumber(count),
    },
    {
      title: t('调用次数'),
      dataIndex: 'request_count',
      render: (count) => renderNumber(count),
    },
    {
      title: t('创建人'),
      dataIndex: 'created_by_user_id',
      render: (text, record) => renderCreator(record),
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_at',
      render: renderTimestamp,
    },
    {
      title: t('更新时间'),
      dataIndex: 'updated_at',
      render: renderTimestamp,
    },
    {
      title: '',
      dataIndex: 'operate',
      fixed: 'right',
      width: 130,
      render: (text, record) =>
        renderOperations(record, {
          setEditingTeam,
          setShowEditTeam,
          showDeactivateTeamModal,
          t,
        }),
    },
  ];
};
