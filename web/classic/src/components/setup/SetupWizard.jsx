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
import { Banner, Button, Card, Descriptions, Spin } from '@douyinfe/semi-ui';
import { IconRefresh } from '@douyinfe/semi-icons';
import { API, showError } from '../../helpers';
import { useTranslation } from 'react-i18next';

const SetupWizard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState({
    status: false,
    root_init: false,
  });

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/setup');
      const { success, data } = res.data;
      if (success) {
        setSetupStatus(data);

        // If setup is already completed, redirect to home
        if (data.status) {
          window.location.href = '/';
          return;
        }
      } else {
        showError(t('获取初始化状态失败'));
      }
    } catch (error) {
      console.error('Failed to fetch setup status:', error);
      showError(t('获取初始化状态失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center px-4'>
      <div className='w-full max-w-2xl'>
        <Card className='!rounded-2xl shadow-sm border-0'>
          <div className='mb-4'>
            <div className='text-xl font-semibold'>{t('系统初始化')}</div>
            <div className='text-xs text-gray-600'>
              {t('数据库迁移和初始化由独立服务完成')}
            </div>
          </div>

          <Spin spinning={loading}>
            <Banner
              type='warning'
              closeIcon={null}
              title={t('系统尚未初始化')}
              description={t(
                '主应用不会执行数据库迁移或创建初始管理员。请先运行 Docker Compose 中的 db-migrate 服务，或直接执行 new-api-migrator 完成 PostgreSQL schema 迁移和初始化数据写入。',
              )}
              className='!rounded-lg mb-4'
              fullMode={false}
              bordered
            />

            <Descriptions>
              <Descriptions.Item itemKey={t('数据库类型')}>
                PostgreSQL
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('数据库迁移')}>
                {setupStatus.status ? t('已完成') : t('未完成')}
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('管理员账号')}>
                {setupStatus.root_init ? t('已初始化') : t('未初始化')}
              </Descriptions.Item>
            </Descriptions>

            <div className='flex justify-end pt-4'>
              <Button
                type='primary'
                icon={<IconRefresh />}
                loading={loading}
                onClick={fetchSetupStatus}
                className='!rounded-lg'
              >
                {t('重新检查')}
              </Button>
            </div>
          </Spin>
        </Card>
      </div>
    </div>
  );
};

export default SetupWizard;
