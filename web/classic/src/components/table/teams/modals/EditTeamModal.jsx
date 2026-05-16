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

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Row,
  SideSheet,
  Space,
  Spin,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { IconClose, IconSave } from '@douyinfe/semi-icons';
import { Building2 } from 'lucide-react';
import { API, showError } from '../../../../helpers';
import {
  displayAmountToQuota,
  quotaToDisplayAmount,
} from '../../../../helpers/quota';
import { CurrencyAmountFormInput } from '../../../common/ui/CurrencyAmountInput';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';

const { Text, Title } = Typography;

const EditTeamModal = ({
  visible,
  editingTeam,
  groupOptions,
  updateTeam,
  handleClose,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const formApiRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState(null);
  const teamId = editingTeam?.id;

  const getInitValues = () => ({
    name: '',
    group: 'default',
    quota_amount: 0,
  });

  const loadTeam = async () => {
    if (!visible || !teamId) return;
    setLoading(true);
    try {
      const res = await API.query('adminTeam', { id: teamId });
      const { success, message, data } = res.data;
      if (success) {
        const next = {
          ...getInitValues(),
          ...data,
          quota_amount: quotaToDisplayAmount(data.quota || 0),
        };
        setTeam(next);
        formApiRef.current?.setValues(next);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadTeam();
    } else {
      setTeam(null);
    }
  }, [visible, teamId]);

  const submit = async (values) => {
    await updateTeam({
      id: teamId,
      name: values.name,
      group: values.group,
      quota: displayAmountToQuota(Number(values.quota_amount || 0)),
    });
  };

  return (
    <SideSheet
      placement='right'
      title={
        <Space>
          <Tag color='blue' shape='circle'>
            {t('编辑')}
          </Tag>
          <Title heading={4} className='m-0'>
            {t('编辑团队')}
          </Title>
        </Space>
      }
      bodyStyle={{ padding: 0 }}
      visible={visible}
      width={isMobile ? '100%' : 620}
      footer={
        <div className='flex justify-end bg-white'>
          <Space>
            <Button
              theme='solid'
              onClick={() => formApiRef.current?.submitForm()}
              icon={<IconSave />}
              loading={loading}
            >
              {t('提交')}
            </Button>
            <Button
              theme='light'
              type='primary'
              onClick={handleClose}
              icon={<IconClose />}
            >
              {t('取消')}
            </Button>
          </Space>
        </div>
      }
      closeIcon={null}
      onCancel={handleClose}
    >
      <Spin spinning={loading}>
        <Form
          initValues={getInitValues()}
          getFormApi={(api) => (formApiRef.current = api)}
          onSubmit={submit}
        >
          <div className='p-3 space-y-3'>
            <Card className='!rounded-lg border-0 shadow-sm'>
              <div className='flex items-center mb-3'>
                <Avatar size='small' color='blue' className='mr-2'>
                  <Building2 size={16} />
                </Avatar>
                <div>
                  <Text className='text-base font-medium'>{t('基本信息')}</Text>
                  <div className='text-xs text-gray-600'>
                    {t('团队名称同步到 WorkOS，分组和额度属于应用本地策略')}
                  </div>
                </div>
              </div>

              <Row gutter={12}>
                <Col span={24}>
                  <Form.Input
                    field='name'
                    label={t('团队名称')}
                    placeholder={t('请输入团队名称')}
                    rules={[{ required: true, message: t('请输入团队名称') }]}
                    showClear
                  />
                </Col>
                <Col span={24}>
                  <Form.Select
                    field='group'
                    label={t('分组')}
                    optionList={groupOptions}
                    rules={[{ required: true, message: t('请选择分组') }]}
                    showClear
                  />
                </Col>
                <Col span={24}>
                  <CurrencyAmountFormInput
                    field='quota_amount'
                    label={t('剩余额度')}
                    placeholder={t('请输入剩余额度')}
                  />
                </Col>
              </Row>
            </Card>

            <Card className='!rounded-lg border-0 shadow-sm'>
              <div className='grid gap-2 text-sm'>
                <div>
                  <span className='text-gray-500'>{t('团队 ID')}:</span>{' '}
                  <span>{team?.id || teamId || '-'}</span>
                </div>
                <div>
                  <span className='text-gray-500'>{t('WorkOS 组织 ID')}:</span>{' '}
                  <span>{team?.workos_organization_id || '-'}</span>
                </div>
                <div>
                  <span className='text-gray-500'>Slug:</span>{' '}
                  <span>{team?.slug || '-'}</span>
                </div>
              </div>
            </Card>
          </div>
        </Form>
      </Spin>
    </SideSheet>
  );
};

export default EditTeamModal;
