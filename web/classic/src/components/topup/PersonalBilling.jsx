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

import React, { useEffect, useState } from 'react';
import { Button, Card, Skeleton, Table, Typography } from '@douyinfe/semi-ui';
import { API, renderQuota, showError } from '../../helpers';

const { Title, Text } = Typography;

const PersonalBilling = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [orders, setOrders] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const start = now - 30 * 86400;
      const [selfRes, usageRes, topupsRes] = await Promise.all([
        API.query('self'),
        API.query('logsSelfStat', {
          start_timestamp: start,
          end_timestamp: now,
        }),
        API.query('userTopups', { p: 1, page_size: 20 }),
      ]);
      if (selfRes.data?.success) setUser(selfRes.data.data);
      if (usageRes.data?.success)
        setMonthlyUsage(usageRes.data.data?.quota || 0);
      if (topupsRes.data?.success) {
        setOrders(topupsRes.data.data?.items || topupsRes.data.data || []);
      }
    } catch (error) {
      showError(error.message || 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns = [
    { title: 'Order', dataIndex: 'id' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Amount',
      render: (_, record) =>
        renderQuota(record.credit_units || record.amount || 0),
    },
  ];

  return (
    <div className='w-full max-w-7xl mx-auto relative min-h-screen lg:min-h-0 mt-[60px] px-2'>
      <Skeleton loading={loading} active>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div>
            <Text type='tertiary'>Personal billing</Text>
            <Title heading={3} className='!m-0'>
              Quota and usage
            </Title>
          </div>
          <Button onClick={load}>Refresh</Button>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <Card className='!rounded-xl'>
            <Text type='tertiary'>Balance</Text>
            <Title heading={4}>{renderQuota(user?.quota || 0)}</Title>
          </Card>
          <Card className='!rounded-xl'>
            <Text type='tertiary'>Total used</Text>
            <Title heading={4}>{renderQuota(user?.used_quota || 0)}</Title>
          </Card>
          <Card className='!rounded-xl'>
            <Text type='tertiary'>Last 30 days</Text>
            <Title heading={4}>{renderQuota(monthlyUsage)}</Title>
          </Card>
        </div>
        <Card className='!rounded-xl mt-4'>
          <Text strong>Billing history</Text>
          <Table
            className='mt-3'
            rowKey='id'
            columns={columns}
            dataSource={orders}
            pagination={false}
          />
        </Card>
      </Skeleton>
    </div>
  );
};

export default PersonalBilling;
