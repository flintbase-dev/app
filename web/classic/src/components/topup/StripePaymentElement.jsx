/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY; without even the implied warranty of MERCHANTABILITY
or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General
Public License for more details.

You should have received a copy of the GNU Affero General Public
License along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Banner, Button, Spin, Typography } from '@douyinfe/semi-ui';
import { CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { showError, showSuccess } from '../../helpers';

const { Text } = Typography;

const stripePromiseCache = new Map();

function getStripePromise(publishableKey) {
  if (!publishableKey) return null;
  if (!stripePromiseCache.has(publishableKey)) {
    stripePromiseCache.set(publishableKey, loadStripe(publishableKey));
  }
  return stripePromiseCache.get(publishableKey);
}

const StripePaymentElement = ({
  t,
  session,
  submitLabel,
  onSuccess,
  onProcessing,
}) => {
  const mountRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const paymentElementRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elementError, setElementError] = useState('');

  const returnUrl = useMemo(() => {
    return `${window.location.origin}/console/topup?show_history=true`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function mountElement() {
      setLoading(true);
      setElementError('');
      if (!session?.publishable_key || !session?.client_secret) {
        setElementError(t('支付参数缺失'));
        setLoading(false);
        return;
      }

      try {
        const stripe = await getStripePromise(session.publishable_key);
        if (cancelled) return;
        if (!stripe) {
          setElementError(t('Stripe 初始化失败'));
          setLoading(false);
          return;
        }

        const options = {
          clientSecret: session.client_secret,
          appearance: {
            theme: 'stripe',
            variables: {
              borderRadius: '8px',
            },
          },
        };
        if (session.customer_session_client_secret) {
          options.customerSessionClientSecret =
            session.customer_session_client_secret;
        }

        const elements = stripe.elements(options);
        const paymentElement = elements.create('payment', {
          layout: 'accordion',
        });
        paymentElement.mount(mountRef.current);

        stripeRef.current = stripe;
        elementsRef.current = elements;
        paymentElementRef.current = paymentElement;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setElementError(err?.message || t('Stripe 初始化失败'));
          setLoading(false);
        }
      }
    }

    mountElement();

    return () => {
      cancelled = true;
      if (paymentElementRef.current) {
        try {
          paymentElementRef.current.destroy();
        } catch (e) {
          // ignore Stripe element cleanup errors
        }
      }
      paymentElementRef.current = null;
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, [session?.client_secret, session?.publishable_key]);

  const confirmPayment = async () => {
    if (!stripeRef.current || !elementsRef.current) {
      showError(t('支付组件尚未就绪'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });

      if (result?.error) {
        showError(result.error.message || t('支付失败'));
        return;
      }

      const status = result?.paymentIntent?.status;
      if (status === 'succeeded') {
        showSuccess(t('支付成功，账单同步中'));
        onSuccess?.(result.paymentIntent);
      } else {
        showSuccess(t('支付已提交，到账以账单状态为准'));
        onProcessing?.(result?.paymentIntent);
      }
    } catch (err) {
      showError(err?.message || t('支付失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='space-y-3'>
      {session?.invoice_number || session?.invoice_id ? (
        <div className='flex items-center justify-between text-xs text-gray-500'>
          <Text type='tertiary'>{t('Stripe Invoice')}</Text>
          <Text copyable>{session.invoice_number || session.invoice_id}</Text>
        </div>
      ) : null}

      {elementError ? (
        <Banner
          type='danger'
          description={elementError}
          closeIcon={null}
          className='!rounded-xl'
        />
      ) : null}

      {loading ? (
        <div className='py-8 flex justify-center'>
          <Spin size='large' />
        </div>
      ) : null}

      <div ref={mountRef} className={loading ? 'hidden' : ''} />

      <Button
        type='primary'
        theme='solid'
        block
        icon={<CreditCard size={16} />}
        loading={submitting}
        disabled={loading || !!elementError}
        onClick={confirmPayment}
      >
        {submitLabel || t('确认支付')}
      </Button>
    </div>
  );
};

export default StripePaymentElement;
