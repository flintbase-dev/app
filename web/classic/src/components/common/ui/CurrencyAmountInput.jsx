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
import { Form, InputNumber, Tooltip } from '@douyinfe/semi-ui';
import { IconHelpCircle } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import {
  getCurrencyAmountConfig,
  getCurrencyAmountHint,
} from '../../../helpers/quota';

const buildLabel = (label, helpText) => (
  <span className='inline-flex items-center gap-1'>
    <span>{label}</span>
    <Tooltip content={helpText} position='top'>
      <IconHelpCircle className='text-gray-400 cursor-help' />
    </Tooltip>
  </span>
);

const buildExtraText = (extraText, hintText) => {
  if (!extraText) return hintText;
  return (
    <span>
      {extraText} · {hintText}
    </span>
  );
};

export const CurrencyAmountFormInput = ({
  label,
  extraText,
  precision = 6,
  step = 0.000001,
  min = 0,
  ...props
}) => {
  const { t } = useTranslation();
  const { symbol } = getCurrencyAmountConfig();
  const hintText = getCurrencyAmountHint(t);

  return (
    <Form.InputNumber
      min={min}
      step={step}
      precision={precision}
      prefix={symbol}
      label={buildLabel(label, hintText)}
      extraText={buildExtraText(extraText, hintText)}
      {...props}
    />
  );
};

export const CurrencyAmountNumberInput = ({
  label,
  extraText,
  precision = 6,
  step = 0.000001,
  min = 0,
  ...props
}) => {
  const { t } = useTranslation();
  const { symbol } = getCurrencyAmountConfig();
  const hintText = getCurrencyAmountHint(t);

  return (
    <div>
      {label ? (
        <div className='mb-2 text-sm font-medium'>
          {buildLabel(label, hintText)}
        </div>
      ) : null}
      <InputNumber
        min={min}
        step={step}
        precision={precision}
        prefix={symbol}
        {...props}
      />
      {extraText !== false ? (
        <div className='mt-1 text-xs text-gray-500'>
          {buildExtraText(extraText, hintText)}
        </div>
      ) : null}
    </div>
  );
};
