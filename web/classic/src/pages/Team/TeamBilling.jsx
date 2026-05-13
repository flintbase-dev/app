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
import { useParams } from 'react-router-dom';
import { Card, Col, Row, Skeleton, Typography } from '@douyinfe/semi-ui';
import { API, renderQuota, showError } from '../../helpers';

const { Title, Text } = Typography;

const TeamBilling = () => {
  const { teamId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.query('teamBillingSummary', { team_id: teamId });
      if (res.data?.success) setSummary(res.data.data);
    } catch (error) {
      showError(error.message || 'Failed to load Team billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) load();
  }, [teamId]);

  const quota = Number(summary?.quota || 0);
  const usedQuota = Number(summary?.used_quota || 0);

  return (
    <div className='mt-[60px] px-2'>
      <Skeleton loading={loading} active>
        <div className='mb-4'>
          <Text type='tertiary'>Team account</Text>
          <Title heading={3} className='!m-0'>
            Team billing
          </Title>
        </div>
        <Row gutter={[16, 16]}>
          <MetricCard title='Available balance' value={renderQuota(quota)} />
          <MetricCard title='Used credit' value={renderQuota(usedQuota)} />
          <MetricCard
            title='Total credit'
            value={renderQuota(quota + usedQuota)}
          />
        </Row>
      </Skeleton>
    </div>
  );
};

const MetricCard = ({ title, value }) => (
  <Col xs={24} md={8}>
    <Card className='!rounded-xl'>
      <Text type='tertiary'>{title}</Text>
      <Title heading={4} className='!mt-2 !mb-0'>
        {value}
      </Title>
    </Card>
  </Col>
);

export default TeamBilling;
