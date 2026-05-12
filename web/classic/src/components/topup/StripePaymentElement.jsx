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

import React, { useEffect, useRef, useState } from 'react';
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

const StripePaymentElement = ({ t, session, submitLabel, onSuccess }) => {
  const requiresCustomerDetails = Boolean(session?.requires_customer_details);
  const requiresContactDetails = Boolean(
    session?.requires_customer_details && !session?.customer_email,
  );
  const contactMountRef = useRef(null);
  const billingAddressMountRef = useRef(null);
  const mountRef = useRef(null);
  const checkoutRef = useRef(null);
  const actionsRef = useRef(null);
  const contactElementRef = useRef(null);
  const billingAddressElementRef = useRef(null);
  const paymentElementRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contactComplete, setContactComplete] = useState(
    !requiresContactDetails,
  );
  const [billingAddressComplete, setBillingAddressComplete] = useState(
    !requiresCustomerDetails,
  );
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [elementError, setElementError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function mountElement() {
      setLoading(true);
      setPaymentComplete(false);
      setContactComplete(!requiresContactDetails);
      setBillingAddressComplete(!requiresCustomerDetails);
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

        const checkout = stripe.initCheckoutElementsSdk({
          clientSecret: session.client_secret,
          elementsOptions: {
            appearance: {
              theme: 'stripe',
              variables: {
                borderRadius: '8px',
              },
            },
          },
        });
        const loadActionsResult = await checkout.loadActions();
        if (cancelled) return;
        if (loadActionsResult.type === 'error') {
          setElementError(
            loadActionsResult.error?.message || t('Stripe 初始化失败'),
          );
          setLoading(false);
          return;
        }

        let contactElement = null;
        let billingAddressElement = null;
        if (requiresContactDetails) {
          contactElement = checkout.createContactDetailsElement();
          contactElement.on('change', (event) => {
            if (!cancelled) {
              setContactComplete(Boolean(event.complete));
            }
          });
          contactElement.mount(contactMountRef.current);
        }

        if (requiresCustomerDetails) {
          billingAddressElement = checkout.createBillingAddressElement({
            display: { name: 'full' },
          });
          billingAddressElement.on('change', (event) => {
            if (!cancelled) {
              setBillingAddressComplete(Boolean(event.complete));
            }
          });
          billingAddressElement.mount(billingAddressMountRef.current);
        }

        const paymentElement = checkout.createPaymentElement({
          layout: 'accordion',
        });
        paymentElement.on('change', (event) => {
          if (!cancelled) {
            setPaymentComplete(Boolean(event.complete));
          }
        });
        paymentElement.mount(mountRef.current);

        checkoutRef.current = checkout;
        actionsRef.current = loadActionsResult.actions;
        contactElementRef.current = contactElement;
        billingAddressElementRef.current = billingAddressElement;
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
      if (contactElementRef.current) {
        try {
          contactElementRef.current.destroy();
        } catch (e) {
          // ignore Stripe element cleanup errors
        }
      }
      if (billingAddressElementRef.current) {
        try {
          billingAddressElementRef.current.destroy();
        } catch (e) {
          // ignore Stripe element cleanup errors
        }
      }
      contactElementRef.current = null;
      billingAddressElementRef.current = null;
      paymentElementRef.current = null;
      actionsRef.current = null;
      checkoutRef.current = null;
    };
  }, [
    session?.client_secret,
    session?.customer_email,
    session?.publishable_key,
    session?.requires_customer_details,
    requiresContactDetails,
    requiresCustomerDetails,
  ]);

  const confirmCheckout = async () => {
    if (!actionsRef.current) {
      showError(t('支付组件尚未就绪'));
      return;
    }
    setSubmitting(true);
    try {
      const confirmArgs = {
        redirect: 'if_required',
      };
      const result = await actionsRef.current.confirm(confirmArgs);

      if (result?.type === 'error') {
        showError(result.error.message || t('支付失败'));
        return;
      }

      const paymentStatus =
        result?.session?.status?.paymentStatus ||
        result?.session?.paymentStatus;
      const sessionComplete =
        result?.session?.status?.type === 'complete' ||
        paymentStatus === 'paid' ||
        paymentStatus === 'no_payment_required';
      if (
        sessionComplete &&
        (paymentStatus === 'paid' || paymentStatus === 'no_payment_required')
      ) {
        showSuccess(t('支付成功，账单同步中'));
        onSuccess?.(result.session);
      } else {
        showError(t('请先完成支付信息填写'));
      }
    } catch (err) {
      showError(err?.message || t('支付失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='space-y-3'>
      {session?.invoice_number ||
      session?.invoice_id ||
      session?.payment_order_id ||
      session?.checkout_session_id ? (
        <div className='flex items-center justify-between text-xs text-gray-500'>
          <Text type='tertiary'>{t('Stripe Session')}</Text>
          <Text copyable>
            {session.invoice_number ||
              session.invoice_id ||
              session.payment_order_id ||
              session.checkout_session_id}
          </Text>
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

      {requiresContactDetails ? (
        <div className={loading ? 'hidden' : 'space-y-2'}>
          <Text strong>{t('联系信息')}</Text>
          <div ref={contactMountRef} />
        </div>
      ) : null}
      {requiresCustomerDetails ? (
        <div className={loading ? 'hidden' : 'space-y-2'}>
          <Text strong>{t('账单地址')}</Text>
          <div ref={billingAddressMountRef} />
        </div>
      ) : null}

      <div ref={mountRef} className={loading ? 'hidden' : ''} />

      <Button
        type='primary'
        theme='solid'
        block
        icon={<CreditCard size={16} />}
        loading={submitting}
        disabled={
          loading ||
          !!elementError ||
          !contactComplete ||
          !billingAddressComplete ||
          !paymentComplete
        }
        onClick={confirmCheckout}
      >
        {submitLabel || t('确认支付')}
      </Button>
    </div>
  );
};

export default StripePaymentElement;
