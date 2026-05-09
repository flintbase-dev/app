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

import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Col,
  Form,
  Row,
  Spin,
  DatePicker,
  Typography,
  Modal,
} from '@douyinfe/semi-ui';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../../helpers';

const { Text } = Typography;

export default function SettingsLog() {
  const { t } = useTranslation();
  const [loadingCleanHistoryLog, setLoadingCleanHistoryLog] = useState(false);
  const [inputs, setInputs] = useState({
    historyTimestamp: dayjs().subtract(1, 'month').toDate(),
    historyCategory: 'error',
  });
  const refForm = useRef();
  async function onCleanHistoryLog() {
    if (!inputs.historyTimestamp) {
      showError(t('请选择日志记录时间'));
      return;
    }

    const now = dayjs();
    const targetDate = dayjs(inputs.historyTimestamp);
    const targetTime = targetDate.format('YYYY-MM-DD HH:mm:ss');
    const currentTime = now.format('YYYY-MM-DD HH:mm:ss');
    const daysDiff = now.diff(targetDate, 'day');

    Modal.confirm({
      title: t('确认清除历史日志'),
      content: (
        <div style={{ lineHeight: '1.8' }}>
          <p>
            <Text>{t('当前时间')}：</Text>
            <Text strong style={{ color: '#52c41a' }}>
              {currentTime}
            </Text>
          </p>
          <p>
            <Text>{t('选择时间')}：</Text>
            <Text strong type='danger'>
              {targetTime}
            </Text>
            {daysDiff > 0 && (
              <Text type='tertiary'>
                {' '}
                ({t('约')} {daysDiff} {t('天前')})
              </Text>
            )}
          </p>
          <div
            style={{
              background: '#fff7e6',
              border: '1px solid #ffd591',
              padding: '12px',
              borderRadius: '4px',
              marginTop: '12px',
              color: '#333',
            }}
          >
            <Text strong style={{ color: '#d46b08' }}>
              ⚠️ {t('注意')}：
            </Text>
            <Text style={{ color: '#333' }}>{t('将删除')} </Text>
            <Text strong style={{ color: '#cf1322' }}>
              {targetTime}
            </Text>
            {daysDiff > 0 && (
              <Text style={{ color: '#8c8c8c' }}>
                {' '}
                ({t('约')} {daysDiff} {t('天前')})
              </Text>
            )}
            <Text style={{ color: '#333' }}> {t('之前的选定类型日志')}</Text>
          </div>
          <p style={{ marginTop: '12px' }}>
            <Text type='danger'>
              {t('此操作不可恢复，请仔细确认时间后再操作！')}
            </Text>
          </p>
        </div>
      ),
      okText: t('确认删除'),
      cancelText: t('取消'),
      okType: 'danger',
      onOk: async () => {
        try {
          setLoadingCleanHistoryLog(true);
          const res = await API.delete(
            `/api/log/?category=${inputs.historyCategory}&target_timestamp=${Date.parse(inputs.historyTimestamp) / 1000}`,
          );
          const { success, message, data } = res.data;
          if (success) {
            showSuccess(`${data} ${t('条日志已清理！')}`);
            return;
          } else {
            throw new Error(t('日志清理失败：') + message);
          }
        } catch (error) {
          showError(error.message);
        } finally {
          setLoadingCleanHistoryLog(false);
        }
      },
    });
  }

  useEffect(() => {
    refForm.current?.setValues(inputs);
  }, [inputs]);
  return (
    <>
      <Spin spinning={false}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('日志设置')}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Spin spinning={loadingCleanHistoryLog}>
                  <Form.Select
                    label={t('清理日志类型')}
                    field={'historyCategory'}
                    optionList={[
                      { label: t('错误'), value: 'error' },
                      { label: t('安全'), value: 'security' },
                      { label: t('活动'), value: 'activity' },
                    ]}
                    onChange={(value) => {
                      setInputs({
                        ...inputs,
                        historyCategory: value,
                      });
                    }}
                  />
                  <Form.DatePicker
                    label={t('清除历史日志')}
                    field={'historyTimestamp'}
                    type='dateTime'
                    inputReadOnly={true}
                    onChange={(value) => {
                      setInputs({
                        ...inputs,
                        historyTimestamp: value,
                      });
                    }}
                  />
                  <Text
                    type='tertiary'
                    size='small'
                    style={{ display: 'block', marginTop: 4, marginBottom: 8 }}
                  >
                    {t('将清除选定时间之前的错误、安全或活动日志')}
                  </Text>
                  <Button
                    size='default'
                    type='danger'
                    onClick={onCleanHistoryLog}
                  >
                    {t('清除历史日志')}
                  </Button>
                </Spin>
              </Col>
            </Row>
          </Form.Section>
        </Form>
      </Spin>
    </>
  );
}
