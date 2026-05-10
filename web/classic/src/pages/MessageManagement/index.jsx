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
import {
  Button,
  Empty,
  Input,
  Modal,
  Pagination,
  Radio,
  RadioGroup,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import { Megaphone, Plus, Send, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';

const { Text, Title } = Typography;

const PAGE_SIZE = 10;

const roleOptions = [
  { value: 1, label: '普通用户' },
  { value: 10, label: '管理员' },
  { value: 100, label: '超级管理员' },
];

const defaultForm = {
  title: '',
  content: '',
  audienceType: 'all_users',
  userIds: '',
  groups: [],
  roles: [],
  emailEnabled: false,
};

const parseCommaList = (value) =>
  String(value || '')
    .split(/[\n,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatAudience = (broadcast, t) => {
  if (broadcast.audience_type === 'all_users') return t('全体用户');
  if (broadcast.audience_type === 'users_and_guests') {
    return t('用户 + 访客');
  }
  let audience = {};
  try {
    audience = JSON.parse(broadcast.audience || '{}');
  } catch (_) {
    audience = {};
  }
  const parts = [];
  if (audience.user_ids?.length) {
    parts.push(`${t('用户')} ${audience.user_ids.length}`);
  }
  if (audience.groups?.length) {
    parts.push(`${t('分组')} ${audience.groups.join(', ')}`);
  }
  if (audience.roles?.length) {
    parts.push(`${t('等级')} ${audience.roles.join(', ')}`);
  }
  return parts.join(' / ') || t('未选择');
};

const MessageManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [broadcasts, setBroadcasts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const groupOptions = useMemo(
    () => groups.map((group) => ({ value: group, label: group })),
    [groups],
  );

  const loadBroadcasts = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await API.query('adminBroadcasts', {
        p: nextPage,
        page_size: PAGE_SIZE,
      });
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      setBroadcasts(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await API.query('groups');
      if (res.data.success) {
        setGroups(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openCreateModal = () => {
    setForm(defaultForm);
    setModalVisible(true);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitBroadcast = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showError(t('标题和内容不能为空'));
      return;
    }
    const audience = {
      user_ids: parseCommaList(form.userIds),
      groups: form.groups || [],
      roles: form.roles || [],
    };
    if (
      form.audienceType === 'selected' &&
      audience.user_ids.length === 0 &&
      audience.groups.length === 0 &&
      audience.roles.length === 0
    ) {
      showError(t('请选择至少一个用户、分组或用户等级'));
      return;
    }

    setSending(true);
    try {
      const res = await API.mutation('createBroadcast', {
        title: form.title.trim(),
        content: form.content.trim(),
        audience_type: form.audienceType,
        audience,
        email_enabled: form.emailEnabled,
      });
      if (res.data.success) {
        showSuccess(t('Broadcast 已发送'));
        setModalVisible(false);
        loadBroadcasts(1);
        setPage(1);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setSending(false);
    }
  };

  const deleteBroadcast = (broadcast) => {
    Modal.confirm({
      title: t('删除 Broadcast'),
      content: t('删除后用户和访客将不再看到这条 Broadcast'),
      okText: t('删除'),
      cancelText: t('取消'),
      onOk: async () => {
        const res = await API.mutation('deleteBroadcast', {
          id: broadcast.id,
        });
        if (res.data.success) {
          showSuccess(t('已删除'));
          loadBroadcasts(page);
        } else {
          showError(res.data.message);
        }
      },
    });
  };

  useEffect(() => {
    loadBroadcasts(1);
    loadGroups();
  }, []);

  const columns = [
    {
      title: t('标题'),
      dataIndex: 'title',
      render: (title, record) => (
        <div className='min-w-[220px]'>
          <Text strong ellipsis={{ showTooltip: true }}>
            {title}
          </Text>
          <div className='mt-1 text-sm text-semi-color-text-2 line-clamp-1'>
            {record.content}
          </div>
        </div>
      ),
    },
    {
      title: t('目标'),
      dataIndex: 'audience_type',
      width: 180,
      render: (_, record) => formatAudience(record, t),
    },
    {
      title: t('邮件'),
      dataIndex: 'email_enabled',
      width: 160,
      render: (enabled, record) =>
        enabled ? (
          <div className='text-sm'>
            <Tag color='green'>{t('已启用')}</Tag>
            <div className='mt-1 text-semi-color-text-2'>
              {record.email_sent_count}/{record.recipient_count}
            </div>
          </div>
        ) : (
          <Tag>{t('未发送')}</Tag>
        ),
    },
    {
      title: t('发送时间'),
      dataIndex: 'sent_at',
      width: 180,
      render: (sentAt) => timestamp2string(sentAt),
    },
    {
      title: t('操作'),
      width: 120,
      render: (_, record) => (
        <Button
          type='danger'
          theme='borderless'
          icon={<Trash2 size={15} />}
          onClick={() => deleteBroadcast(record)}
        >
          {t('删除')}
        </Button>
      ),
    },
  ];

  return (
    <div className='mt-[60px] px-3 py-4'>
      <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <Title heading={3}>{t('消息管理')}</Title>
          <Text type='secondary'>
            {t('手动发送 Broadcast，并选择是否同时发送邮件')}
          </Text>
        </div>
        <Button
          type='primary'
          icon={<Plus size={16} />}
          onClick={openCreateModal}
        >
          {t('发送 Broadcast')}
        </Button>
      </div>

      <Spin spinning={loading}>
        {broadcasts.length === 0 ? (
          <div className='rounded-lg border border-semi-color-border py-16'>
            <Empty description={t('暂无 Broadcast')} />
          </div>
        ) : (
          <div className='rounded-lg border border-semi-color-border bg-semi-color-bg-0'>
            <Table
              columns={columns}
              dataSource={broadcasts}
              rowKey='id'
              pagination={false}
            />
          </div>
        )}
        {total > PAGE_SIZE && (
          <div className='mt-4'>
            <Pagination
              currentPage={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                loadBroadcasts(nextPage);
              }}
            />
          </div>
        )}
      </Spin>

      <Modal
        title={
          <Space>
            <Megaphone size={18} />
            <span>{t('发送 Broadcast')}</span>
          </Space>
        }
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={
          <div className='flex justify-end gap-2'>
            <Button onClick={() => setModalVisible(false)}>{t('取消')}</Button>
            <Button
              type='primary'
              loading={sending}
              icon={<Send size={15} />}
              onClick={submitBroadcast}
            >
              {t('发送')}
            </Button>
          </div>
        }
        width={760}
        maskClosable={false}
      >
        <div className='grid grid-cols-1 gap-4'>
          <div>
            <div className='mb-1 font-medium'>{t('标题')}</div>
            <Input
              value={form.title}
              onChange={(value) => updateForm('title', value)}
              placeholder={t('例如：维护通知')}
            />
          </div>
          <div>
            <div className='mb-1 font-medium'>{t('内容')}</div>
            <TextArea
              autosize={{ minRows: 7, maxRows: 14 }}
              value={form.content}
              onChange={(value) => updateForm('content', value)}
              placeholder={t('支持 Markdown 内容')}
            />
          </div>
          <div>
            <div className='mb-2 font-medium'>{t('目标范围')}</div>
            <RadioGroup
              type='button'
              value={form.audienceType}
              onChange={(e) => updateForm('audienceType', e.target.value)}
            >
              <Radio value='all_users'>{t('全体用户')}</Radio>
              <Radio value='selected'>{t('指定范围')}</Radio>
              <Radio value='users_and_guests'>{t('用户 + 访客')}</Radio>
            </RadioGroup>
          </div>

          {form.audienceType === 'selected' && (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <div className='mb-1 font-medium'>{t('用户 ID')}</div>
                <TextArea
                  autosize={{ minRows: 3, maxRows: 6 }}
                  value={form.userIds}
                  onChange={(value) => updateForm('userIds', value)}
                  placeholder='usr_xxx, usr_yyy'
                />
              </div>
              <div className='grid grid-cols-1 gap-4'>
                <div>
                  <div className='mb-1 font-medium'>{t('分组')}</div>
                  <Select
                    multiple
                    filter
                    value={form.groups}
                    optionList={groupOptions}
                    onChange={(value) => updateForm('groups', value || [])}
                    placeholder={t('选择用户分组')}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div className='mb-1 font-medium'>{t('用户等级')}</div>
                  <Select
                    multiple
                    value={form.roles}
                    optionList={roleOptions.map((role) => ({
                      ...role,
                      label: t(role.label),
                    }))}
                    onChange={(value) => updateForm('roles', value || [])}
                    placeholder={t('选择用户等级')}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className='rounded-lg border border-semi-color-border p-4'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <div className='font-medium'>{t('同时发送邮件')}</div>
                <Text type='secondary'>
                  {t('关闭后只在站内消息中心显示 Broadcast')}
                </Text>
              </div>
              <Switch
                checked={form.emailEnabled}
                onChange={(checked) => updateForm('emailEnabled', checked)}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MessageManagement;
