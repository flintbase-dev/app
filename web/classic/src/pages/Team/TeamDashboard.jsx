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
import { useParams, Link } from 'react-router-dom';
import {
  Card,
  Col,
  Row,
  Skeleton,
  Typography,
  Button,
} from '@douyinfe/semi-ui';
import { CreditCard, KeyRound, ScrollText, Settings } from 'lucide-react';
import { API, renderQuota, showError } from '../../helpers';

const { Title, Text } = Typography;

const TeamDashboard = () => {
  const { teamId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [tokens, setTokens] = useState({ total: 0, items: [] });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setTeam(null);
      setTokens({ total: 0, items: [] });
      try {
        const [teamRes, tokensRes] = await Promise.all([
          API.query('team', { team_id: teamId }),
          API.query('teamTokens', { team_id: teamId, p: 1, page_size: 5 }),
        ]);
        if (teamRes.data?.success) {
          setTeam(teamRes.data.data);
        } else {
          showError(teamRes.data?.message || 'Failed to load team');
        }
        if (tokensRes.data?.success) {
          setTokens(tokensRes.data.data || { total: 0, items: [] });
        } else {
          showError(tokensRes.data?.message || 'Failed to load team tokens');
        }
      } catch (error) {
        showError(error.message || 'Failed to load team dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (teamId) load();
  }, [teamId]);

  const base = `/teams/${teamId}/console`;
  const isTeamAdmin = team?.role === 'admin';

  return (
    <div className='mt-[60px] px-2'>
      <Skeleton loading={loading} active>
        <div className='mb-4 flex flex-col gap-1'>
          <Text type='tertiary'>Team console</Text>
          <Title heading={3} className='!m-0'>
            {team?.name || 'Team'}
          </Title>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <MetricCard
              title='Team balance'
              value={renderQuota(team?.quota || 0)}
            />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard
              title='Team usage'
              value={renderQuota(team?.used_quota || 0)}
            />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard title='API keys' value={String(tokens.total || 0)} />
          </Col>
        </Row>
        <Row gutter={[16, 16]} className='mt-4'>
          <QuickLink
            icon={<KeyRound size={18} />}
            href={`${base}/token`}
            title='API keys'
          />
          <QuickLink
            icon={<ScrollText size={18} />}
            href={`${base}/log`}
            title='Usage logs'
          />
          {isTeamAdmin ? (
            <>
              <QuickLink
                icon={<CreditCard size={18} />}
                href={`${base}/topup`}
                title='Team billing'
              />
              <QuickLink
                icon={<Settings size={18} />}
                href={`${base}/settings`}
                title='Team settings'
              />
            </>
          ) : null}
        </Row>
      </Skeleton>
    </div>
  );
};

const MetricCard = ({ title, value }) => (
  <Card className='!rounded-xl'>
    <Text type='tertiary'>{title}</Text>
    <Title heading={4} className='!mt-2 !mb-0'>
      {value}
    </Title>
  </Card>
);

const QuickLink = ({ icon, href, title }) => (
  <Col xs={24} sm={12} lg={6}>
    <Card className='!rounded-xl'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          {icon}
          <Text strong>{title}</Text>
        </div>
        <Link to={href}>
          <Button size='small'>Open</Button>
        </Link>
      </div>
    </Card>
  </Col>
);

export default TeamDashboard;
