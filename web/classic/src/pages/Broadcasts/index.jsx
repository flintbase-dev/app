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
import { Empty, Pagination, Spin, Tag, Typography } from '@douyinfe/semi-ui';
import { Megaphone } from 'lucide-react';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { API, showError, timestamp2string } from '../../helpers';

const { Text, Title } = Typography;

const PAGE_SIZE = 10;

const Broadcasts = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const selectedHtml = useMemo(() => {
    if (!selectedItem?.content) return '';
    return marked.parse(selectedItem.content);
  }, [selectedItem]);

  const loadBroadcasts = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await API.query('publicBroadcasts', {
        p: nextPage,
        page_size: PAGE_SIZE,
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

  useEffect(() => {
    loadBroadcasts(1);
  }, []);

  return (
    <div className='mt-[60px] px-4 py-8'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-6 flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-semi-color-fill-0'>
            <Megaphone size={20} />
          </div>
          <div>
            <Title heading={2}>{t('公开广播')}</Title>
            <Text type='secondary'>{t('面向用户和访客发布的 Broadcast')}</Text>
          </div>
        </div>

        <Spin spinning={loading}>
          <div className='grid min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]'>
            <div className='flex flex-col gap-3'>
              {items.length === 0 ? (
                <div className='rounded-lg border border-semi-color-border py-16'>
                  <Empty description={t('暂无公开广播')} />
                </div>
              ) : (
                items.map((item) => (
                  <button
                    type='button'
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                      selectedItem?.id === item.id
                        ? 'border-semi-color-primary bg-semi-color-primary-light-default'
                        : 'border-semi-color-border hover:bg-semi-color-fill-0'
                    }`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <Text strong ellipsis={{ showTooltip: true }}>
                          {item.title}
                        </Text>
                        <div className='mt-1 text-sm text-semi-color-text-2 line-clamp-2'>
                          {item.content}
                        </div>
                      </div>
                      <Tag color='orange' shape='circle'>
                        Broadcast
                      </Tag>
                    </div>
                    <div className='mt-3 text-sm text-semi-color-text-2'>
                      {timestamp2string(item.sent_at)}
                    </div>
                  </button>
                ))
              )}
              {total > PAGE_SIZE && (
                <Pagination
                  currentPage={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    loadBroadcasts(nextPage);
                  }}
                />
              )}
            </div>

            <div className='rounded-lg border border-semi-color-border bg-semi-color-bg-0 p-5'>
              {selectedItem ? (
                <>
                  <div className='mb-4 border-b border-semi-color-border pb-4'>
                    <Tag color='orange' shape='circle'>
                      Broadcast
                    </Tag>
                    <Title heading={3} className='!mt-3'>
                      {selectedItem.title}
                    </Title>
                    <Text type='secondary'>
                      {timestamp2string(selectedItem.sent_at)}
                    </Text>
                  </div>
                  <div
                    className='prose max-w-none text-semi-color-text-0 dark:prose-invert'
                    dangerouslySetInnerHTML={{ __html: selectedHtml }}
                  />
                </>
              ) : (
                <div className='py-24'>
                  <Empty description={t('请选择一条公开广播')} />
                </div>
              )}
            </div>
          </div>
        </Spin>
      </div>
    </div>
  );
};

export default Broadcasts;
