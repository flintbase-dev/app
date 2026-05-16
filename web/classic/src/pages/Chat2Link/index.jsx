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

import React from 'react';
import { Button, Empty, Typography } from '@douyinfe/semi-ui';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const chat2page = () => {
  const { t } = useTranslation();

  return (
    <div className='mt-[60px] flex min-h-[calc(100vh-60px)] items-center justify-center px-4'>
      <Empty
        title={t('无法自动生成聊天链接')}
        description={
          <Typography.Text type='tertiary'>
            {t(
              '完整 API 密钥仅在创建时显示一次。请创建新的 API 密钥后，将密钥手动填入目标聊天客户端。',
            )}
          </Typography.Text>
        }
      >
        <Link to='/console/token'>
          <Button type='primary'>{t('前往 API 密钥')}</Button>
        </Link>
      </Empty>
    </div>
  );
};

export default chat2page;
