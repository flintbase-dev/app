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
import { Button, Col, Form, Row, Spin, Typography } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export default function GeneralSettings(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    TopUpLink: '',
    'general_setting.docs_link': '',
    'general_setting.quota_display_type': 'USD',
    RetryTimes: '',
    DisplayTokenStatEnabled: false,
    DefaultCollapseSidebar: false,
    'token_setting.max_user_tokens': 1000,
  });
  const [inputsRow, setInputsRow] = useState(inputs);
  const refForm = useRef();

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((prev) => ({ ...prev, [fieldName]: value }));
    };
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = inputs[item.key];
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined))
            return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = { ...inputs };
    for (let key in props.options) {
      if (Object.keys(currentInputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    currentInputs['general_setting.quota_display_type'] =
      currentInputs['general_setting.quota_display_type'] === 'CNY'
        ? 'CNY'
        : 'USD';
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current?.setValues(currentInputs);
  }, [props.options]);

  const currencyType = inputs['general_setting.quota_display_type'];
  const currencyDesc =
    currencyType === 'CNY'
      ? t('全站金额、余额、价格、充值显示均使用人民币 (¥)')
      : t('全站金额、余额、价格、充值显示均使用美元 ($)');

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        <Form.Section text={t('通用设置')}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Input
                field={'TopUpLink'}
                label={t('充值链接')}
                initValue={''}
                placeholder={t('例如发卡网站的购买链接')}
                onChange={handleFieldChange('TopUpLink')}
                showClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Input
                field={'general_setting.docs_link'}
                label={t('文档地址')}
                initValue={''}
                placeholder={t('例如 https://docs.newapi.pro')}
                onChange={handleFieldChange('general_setting.docs_link')}
                showClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Input
                field={'RetryTimes'}
                label={t('失败重试次数')}
                initValue={''}
                placeholder={t('失败重试次数')}
                onChange={handleFieldChange('RetryTimes')}
                showClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Select
                field='general_setting.quota_display_type'
                label={t('全站货币')}
                extraText={currencyDesc}
                onChange={handleFieldChange(
                  'general_setting.quota_display_type',
                )}
              >
                <Form.Select.Option value='USD'>USD ($)</Form.Select.Option>
                <Form.Select.Option value='CNY'>CNY (¥)</Form.Select.Option>
              </Form.Select>
            </Col>
            <Col span={24}>
              <Text type='tertiary' size='small'>
                {t(
                  '价格配置只保存数字；全站货币只决定金额展示符号。站内额度输入框均直接输入站内额度。',
                )}
              </Text>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'DisplayTokenStatEnabled'}
                label={t('额度查询接口返回令牌额度而非用户额度')}
                size='default'
                checkedText='｜'
                uncheckedText='〇'
                onChange={handleFieldChange('DisplayTokenStatEnabled')}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Switch
                field={'DefaultCollapseSidebar'}
                label={t('默认折叠侧边栏')}
                size='default'
                checkedText='｜'
                uncheckedText='〇'
                onChange={handleFieldChange('DefaultCollapseSidebar')}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.InputNumber
                label={t('用户最大令牌数量')}
                field={'token_setting.max_user_tokens'}
                step={1}
                min={1}
                extraText={t(
                  '每个用户最多可创建的令牌数量，默认 1000，设置过大可能会影响性能',
                )}
                placeholder={'1000'}
                onChange={handleFieldChange('token_setting.max_user_tokens')}
              />
            </Col>
          </Row>
          <Row>
            <Button size='default' onClick={onSubmit}>
              {t('保存通用设置')}
            </Button>
          </Row>
        </Form.Section>
      </Form>
    </Spin>
  );
}
