/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License
as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  API,
  copy,
  showError,
  showSuccess,
  setStatusData,
  setUserData,
} from '../../helpers';
import { UserContext } from '../../context/User';
import { Button, Card, Typography, Input } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import UserInfoHeader from './personal/components/UserInfoHeader';
import NotificationSettings from './personal/cards/NotificationSettings';
import PreferencesSettings from './personal/cards/PreferencesSettings';
import CheckinCalendar from './personal/cards/CheckinCalendar';
import AccountDeleteModal from './personal/modals/AccountDeleteModal';

const PersonalSetting = () => {
  const [userState, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [inputs, setInputs] = useState({
    self_account_deletion_confirmation: '',
  });
  const [status, setStatus] = useState({});
  const [showAccountDeleteModal, setShowAccountDeleteModal] = useState(false);
  const [hCaptchaEnabled, setHCaptchaEnabled] = useState(false);
  const [hCaptchaSiteKey, setHCaptchaSiteKey] = useState('');
  const [, setSystemToken] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({
    warningThreshold: 100000,
    upstreamModelUpdateNotifyEnabled: false,
    acceptUnsetModelPriceModel: false,
    recordIpLog: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await API.query('status');
        const { success, data } = res.data;
        if (success && data) {
          setStatus(data);
          setStatusData(data);
          if (data.hcaptcha_check) {
            setHCaptchaEnabled(true);
            setHCaptchaSiteKey(data.hcaptcha_site_key);
          } else {
            setHCaptchaEnabled(false);
            setHCaptchaSiteKey('');
          }
        }
      } catch (e) {
        // keep current values
      }
    })();
  }, []);

  useEffect(() => {
    if (userState?.user?.setting) {
      try {
        const settings = JSON.parse(userState.user.setting);
        setNotificationSettings({
          warningThreshold: settings.quota_warning_threshold || 1000000,
          upstreamModelUpdateNotifyEnabled:
            settings.upstream_model_update_notify_enabled === true,
          acceptUnsetModelPriceModel:
            settings.accept_unset_model_price_model || false,
          recordIpLog: settings.record_ip_log || false,
        });
      } catch (e) {
        // ignore
      }
    }
  }, [userState?.user?.setting]);

  const handleInputChange = (name, value) => {
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const generateAccessToken = async () => {
    const res = await API.mutation('generateAccessToken');
    const { success, message, data } = res.data;
    if (success) {
      setSystemToken(data);
      await copy(data);
      showSuccess(t('令牌已重置并已复制到剪贴板'));
    } else {
      showError(message);
    }
  };

  const deleteAccount = async () => {
    if (
      inputs.self_account_deletion_confirmation !== userState?.user?.username
    ) {
      showError(t('请输入正确的用户名以确认删除'));
      return;
    }
    const res = await API.mutation('deleteSelf');
    if (res.data.success) {
      showSuccess(t('账户已删除'));
      userDispatch({ type: 'logout' });
      localStorage.removeItem('user');
      setUserData(null);
      navigate('/login', { replace: true });
    } else {
      showError(res.data.message || t('删除失败'));
    }
  };

  const saveNotificationSettings = async () => {
    const res = await API.mutation('updateUserSetting', {
      quota_warning_threshold: notificationSettings.warningThreshold,
      upstream_model_update_notify_enabled:
        notificationSettings.upstreamModelUpdateNotifyEnabled,
      accept_unset_model_price_model:
        notificationSettings.acceptUnsetModelPriceModel,
      record_ip_log: notificationSettings.recordIpLog,
    });
    if (res.data.success) {
      showSuccess(t('通知设置已保存'));
    } else {
      showError(res.data.message || t('保存失败'));
    }
  };

  return (
    <div className='space-y-4'>
      <UserInfoHeader t={t} userState={userState} />

      <Card className='!rounded-2xl shadow-sm border-0'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <Typography.Text className='text-lg font-medium'>
              {t('账号')}
            </Typography.Text>
            <div className='text-xs text-gray-600'>
              {t('WorkOS 提供身份，本页仅管理本地偏好和应用令牌')}
            </div>
          </div>
          <Button type='primary' theme='outline' onClick={generateAccessToken}>
            {t('重置系统令牌')}
          </Button>
        </div>
        <div className='mt-4 grid gap-2 text-sm'>
          <div>
            <span className='text-gray-500'>{t('WorkOS ID')}:</span>{' '}
            <span>{userState?.user?.workos_id || '-'}</span>
          </div>
          <div>
            <span className='text-gray-500'>{t('邮箱')}:</span>{' '}
            <span>{userState?.user?.email || '-'}</span>
          </div>
          <div>
            <span className='text-gray-500'>{t('认证方式')}:</span>{' '}
            <span>{userState?.user?.workos_authentication_method || '-'}</span>
          </div>
        </div>
        <div className='mt-4'>
          <Input
            value={inputs.self_account_deletion_confirmation}
            onChange={(value) =>
              handleInputChange('self_account_deletion_confirmation', value)
            }
            placeholder={t('输入你的账户名{{username}}以确认删除', {
              username: userState?.user?.username || '',
            })}
          />
          <div className='mt-3 flex justify-end'>
            <Button
              type='danger'
              theme='solid'
              onClick={() => setShowAccountDeleteModal(true)}
            >
              {t('删除账户')}
            </Button>
          </div>
        </div>
      </Card>

      <PreferencesSettings t={t} />
      <NotificationSettings
        t={t}
        notificationSettings={notificationSettings}
        handleNotificationSettingChange={(key, value) =>
          setNotificationSettings((prev) => ({ ...prev, [key]: value }))
        }
        saveNotificationSettings={saveNotificationSettings}
      />
      <CheckinCalendar
        t={t}
        status={status}
        hCaptchaEnabled={hCaptchaEnabled}
        hCaptchaSiteKey={hCaptchaSiteKey}
      />

      <AccountDeleteModal
        t={t}
        showAccountDeleteModal={showAccountDeleteModal}
        setShowAccountDeleteModal={setShowAccountDeleteModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        deleteAccount={deleteAccount}
        userState={userState}
        hCaptchaEnabled={hCaptchaEnabled}
        hCaptchaSiteKey={hCaptchaSiteKey}
        setHCaptchaToken={() => {}}
      />
    </div>
  );
};

export default PersonalSetting;
