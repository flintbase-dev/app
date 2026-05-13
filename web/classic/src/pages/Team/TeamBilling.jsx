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
import {
  Button,
  Card,
  InputNumber,
  Skeleton,
  Space,
  Table,
  Typography,
} from '@douyinfe/semi-ui';
import { CreditCard, ExternalLink } from 'lucide-react';
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

const TeamBilling = () => {
  const { teamId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [topUpCount, setTopUpCount] = useState(5);
  const [amount, setAmount] = useState(0);
  const [amountLoading, setAmountLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSession, setPaymentSession] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, topupsRes] = await Promise.all([
        API.query('teamBillingSummary', { team_id: teamId }),
        API.query('teamTopups', { team_id: teamId }),
      ]);
      if (summaryRes.data?.success) setSummary(summaryRes.data.data);
      if (topupsRes.data?.success) setOrders(topupsRes.data.data || []);
    } catch (error) {
      showError(error.message || 'Failed to load Team billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) load();
  }, [teamId]);

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
      } else {
        showError(res.data?.data || 'Failed to calculate Stripe amount');
        return false;
      }
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
        return_url: `${window.location.origin}/teams/${teamId}/console/topup?show_history=true&session_id={CHECKOUT_SESSION_ID}`,
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
    const res = await API.mutation('teamStripeBillingPortal', {
      team_id: teamId,
      return_url: window.location.href,
    });
    if (res.data?.message === 'success' && res.data?.data?.url) {
      window.location.assign(res.data.data.url);
      return;
    }
    showError(res.data?.data || 'Billing portal is not available');
  };

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
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div>
            <Text type='tertiary'>Team admin</Text>
            <Title heading={3} className='!m-0'>
              Team billing
            </Title>
          </div>
          <Button icon={<ExternalLink size={16} />} onClick={openBillingPortal}>
            Stripe portal
          </Button>
        </div>
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <Card className='!rounded-xl lg:col-span-1'>
            <Text type='tertiary'>Balance</Text>
            <Title heading={4}>{renderQuota(summary?.quota || 0)}</Title>
            <Text type='tertiary'>
              Used {renderQuota(summary?.used_quota || 0)}
            </Text>
          </Card>
          <Card className='!rounded-xl lg:col-span-2'>
            <Space vertical align='start' className='w-full'>
              <Text strong>Add Team credits</Text>
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
            columns={columns}
            dataSource={orders}
            pagination={false}
          />
        </Card>
      </Skeleton>
    </div>
  );
};

export default TeamBilling;
