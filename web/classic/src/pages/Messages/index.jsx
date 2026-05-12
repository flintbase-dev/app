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
  Pagination,
  Spin,
  Tag,
  Tabs,
  TabPane,
  Typography,
} from '@douyinfe/semi-ui';
import { CheckCheck, Mail, Megaphone } from 'lucide-react';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';

const { Text, Title } = Typography;

const PAGE_SIZE = 12;

const itemTypeMeta = {
  message: {
    icon: Mail,
    color: 'blue',
    label: 'Messages',
  },
  broadcast: {
    icon: Megaphone,
    color: 'orange',
    label: 'Broadcast',
  },
};

const Messages = () => {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const selectedHtml = useMemo(() => {
    if (!selectedItem?.content) return '';
    return marked.parse(selectedItem.content);
  }, [selectedItem]);

  const loadInbox = async (nextPage = page, nextType = activeType) => {
    setLoading(true);
    try {
      const res = await API.query('inbox', {
        p: nextPage,
        page_size: PAGE_SIZE,
        type: nextType,
      });
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      const nextItems = data?.items || [];
      setItems(nextItems);
      setTotal(data?.total || 0);
      setSelectedItem((current) => {
        if (current && nextItems.some((item) => item.id === current.id)) {
          return nextItems.find((item) => item.id === current.id);
        }
        return nextItems[0] || null;
      });
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveType(key);
    setPage(1);
    setSelectedItem(null);
    loadInbox(1, key);
  };

  const markItemRead = async (item) => {
    if (!item || item.read_at > 0) return;
    const res = await API.mutation('markInboxItemRead', {
      item_type: item.item_type,
      id: item.id,
    });
    if (!res.data.success) {
      showError(res.data.message);
      return;
    }
    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id
          ? { ...current, read_at: Math.floor(Date.now() / 1000) }
          : current,
      ),
    );
    setSelectedItem((current) =>
      current?.id === item.id
        ? { ...current, read_at: Math.floor(Date.now() / 1000) }
        : current,
    );
  };

  const markAllRead = async () => {
    const res = await API.mutation('markAllInboxRead');
    if (res.data.success) {
      showSuccess(t('已全部标记为已读'));
      loadInbox();
    } else {
      showError(res.data.message);
    }
  };

  useEffect(() => {
    loadInbox(1, activeType);
  }, []);

  const renderItem = (item) => {
    const meta = itemTypeMeta[item.item_type] || itemTypeMeta.message;
    const Icon = meta.icon;
    const isSelected = selectedItem?.id === item.id;
    const unread = item.read_at === 0;

    return (
      <button
        type='button'
        key={`${item.item_type}-${item.id}`}
        onClick={() => {
          setSelectedItem(item);
          markItemRead(item);
        }}
        className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
          isSelected
            ? 'border-semi-color-primary bg-semi-color-primary-light-default'
            : 'border-semi-color-border hover:bg-semi-color-fill-0'
        }`}
      >
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <Icon size={15} />
              <Text strong={unread} ellipsis={{ showTooltip: true }}>
                {item.title}
              </Text>
            </div>
            <div className='mt-1 text-sm text-semi-color-text-2 line-clamp-2'>
              {item.content}
            </div>
          </div>
          <Tag color={meta.color} shape='circle'>
            {meta.label}
          </Tag>
        </div>
        <div className='mt-3 flex items-center justify-between text-sm text-semi-color-text-2'>
          <span>{timestamp2string(item.created_at)}</span>
          {unread ? (
            <Tag color='red'>{t('未读')}</Tag>
          ) : (
            <span>{t('已读')}</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className='mt-[60px] px-3 py-4'>
      <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <Title heading={3}>{t('我的消息')}</Title>
          <Text type='secondary'>
            {t('查看单人 Messages 和管理员 Broadcast')}
          </Text>
        </div>
        <Button
          type='tertiary'
          theme='light'
          icon={<CheckCheck size={16} />}
          onClick={markAllRead}
        >
          {t('全部标记已读')}
        </Button>
      </div>

      <Tabs activeKey={activeType} onChange={handleTabChange} type='line'>
        <TabPane tab={t('全部')} itemKey='all' />
        <TabPane tab='Messages' itemKey='message' />
        <TabPane tab='Broadcast' itemKey='broadcast' />
      </Tabs>

      <Spin spinning={loading}>
        <div className='grid min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]'>
          <div className='flex flex-col gap-3'>
            {items.length === 0 ? (
              <div className='rounded-lg border border-semi-color-border py-16'>
                <Empty description={t('暂无消息')} />
              </div>
            ) : (
              items.map(renderItem)
            )}
            {total > PAGE_SIZE && (
              <Pagination
                currentPage={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  loadInbox(nextPage, activeType);
                }}
              />
            )}
          </div>

          <div className='rounded-lg border border-semi-color-border bg-semi-color-bg-0 p-5'>
            {selectedItem ? (
              <>
                <div className='mb-4 flex flex-col gap-2 border-b border-semi-color-border pb-4'>
                  <div className='flex items-center gap-2'>
                    <Tag
                      color={
                        itemTypeMeta[selectedItem.item_type]?.color || 'blue'
                      }
                      shape='circle'
                    >
                      {itemTypeMeta[selectedItem.item_type]?.label ||
                        'Messages'}
                    </Tag>
                    {selectedItem.read_at === 0 && (
                      <Tag color='red'>{t('未读')}</Tag>
                    )}
                  </div>
                  <Title heading={4}>{selectedItem.title}</Title>
                  <Text type='secondary'>
                    {timestamp2string(selectedItem.created_at)}
                  </Text>
                </div>
                <div
                  className='prose max-w-none text-semi-color-text-0 dark:prose-invert'
                  dangerouslySetInnerHTML={{ __html: selectedHtml }}
                />
              </>
            ) : (
              <div className='py-24'>
                <Empty description={t('请选择一条消息')} />
              </div>
            )}
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default Messages;
