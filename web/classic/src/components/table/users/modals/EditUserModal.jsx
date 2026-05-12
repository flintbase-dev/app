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
import { API, renderQuota, showError, showSuccess } from '../../../../helpers';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import {
  Button,
  Modal,
  SideSheet,
  Space,
  Spin,
  Typography,
  Card,
  Tag,
  Form,
  Avatar,
  Row,
  Col,
  RadioGroup,
  Radio,
} from '@douyinfe/semi-ui';
import {
  IconUser,
  IconSave,
  IconClose,
  IconCoinMoneyStroked,
} from '@douyinfe/semi-icons';
import {
  quotaToDisplayAmount,
  displayAmountToQuota,
} from '../../../../helpers/quota';
import { CurrencyAmountNumberInput } from '../../../common/ui/CurrencyAmountInput';

const { Text, Title } = Typography;

const EditUserModal = (props) => {
  const { t } = useTranslation();
  const userId = props.editingUser.id;
  const isMobile = useIsMobile();
  const formApiRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [groupOptions, setGroupOptions] = useState([]);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustQuotaLocal, setAdjustQuotaLocal] = useState('');
  const [adjustMode, setAdjustMode] = useState('add');

  const isEdit = Boolean(userId);

  const getInitValues = () => ({
    username: '',
    display_name: '',
    group: 'default',
    remark: '',
    quota_amount: 0,
  });

  const loadUser = async () => {
    if (!userId) {
      setUser(getInitValues());
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await API.query('user', { id: userId });
    const { success, message, data } = res.data;
    if (success) {
      const next = {
        ...getInitValues(),
        ...data,
        quota_amount: quotaToDisplayAmount(data.quota || 0),
      };
      setUser(next);
      formApiRef.current?.setValues(next);
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const fetchGroups = async () => {
    try {
      const res = await API.query('groups');
      setGroupOptions(res.data.data.map((g) => ({ label: g, value: g })));
    } catch (e) {
      showError(e.message);
    }
  };

  useEffect(() => {
    loadUser();
    fetchGroups();
  }, [userId]);

  useEffect(() => {
    if (user && formApiRef.current) {
      formApiRef.current.setValues(user);
    }
  }, [user]);

  const handleCancel = () => props.handleClose();

  const submit = async (values) => {
    setLoading(true);
    const payload = {
      id: userId,
      username: values.username,
      display_name: values.display_name,
      group: values.group,
      remark: values.remark,
    };
    const res = await API.mutation('updateUser', payload);
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('用户信息更新成功！'));
      props.refresh?.();
      props.handleClose();
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const adjustQuota = async () => {
    const quotaVal = displayAmountToQuota(Number(adjustQuotaLocal || 0));
    if (!quotaVal) return;
    setAdjustLoading(true);
    try {
      const res = await API.mutation('manageUser', {
        id: userId,
        action: 'add_quota',
        mode: adjustMode,
        value: Math.abs(quotaVal),
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('调整额度成功'));
        setAdjustModalOpen(false);
        setAdjustQuotaLocal('');
        await loadUser();
        props.refresh?.();
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    }
    setAdjustLoading(false);
  };

  return (
    <>
      <SideSheet
        placement='right'
        title={
          <Space>
            <Tag color='blue' shape='circle'>
              {t(isEdit ? '编辑' : '新建')}
            </Tag>
            <Title heading={4} className='m-0'>
              {isEdit ? t('编辑用户') : t('创建用户')}
            </Title>
          </Space>
        }
        bodyStyle={{ padding: 0 }}
        visible={props.visible}
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
                onClick={handleCancel}
                icon={<IconClose />}
              >
                {t('取消')}
              </Button>
            </Space>
          </div>
        }
        closeIcon={null}
        onCancel={handleCancel}
      >
        <Spin spinning={loading}>
          <Form
            initValues={getInitValues()}
            getFormApi={(api) => (formApiRef.current = api)}
            onSubmit={submit}
          >
            {({ values }) => (
              <div className='p-3 space-y-3'>
                <Card className='!rounded-lg border-0 shadow-sm'>
                  <div className='flex items-center mb-3'>
                    <Avatar size='small' color='blue' className='mr-2'>
                      <IconUser size={16} />
                    </Avatar>
                    <div>
                      <Text className='text-base font-medium'>
                        {t('基本信息')}
                      </Text>
                      <div className='text-xs text-gray-600'>
                        {t('WorkOS 身份只读，以下字段属于应用本地资料')}
                      </div>
                    </div>
                  </div>

                  <Row gutter={12}>
                    <Col span={24}>
                      <Form.Input
                        field='username'
                        label={t('用户名')}
                        placeholder={t('请输入新的用户名')}
                        rules={[{ required: true, message: t('请输入用户名') }]}
                        showClear
                      />
                    </Col>
                    <Col span={24}>
                      <Form.Input
                        field='display_name'
                        label={t('显示名称')}
                        placeholder={t('请输入新的显示名称')}
                        showClear
                      />
                    </Col>
                    <Col span={24}>
                      <Form.Select
                        field='group'
                        label={t('分组')}
                        optionList={groupOptions}
                        showClear
                      />
                    </Col>
                    <Col span={24}>
                      <Form.TextArea
                        field='remark'
                        label={t('备注')}
                        placeholder={t('请输入备注')}
                        autosize={{ minRows: 2, maxRows: 4 }}
                        showClear
                      />
                    </Col>
                  </Row>
                </Card>

                <Card className='!rounded-lg border-0 shadow-sm'>
                  <div className='grid gap-2 text-sm'>
                    <div>
                      <span className='text-gray-500'>{t('WorkOS ID')}:</span>{' '}
                      <span>{user?.workos_id || '-'}</span>
                    </div>
                    <div>
                      <span className='text-gray-500'>{t('邮箱')}:</span>{' '}
                      <span>{user?.email || '-'}</span>
                    </div>
                    <div>
                      <span className='text-gray-500'>{t('认证方式')}:</span>{' '}
                      <span>{user?.workos_authentication_method || '-'}</span>
                    </div>
                    <div>
                      <span className='text-gray-500'>{t('组织 ID')}:</span>{' '}
                      <span>{user?.workos_organization_id || '-'}</span>
                    </div>
                  </div>
                </Card>

                {userId && (
                  <Card className='!rounded-lg border-0 shadow-sm'>
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex items-center min-w-0'>
                        <Avatar size='small' color='green' className='mr-2'>
                          <IconCoinMoneyStroked size={16} />
                        </Avatar>
                        <div className='min-w-0'>
                          <Text className='text-base font-medium'>
                            {t('额度')}
                          </Text>
                          <div className='text-xs text-gray-600'>
                            {t('只调整应用本地额度，不影响 WorkOS 身份')}
                          </div>
                        </div>
                      </div>
                      <Button
                        type='primary'
                        theme='outline'
                        onClick={() => setAdjustModalOpen(true)}
                      >
                        {t('调整额度')}
                      </Button>
                    </div>
                    <div className='mt-3 text-sm'>
                      {t('当前额度')}:{' '}
                      {renderQuota(
                        displayAmountToQuota(
                          values.quota_amount ?? user?.quota_amount ?? 0,
                        ),
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </Form>
        </Spin>
      </SideSheet>

      <Modal
        title={t('调整额度')}
        visible={adjustModalOpen}
        onOk={adjustQuota}
        confirmLoading={adjustLoading}
        onCancel={() => {
          setAdjustModalOpen(false);
          setAdjustQuotaLocal('');
          setAdjustMode('add');
        }}
      >
        <Form>
          <div className='mb-4'>
            <div className='mb-2 text-sm'>{t('模式')}</div>
            <RadioGroup
              value={adjustMode}
              onChange={(e) => setAdjustMode(e.target.value)}
            >
              <Radio value='add'>{t('增加')}</Radio>
              <Radio value='subtract'>{t('扣减')}</Radio>
              <Radio value='override'>{t('覆盖')}</Radio>
            </RadioGroup>
          </div>
          <CurrencyAmountNumberInput
            label={t('调整额度')}
            className='w-full mt-4'
            value={adjustQuotaLocal}
            onChange={(value) => setAdjustQuotaLocal(value)}
            placeholder={t('请输入额度')}
          />
        </Form>
      </Modal>
    </>
  );
};

export default EditUserModal;
