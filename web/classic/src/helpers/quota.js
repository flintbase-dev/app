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
import {
  getCurrencyConfig,
  getSiteCreditsPerPriceUnit,
  renderQuota,
} from './render';

export const quotaToDisplayAmount = (quota) => {
  const q = Number(quota || 0);
  if (!Number.isFinite(q) || q === 0) return 0;
  return q / getSiteCreditsPerPriceUnit();
};

export const displayAmountToQuota = (amount) => {
  const val = Number(amount || 0);
  if (!Number.isFinite(val) || val === 0) return 0;
  return Math.round(val * getSiteCreditsPerPriceUnit());
};

export const getCurrencyAmountConfig = () => ({
  ...getCurrencyConfig(),
  siteCreditsPerPriceUnit: getSiteCreditsPerPriceUnit(),
});

export const getCurrencyAmountHint = (t) => {
  const { type, siteCreditsPerPriceUnit } = getCurrencyAmountConfig();
  return `${type} 1 = ${siteCreditsPerPriceUnit.toLocaleString()} ${t(
    '系统额度单位',
  )}`;
};

export const renderCurrencyAmountHint = (amount, t) =>
  `${getCurrencyAmountConfig().type} ${Number(amount || 0)} = ${renderQuota(
    displayAmountToQuota(amount),
    6,
  )} · ${getCurrencyAmountHint(t)}`;
