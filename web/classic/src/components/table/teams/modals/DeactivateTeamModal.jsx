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
import { Modal, Typography } from '@douyinfe/semi-ui';

const { Text } = Typography;

const DeactivateTeamModal = ({ visible, onCancel, onConfirm, team, t }) => {
  return (
    <Modal
      title={t('确定要停用此团队吗？')}
      visible={visible}
      onCancel={onCancel}
      onOk={onConfirm}
      type='warning'
      okButtonProps={{ type: 'danger' }}
    >
      <div className='space-y-2'>
        <Text>{t('此操作会从 WorkOS 侧删除团队组织并停用本地团队。')}</Text>
        <div className='text-sm text-gray-500'>
          {t('团队')}: {team?.name || team?.id || '-'}
        </div>
      </div>
    </Modal>
  );
};

export default DeactivateTeamModal;
