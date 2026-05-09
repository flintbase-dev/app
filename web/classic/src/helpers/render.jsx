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

import i18next from 'i18next';
import { Modal, Tag, Typography, Avatar } from '@douyinfe/semi-ui';
import { copy, showSuccess } from './utils';
import { MOBILE_BREAKPOINT } from '../hooks/common/useIsMobile';
import {
  BILLING_PRICING_VARS,
  BILLING_VAR_KEY_TO_FIELD,
  BILLING_VAR_REGEX,
} from '../constants';
import { visit } from 'unist-util-visit';
import * as LobeIcons from '@lobehub/icons';
import { OpenAI, Claude, Gemini } from '@lobehub/icons';

import {
  LayoutDashboard,
  TerminalSquare,
  MessageSquare,
  Key,
  BarChart3,
  CreditCard,
  Layers,
  Gift,
  User,
  Settings,
  CircleUser,
  Package,
  CalendarClock,
} from 'lucide-react';

// 获取侧边栏Lucide图标组件
export function getLucideIcon(key, selected = false) {
  const size = 16;
  const strokeWidth = 2;
  const SELECTED_COLOR = 'var(--semi-color-primary)';
  const iconColor = selected ? SELECTED_COLOR : 'currentColor';
  const commonProps = {
    size,
    strokeWidth,
    className: `transition-colors duration-200 ${selected ? 'transition-transform duration-200 scale-105' : ''}`,
  };

  // 根据不同的key返回不同的图标
  switch (key) {
    case 'detail':
      return <LayoutDashboard {...commonProps} color={iconColor} />;
    case 'playground':
      return <TerminalSquare {...commonProps} color={iconColor} />;
    case 'chat':
      return <MessageSquare {...commonProps} color={iconColor} />;
    case 'token':
      return <Key {...commonProps} color={iconColor} />;
    case 'log':
      return <BarChart3 {...commonProps} color={iconColor} />;
    case 'topup':
      return <CreditCard {...commonProps} color={iconColor} />;
    case 'channel':
      return <Layers {...commonProps} color={iconColor} />;
    case 'redemption':
      return <Gift {...commonProps} color={iconColor} />;
    case 'user':
    case 'personal':
      return <User {...commonProps} color={iconColor} />;
    case 'models':
      return <Package {...commonProps} color={iconColor} />;
    case 'subscription':
      return <CalendarClock {...commonProps} color={iconColor} />;
    case 'setting':
      return <Settings {...commonProps} color={iconColor} />;
    default:
      return <CircleUser {...commonProps} color={iconColor} />;
  }
}

// 获取模型分类
export const getModelCategories = (() => {
  let categoriesCache = null;
  let lastLocale = null;

  return (t) => {
    const currentLocale = i18next.language;
    if (categoriesCache && lastLocale === currentLocale) {
      return categoriesCache;
    }

    categoriesCache = {
      all: {
        label: t('全部模型'),
        icon: null,
        filter: () => true,
      },
      openai: {
        label: 'OpenAI',
        icon: <OpenAI />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('gpt') ||
          model.model_name.toLowerCase().includes('dall-e') ||
          model.model_name.toLowerCase().includes('whisper') ||
          model.model_name.toLowerCase().includes('tts-1') ||
          model.model_name.toLowerCase().includes('text-embedding-3') ||
          model.model_name.toLowerCase().includes('text-moderation') ||
          model.model_name.toLowerCase().includes('babbage') ||
          model.model_name.toLowerCase().includes('davinci') ||
          model.model_name.toLowerCase().includes('curie') ||
          model.model_name.toLowerCase().includes('ada') ||
          model.model_name.toLowerCase().includes('o1') ||
          model.model_name.toLowerCase().includes('o3') ||
          model.model_name.toLowerCase().includes('o4'),
      },
      anthropic: {
        label: 'Anthropic',
        icon: <Claude.Color />,
        filter: (model) => model.model_name.toLowerCase().includes('claude'),
      },
      gemini: {
        label: 'Gemini',
        icon: <Gemini.Color />,
        filter: (model) =>
          model.model_name.toLowerCase().includes('gemini') ||
          model.model_name.toLowerCase().includes('gemma') ||
          model.model_name.toLowerCase().includes('learnlm') ||
          model.model_name.toLowerCase().includes('imagen-4') ||
          model.model_name.toLowerCase().includes('text-embedding-004'),
      },
    };

    lastLocale = currentLocale;
    return categoriesCache;
  };
})();

/**
 * 根据渠道类型返回对应的厂商图标
 * @param {number} channelType - 渠道类型值
 * @returns {JSX.Element|null} - 对应的厂商图标组件
 */
export function getChannelIcon(channelType) {
  const iconSize = 14;

  switch (channelType) {
    case 1: // OpenAI
    case 3: // Azure OpenAI
      return <OpenAI size={iconSize} />;
    case 14: // Anthropic Claude
    case 33: // AWS Claude
      return <Claude.Color size={iconSize} />;
    case 41: // Vertex AI
      return <Gemini.Color size={iconSize} />;
    case 24: // Google Gemini
      return <Gemini.Color size={iconSize} />;
    default:
      return null; // 未知类型或自定义渠道不显示图标
  }
}

/**
 * 根据图标名称动态获取 LobeHub 图标组件
 * 支持：
 * - 基础："OpenAI"、"OpenAI.Color" 等
 * - 额外属性（点号链式）："OpenAI.Avatar.type={'platform'}"、"Claude.Avatar.shape={'square'}"
 * - 继续兼容第二参数 size；若字符串里有 size=，以字符串为准
 * @param {string} iconName - 图标名称/描述
 * @param {number} size - 图标大小，默认为 14
 * @returns {JSX.Element} - 对应的图标组件或 Avatar
 */
export function getLobeHubIcon(iconName, size = 14) {
  if (typeof iconName === 'string') iconName = iconName.trim();
  // 如果没有图标名称，返回 Avatar
  if (!iconName) {
    return <Avatar size='extra-extra-small'>?</Avatar>;
  }

  // 解析组件路径与点号链式属性
  const segments = String(iconName).split('.');
  const baseKey = segments[0];
  const BaseIcon = LobeIcons[baseKey];

  let IconComponent = undefined;
  let propStartIndex = 1;

  if (BaseIcon && segments.length > 1 && BaseIcon[segments[1]]) {
    IconComponent = BaseIcon[segments[1]];
    propStartIndex = 2;
  } else {
    IconComponent = LobeIcons[baseKey];
    propStartIndex = 1;
  }

  // 失败兜底
  if (
    !IconComponent ||
    (typeof IconComponent !== 'function' && typeof IconComponent !== 'object')
  ) {
    const firstLetter = String(iconName).charAt(0).toUpperCase();
    return <Avatar size='extra-extra-small'>{firstLetter}</Avatar>;
  }

  // 解析点号链式属性，形如：key={...}、key='...'、key="..."、key=123、key、key=true/false
  const props = {};

  const parseValue = (raw) => {
    if (raw == null) return true;
    let v = String(raw).trim();
    // 去除一层花括号包裹
    if (v.startsWith('{') && v.endsWith('}')) {
      v = v.slice(1, -1).trim();
    }
    // 去除引号
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return v.slice(1, -1);
    }
    // 布尔
    if (v === 'true') return true;
    if (v === 'false') return false;
    // 数字
    if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
    // 其他原样返回字符串
    return v;
  };

  for (let i = propStartIndex; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg) continue;
    const eqIdx = seg.indexOf('=');
    if (eqIdx === -1) {
      props[seg.trim()] = true;
      continue;
    }
    const key = seg.slice(0, eqIdx).trim();
    const valRaw = seg.slice(eqIdx + 1).trim();
    props[key] = parseValue(valRaw);
  }

  // 兼容第二参数 size，若字符串中未显式指定 size，则使用函数入参
  if (props.size == null && size != null) props.size = size;

  return <IconComponent {...props} />;
}

// 颜色列表
const colors = [
  'amber',
  'blue',
  'cyan',
  'green',
  'grey',
  'indigo',
  'light-blue',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'violet',
  'yellow',
];

// 基础10色色板 (N ≤ 10)
const baseColors = [
  '#1664FF', // 主色
  '#1AC6FF',
  '#FF8A00',
  '#3CC780',
  '#7442D4',
  '#FFC400',
  '#304D77',
  '#B48DEB',
  '#009488',
  '#FF7DDA',
];

// 扩展20色色板 (10 < N ≤ 20)
const extendedColors = [
  '#1664FF',
  '#B2CFFF',
  '#1AC6FF',
  '#94EFFF',
  '#FF8A00',
  '#FFCE7A',
  '#3CC780',
  '#B9EDCD',
  '#7442D4',
  '#DDC5FA',
  '#FFC400',
  '#FAE878',
  '#304D77',
  '#8B959E',
  '#B48DEB',
  '#EFE3FF',
  '#009488',
  '#59BAA8',
  '#FF7DDA',
  '#FFCFEE',
];

// 模型颜色映射
export const modelColorMap = {
  'dall-e': 'rgb(147,112,219)', // 深紫色
  // 'dall-e-2': 'rgb(147,112,219)', // 介于紫色和蓝色之间的色调
  'dall-e-3': 'rgb(153,50,204)', // 介于紫罗兰和洋红之间的色调
  'gpt-3.5-turbo': 'rgb(184,227,167)', // 浅绿色
  // 'gpt-3.5-turbo-0301': 'rgb(131,220,131)', // 亮绿色
  'gpt-3.5-turbo-0613': 'rgb(60,179,113)', // 海洋绿
  'gpt-3.5-turbo-1106': 'rgb(32,178,170)', // 浅海洋绿
  'gpt-3.5-turbo-16k': 'rgb(149,252,206)', // 淡橙色
  'gpt-3.5-turbo-16k-0613': 'rgb(119,255,214)', // 淡桃
  'gpt-3.5-turbo-instruct': 'rgb(175,238,238)', // 粉蓝色
  'gpt-4': 'rgb(135,206,235)', // 天蓝色
  // 'gpt-4-0314': 'rgb(70,130,180)', // 钢蓝色
  'gpt-4-0613': 'rgb(100,149,237)', // 矢车菊蓝
  'gpt-4-1106-preview': 'rgb(30,144,255)', // 道奇蓝
  'gpt-4-0125-preview': 'rgb(2,177,236)', // 深天蓝
  'gpt-4-turbo-preview': 'rgb(2,177,255)', // 深天蓝
  'gpt-4-32k': 'rgb(104,111,238)', // 中紫色
  // 'gpt-4-32k-0314': 'rgb(90,105,205)', // 暗灰蓝色
  'gpt-4-32k-0613': 'rgb(61,71,139)', // 暗蓝灰色
  'gpt-4-all': 'rgb(65,105,225)', // 皇家蓝
  'gpt-4-gizmo-*': 'rgb(0,0,255)', // 纯蓝色
  'gpt-4-vision-preview': 'rgb(25,25,112)', // 午夜蓝
  'text-ada-001': 'rgb(255,192,203)', // 粉红色
  'text-babbage-001': 'rgb(255,160,122)', // 浅珊瑚色
  'text-curie-001': 'rgb(219,112,147)', // 苍紫罗兰色
  // 'text-davinci-002': 'rgb(199,21,133)', // 中紫罗兰红色
  'text-davinci-003': 'rgb(219,112,147)', // 苍紫罗兰色（与Curie相同，表示同一个系列）
  'text-davinci-edit-001': 'rgb(255,105,180)', // 热粉色
  'text-embedding-ada-002': 'rgb(255,182,193)', // 浅粉红
  'text-embedding-v1': 'rgb(255,174,185)', // 浅粉红色（略有区别）
  'text-moderation-latest': 'rgb(255,130,171)', // 强粉色
  'text-moderation-stable': 'rgb(255,160,122)', // 浅珊瑚色（与Babbage相同，表示同一类功能）
  'tts-1': 'rgb(255,140,0)', // 深橙色
  'tts-1-1106': 'rgb(255,165,0)', // 橙色
  'tts-1-hd': 'rgb(255,215,0)', // 金色
  'tts-1-hd-1106': 'rgb(255,223,0)', // 金黄色（略有区别）
  'whisper-1': 'rgb(245,245,220)', // 米色
  'claude-3-opus-20240229': 'rgb(255,132,31)', // 橙红色
  'claude-3-sonnet-20240229': 'rgb(253,135,93)', // 橙色
  'claude-3-haiku-20240307': 'rgb(255,175,146)', // 浅橙色
};

export function modelToColor(modelName) {
  // 1. 如果模型在预定义的 modelColorMap 中，使用预定义颜色
  if (modelColorMap[modelName]) {
    return modelColorMap[modelName];
  }

  // 2. 生成一个稳定的数字作为索引
  let hash = 0;
  for (let i = 0; i < modelName.length; i++) {
    hash = (hash << 5) - hash + modelName.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  hash = Math.abs(hash);

  // 3. 根据模型名称长度选择不同的色板
  const colorPalette = modelName.length > 10 ? extendedColors : baseColors;

  // 4. 使用hash值选择颜色
  const index = hash % colorPalette.length;
  return colorPalette[index];
}

export function stringToColor(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  let i = sum % colors.length;
  return colors[i];
}

// 渲染带有模型图标的标签
export function renderModelTag(modelName, options = {}) {
  const {
    color,
    size = 'default',
    shape = 'circle',
    onClick,
    suffixIcon,
  } = options;

  const categories = getModelCategories(i18next.t);
  let icon = null;

  for (const [key, category] of Object.entries(categories)) {
    if (key !== 'all' && category.filter({ model_name: modelName })) {
      icon = category.icon;
      break;
    }
  }

  return (
    <Tag
      color={color || stringToColor(modelName)}
      prefixIcon={icon}
      suffixIcon={suffixIcon}
      size={size}
      shape={shape}
      onClick={onClick}
    >
      {modelName}
    </Tag>
  );
}

export function renderText(text, limit) {
  if (text.length > limit) {
    return text.slice(0, limit - 3) + '...';
  }
  return text;
}

/**
 * Render group tags based on the input group string
 * @param {string} group - The input group string
 * @returns {JSX.Element} - The rendered group tags
 */
export function renderGroup(group) {
  if (group === '') {
    return (
      <Tag key='default' color='white' shape='circle'>
        {i18next.t('用户分组')}
      </Tag>
    );
  }

  const tagColors = {
    vip: 'yellow',
    pro: 'yellow',
    svip: 'red',
    premium: 'red',
  };

  const groups = group.split(',').sort();

  return (
    <span key={group}>
      {groups.map((group) => (
        <Tag
          color={tagColors[group] || stringToColor(group)}
          key={group}
          shape='circle'
          onClick={async (event) => {
            event.stopPropagation();
            if (await copy(group)) {
              showSuccess(i18next.t('已复制：') + group);
            } else {
              Modal.error({
                title: i18next.t('无法复制到剪贴板，请手动复制'),
                content: group,
              });
            }
          }}
        >
          {group}
        </Tag>
      ))}
    </span>
  );
}

export function renderRatio(ratio) {
  let color = 'green';
  if (ratio > 5) {
    color = 'red';
  } else if (ratio > 3) {
    color = 'orange';
  } else if (ratio > 1) {
    color = 'blue';
  }
  return (
    <Tag color={color}>
      {ratio}x {i18next.t('倍率')}
    </Tag>
  );
}

const measureTextWidth = (
  text,
  style = {
    fontSize: '14px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  containerWidth,
) => {
  const span = document.createElement('span');

  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'nowrap';
  span.style.fontSize = style.fontSize;
  span.style.fontFamily = style.fontFamily;

  span.textContent = text;

  document.body.appendChild(span);
  const width = span.offsetWidth;

  document.body.removeChild(span);

  return width;
};

export function truncateText(text, maxWidth = 200) {
  const isMobileScreen = window.matchMedia(
    `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
  ).matches;
  if (!isMobileScreen) {
    return text;
  }
  if (!text) return text;

  try {
    // Handle percentage-based maxWidth
    let actualMaxWidth = maxWidth;
    if (typeof maxWidth === 'string' && maxWidth.endsWith('%')) {
      const percentage = parseFloat(maxWidth) / 100;
      // Use window width as fallback container width
      actualMaxWidth = window.innerWidth * percentage;
    }

    const width = measureTextWidth(text);
    if (width <= actualMaxWidth) return text;

    let left = 0;
    let right = text.length;
    let result = text;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const truncated = text.slice(0, mid) + '...';
      const currentWidth = measureTextWidth(truncated);

      if (currentWidth <= actualMaxWidth) {
        result = truncated;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  } catch (error) {
    console.warn(
      'Text measurement failed, falling back to character count',
      error,
    );
    if (text.length > 20) {
      return text.slice(0, 17) + '...';
    }
    return text;
  }
}

export const renderGroupOption = (item) => {
  const {
    disabled,
    selected,
    label,
    value,
    focused,
    className,
    style,
    onMouseEnter,
    onClick,
    empty,
    emptyContent,
    ...rest
  } = item;

  const baseStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: focused ? 'var(--semi-color-fill-0)' : 'transparent',
    opacity: disabled ? 0.5 : 1,
    ...(selected && {
      backgroundColor: 'var(--semi-color-primary-light-default)',
    }),
    '&:hover': {
      backgroundColor: !disabled && 'var(--semi-color-fill-1)',
    },
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleMouseEnter = (e) => {
    if (!disabled && onMouseEnter) {
      onMouseEnter(e);
    }
  };

  return (
    <div
      style={baseStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography.Text strong type={disabled ? 'tertiary' : undefined}>
          {value}
        </Typography.Text>
        <Typography.Text type='secondary' size='small'>
          {label}
        </Typography.Text>
      </div>
      {item.ratio && renderRatio(item.ratio)}
    </div>
  );
};

export function renderNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 10000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num;
  }
}

export function renderQuotaNumberWithDigit(num, digits = 2) {
  if (typeof num !== 'number' || isNaN(num)) {
    return 0;
  }
  const { symbol } = getCurrencyConfig();
  return symbol + num.toFixed(digits);
}

export function renderNumberWithPoint(num) {
  if (num === undefined) return '';
  num = num.toFixed(2);
  if (num >= 100000) {
    // Convert number to string to manipulate it
    let numStr = num.toString();
    // Find the position of the decimal point
    let decimalPointIndex = numStr.indexOf('.');

    let wholePart = numStr;
    let decimalPart = '';

    // If there is a decimal point, split the number into whole and decimal parts
    if (decimalPointIndex !== -1) {
      wholePart = numStr.slice(0, decimalPointIndex);
      decimalPart = numStr.slice(decimalPointIndex);
    }

    // Take the first two and last two digits of the whole number part
    let shortenedWholePart = wholePart.slice(0, 2) + '..' + wholePart.slice(-2);

    // Return the formatted number
    return shortenedWholePart + decimalPart;
  }

  // If the number is less than 100,000, return it unmodified
  return num;
}

export function getSiteCreditsPerPriceUnit() {
  const raw = parseFloat(
    localStorage.getItem('site_credits_per_price_unit') || '',
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 1000000;
}

export function quotaToCurrencyAmount(quota) {
  const q = Number(quota || 0);
  if (!Number.isFinite(q) || q === 0) return 0;
  return q / getSiteCreditsPerPriceUnit();
}

export function getQuotaWithUnit(quota, digits = 6) {
  return quotaToCurrencyAmount(quota).toFixed(digits);
}

export function renderQuotaWithAmount(amount) {
  const numericAmount = Number(amount);
  const formattedAmount = Number.isFinite(numericAmount)
    ? numericAmount.toFixed(2)
    : amount;
  return getCurrencyConfig().symbol + formattedAmount;
}

/**
 * 获取当前货币配置信息
 * @returns {Object} - { symbol, type }
 */
export function getCurrencyConfig() {
  const quotaDisplayType =
    localStorage.getItem('quota_display_type') === 'CNY' ? 'CNY' : 'USD';
  return {
    symbol: quotaDisplayType === 'CNY' ? '¥' : '$',
    type: quotaDisplayType,
  };
}

/**
 * 将价格金额按当前站点货币格式化
 * @param {number} amount - 当前站点货币金额
 * @param {number} digits - 小数位数
 * @returns {string} - 格式化后的货币字符串
 */
export function formatSiteCurrency(amount, digits = 2) {
  const { symbol } = getCurrencyConfig();
  return symbol + Number(amount || 0).toFixed(digits);
}

export function renderQuota(quota, digits = 2) {
  const { symbol } = getCurrencyConfig();
  const value = quotaToCurrencyAmount(quota);
  const fixedResult = value.toFixed(digits);
  if (parseFloat(fixedResult) === 0 && quota > 0 && value > 0) {
    const minValue = Math.pow(10, -digits);
    return symbol + minValue.toFixed(digits);
  }
  return symbol + fixedResult;
}

function isValidGroupRatio(ratio) {
  return Number.isFinite(ratio) && ratio !== -1;
}

/**
 * Helper function to get effective ratio and label
 * @param {number} groupRatio - The default group ratio
 * @param {number} user_group_ratio - The user-specific group ratio
 * @returns {Object} - Object containing { ratio, label, useUserGroupRatio }
 */
function getEffectiveRatio(groupRatio, user_group_ratio) {
  const useUserGroupRatio = isValidGroupRatio(user_group_ratio);
  const ratioLabel = useUserGroupRatio
    ? i18next.t('专属倍率')
    : i18next.t('分组倍率');
  const effectiveRatio = useUserGroupRatio ? user_group_ratio : groupRatio;

  return {
    ratio: effectiveRatio,
    label: ratioLabel,
    useUserGroupRatio: useUserGroupRatio,
  };
}

function getQuotaDisplayType() {
  return localStorage.getItem('quota_display_type') === 'CNY' ? 'CNY' : 'USD';
}

function resolveBillingDisplayMode(displayMode, modelPrice = -1) {
  if (modelPrice !== -1) {
    return 'price';
  }
  return displayMode === 'ratio' ? 'ratio' : 'price';
}

function isPriceDisplayMode(displayMode, modelPrice = -1) {
  return resolveBillingDisplayMode(displayMode, modelPrice) === 'price';
}

function shouldUseTokenQuotaDisplay(modelPrice = -1) {
  return false;
}

function formatCompactDisplayPrice(amount, digits = 6) {
  const { symbol } = getCurrencyConfig();
  const displayAmount = Number(Number(amount || 0).toFixed(digits));
  return `${symbol}${displayAmount}`;
}

function appendPricePart(parts, condition, key, vars) {
  if (!condition) {
    return;
  }
  parts.push(i18next.t(key, vars));
}

function joinBillingSummary(parts) {
  return parts.filter(Boolean).join('，');
}

function getGroupRatioText(groupRatio, user_group_ratio) {
  const { ratio, label } = getEffectiveRatio(groupRatio, user_group_ratio);
  return i18next.t('{{ratioType}} {{ratio}}x', {
    ratioType: label,
    ratio,
  });
}

function formatRatioValue(value, digits = 6) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Number(num.toFixed(digits));
}

function renderDisplayAmount(amount, digits = 6) {
  return formatSiteCurrency(Number(amount || 0), digits);
}

function formatBillingDisplayPrice(amount, digits = 6) {
  return Number(amount || 0).toFixed(digits);
}

function buildBillingText(key, vars) {
  return i18next.t(key, vars);
}

function buildBillingPriceText(
  key,
  { symbol, amount, amountKey = 'price', digits = 6, ...vars },
) {
  return buildBillingText(key, {
    symbol,
    [amountKey]: formatBillingDisplayPrice(amount, digits),
    ...vars,
  });
}

function renderBillingArticle(lines, { showReferenceNote = true } = {}) {
  const articleLines = lines.filter(Boolean);

  if (showReferenceNote) {
    articleLines.push(buildBillingText('仅供参考，以实际扣费为准'));
  }

  return (
    <article>
      {articleLines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </article>
  );
}

// Shared core for simple price rendering (used by OpenAI-like and Claude-like variants)
function renderPriceSimpleCore({
  modelPrice = 0,
  modelFixedPrice = -1,
  groupRatio,
  user_group_ratio,
  cacheTokens = 0,
  cacheRatio = 1.0,
  cacheCreationTokens = 0,
  cacheCreationRatio = 1.0,
  cacheCreationTokens5m = 0,
  cacheCreationRatio5m = 1.0,
  cacheCreationTokens1h = 0,
  cacheCreationRatio1h = 1.0,
  image = false,
  imageRatio = 1.0,
  isSystemPromptOverride = false,
  displayMode = 'price',
  outputMode = 'text',
}) {
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    groupRatio,
    user_group_ratio,
  );
  const finalGroupRatio = effectiveGroupRatio;

  const { symbol } = getCurrencyConfig();
  const hasSplitCacheCreation =
    cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;

  const shouldShowAggregateCacheCreation =
    !hasSplitCacheCreation && cacheCreationTokens !== 0;

  const shouldShowCache = cacheTokens !== 0;
  const shouldShowCacheCreation5m =
    hasSplitCacheCreation && cacheCreationTokens5m > 0;
  const shouldShowCacheCreation1h =
    hasSplitCacheCreation && cacheCreationTokens1h > 0;

  if (outputMode === 'segments') {
    const segments = [
      {
        tone: 'primary',
        text: getGroupRatioText(groupRatio, user_group_ratio),
      },
    ];

    if (modelFixedPrice !== -1) {
      segments.push({
        tone: 'secondary',
        text: isPriceDisplayMode(displayMode, modelFixedPrice)
          ? i18next.t('模型价格 {{price}}', {
              price: formatCompactDisplayPrice(modelFixedPrice),
            })
          : i18next.t('按次'),
      });
    } else if (isPriceDisplayMode(displayMode, modelFixedPrice)) {
      segments.push({
        tone: 'secondary',
        text: i18next.t('输入 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelPrice),
        }),
      });

      if (shouldShowCache) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('缓存读 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(modelPrice * cacheRatio),
          }),
        });
      }

      if (hasSplitCacheCreation && shouldShowCacheCreation5m) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('5m缓存创建 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(modelPrice * cacheCreationRatio5m),
          }),
        });
      }
      if (hasSplitCacheCreation && shouldShowCacheCreation1h) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('1h缓存创建 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(modelPrice * cacheCreationRatio1h),
          }),
        });
      }
      if (!hasSplitCacheCreation && shouldShowAggregateCacheCreation) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('缓存创建 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(modelPrice * cacheCreationRatio),
          }),
        });
      }

      if (image) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('图片输入 {{price}} / 1M tokens', {
            price: formatCompactDisplayPrice(modelPrice * imageRatio),
          }),
        });
      }
    } else {
      segments.push({
        tone: 'secondary',
        text: i18next.t('模型价格: {{price}}', {
          price: renderDisplayAmount(modelPrice),
        }),
      });

      if (shouldShowCache) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('缓存: {{cacheRatio}}', {
            cacheRatio: cacheRatio,
          }),
        });
      }

      if (hasSplitCacheCreation) {
        if (shouldShowCacheCreation5m && shouldShowCacheCreation1h) {
          segments.push({
            tone: 'secondary',
            text: i18next.t(
              '缓存创建: 5m {{cacheCreationRatio5m}} / 1h {{cacheCreationRatio1h}}',
              {
                cacheCreationRatio5m: cacheCreationRatio5m,
                cacheCreationRatio1h: cacheCreationRatio1h,
              },
            ),
          });
        } else if (shouldShowCacheCreation5m) {
          segments.push({
            tone: 'secondary',
            text: i18next.t('缓存创建: 5m {{cacheCreationRatio5m}}', {
              cacheCreationRatio5m: cacheCreationRatio5m,
            }),
          });
        } else if (shouldShowCacheCreation1h) {
          segments.push({
            tone: 'secondary',
            text: i18next.t('缓存创建: 1h {{cacheCreationRatio1h}}', {
              cacheCreationRatio1h: cacheCreationRatio1h,
            }),
          });
        }
      } else if (shouldShowAggregateCacheCreation) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('缓存创建: {{cacheCreationRatio}}', {
            cacheCreationRatio: cacheCreationRatio,
          }),
        });
      }

      if (image) {
        segments.push({
          tone: 'secondary',
          text: i18next.t('图片输入: {{imageRatio}}', {
            imageRatio: imageRatio,
          }),
        });
      }
    }

    if (isSystemPromptOverride) {
      segments.push({
        tone: 'primary',
        text: i18next.t('系统提示覆盖'),
      });
    }

    return segments;
  }

  if (modelFixedPrice !== -1) {
    if (isPriceDisplayMode(displayMode, modelFixedPrice)) {
      return joinBillingSummary([
        i18next.t('模型价格：{{symbol}}{{price}}', {
          symbol: symbol,
          price: modelFixedPrice.toFixed(6),
        }),
        getGroupRatioText(groupRatio, user_group_ratio),
      ]);
    }
    const displayPrice = modelFixedPrice.toFixed(6);
    return i18next.t('价格：{{symbol}}{{price}} * {{ratioType}}：{{ratio}}', {
      symbol: symbol,
      price: displayPrice,
      ratioType: ratioLabel,
      ratio: finalGroupRatio,
    });
  }

  if (isPriceDisplayMode(displayMode, modelFixedPrice)) {
    const parts = [];
    if (modelFixedPrice !== -1) {
      parts.push(
        i18next.t('模型价格 {{price}}', {
          price: formatCompactDisplayPrice(modelFixedPrice),
        }),
      );
      parts.push(getGroupRatioText(groupRatio, user_group_ratio));
      return joinBillingSummary(parts);
    }

    parts.push(
      i18next.t('输入 {{price}} / 1M tokens', {
        price: formatCompactDisplayPrice(modelPrice),
      }),
    );

    if (shouldShowCache) {
      parts.push(
        i18next.t('缓存读 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelPrice * cacheRatio),
        }),
      );
    }

    if (hasSplitCacheCreation && shouldShowCacheCreation5m) {
      parts.push(
        i18next.t('5m缓存创建 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelPrice * cacheCreationRatio5m),
        }),
      );
    }
    if (hasSplitCacheCreation && shouldShowCacheCreation1h) {
      parts.push(
        i18next.t('1h缓存创建 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelPrice * cacheCreationRatio1h),
        }),
      );
    }
    if (!hasSplitCacheCreation && shouldShowAggregateCacheCreation) {
      parts.push(
        i18next.t('缓存创建 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelPrice * cacheCreationRatio),
        }),
      );
    }

    if (image) {
      parts.push(
        i18next.t('图片输入 {{price}} / 1M tokens', {
          price: formatCompactDisplayPrice(modelPrice * imageRatio),
        }),
      );
    }

    parts.push(getGroupRatioText(groupRatio, user_group_ratio));

    let result = joinBillingSummary(parts);
    if (isSystemPromptOverride) {
      result += '\n\r' + i18next.t('系统提示覆盖');
    }
    return result;
  }

  const parts = [];
  parts.push(i18next.t('模型价格: {{price}}'));

  // cache part (label differs when with image)
  if (shouldShowCache) {
    parts.push(i18next.t('缓存: {{cacheRatio}}'));
  }

  if (hasSplitCacheCreation) {
    if (shouldShowCacheCreation5m && shouldShowCacheCreation1h) {
      parts.push(
        i18next.t(
          '缓存创建: 5m {{cacheCreationRatio5m}} / 1h {{cacheCreationRatio1h}}',
        ),
      );
    } else if (shouldShowCacheCreation5m) {
      parts.push(i18next.t('缓存创建: 5m {{cacheCreationRatio5m}}'));
    } else if (shouldShowCacheCreation1h) {
      parts.push(i18next.t('缓存创建: 1h {{cacheCreationRatio1h}}'));
    }
  } else if (shouldShowAggregateCacheCreation) {
    parts.push(i18next.t('缓存创建: {{cacheCreationRatio}}'));
  }

  // image part
  if (image) {
    parts.push(i18next.t('图片输入: {{imageRatio}}'));
  }

  parts.push(`{{ratioType}}: {{groupRatio}}`);

  let result = i18next.t(parts.join(' * '), {
    price: renderDisplayAmount(modelPrice),
    ratioType: ratioLabel,
    groupRatio: finalGroupRatio,
    cacheRatio: cacheRatio,
    cacheCreationRatio: cacheCreationRatio,
    cacheCreationRatio5m: cacheCreationRatio5m,
    cacheCreationRatio1h: cacheCreationRatio1h,
    imageRatio: imageRatio,
  });

  if (isSystemPromptOverride) {
    result += '\n\r' + i18next.t('系统提示覆盖');
  }

  return result;
}

export function renderModelPrice(opts) {
  const {
    prompt_tokens: inputTokens = 0,
    completion_tokens: completionTokens = 0,
    model_price: modelPrice = 0,
    model_fixed_price: modelFixedPrice = -1,
    completion_price: _completionPrice,
    group_ratio: _groupRatio,
    user_group_ratio,
    cache_tokens: cacheTokens = 0,
    cache_ratio: cacheRatio = 1.0,
    image = false,
    image_ratio: imageRatio = 1.0,
    image_output: imageOutputTokens = 0,
    web_search: webSearch = false,
    web_search_call_count: webSearchCallCount = 0,
    web_search_price: webSearchPrice = 0,
    file_search: fileSearch = false,
    file_search_call_count: fileSearchCallCount = 0,
    file_search_price: fileSearchPrice = 0,
    audio_input_seperate_price: audioInputSeperatePrice = false,
    audio_input_token_count: audioInputTokens = 0,
    audio_input_price: audioInputPrice = 0,
    image_generation_call: imageGenerationCall = false,
    image_generation_call_price: imageGenerationCallPrice = 0,
    displayMode = 'price',
  } = opts;
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    _groupRatio,
    user_group_ratio,
  );
  let groupRatio = effectiveGroupRatio;
  const completionPrice = _completionPrice ?? modelPrice;

  const { symbol } = getCurrencyConfig();

  if (!shouldUseTokenQuotaDisplay(modelFixedPrice)) {
    if (modelFixedPrice !== -1) {
      return renderBillingArticle([
        buildBillingPriceText('按次：{{symbol}}{{price}}', {
          symbol,
          amount: modelFixedPrice,
        }),
        buildBillingPriceText(
          '按次 {{symbol}}{{price}} * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
          {
            symbol,
            amount: modelFixedPrice,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amountKey: 'price',
            total: formatBillingDisplayPrice(modelFixedPrice * groupRatio),
          },
        ),
      ]);
    }

    const inputTokenPrice = modelPrice;
    const completionTokenPrice = completionPrice;
    const cacheRatioPrice = modelPrice * cacheRatio;
    const imageRatioPrice = modelPrice * imageRatio;
    let effectiveInputTokens =
      inputTokens - cacheTokens + cacheTokens * cacheRatio;
    if (image && imageOutputTokens > 0) {
      effectiveInputTokens =
        inputTokens - imageOutputTokens + imageOutputTokens * imageRatio;
    }
    if (audioInputTokens > 0) {
      effectiveInputTokens -= audioInputTokens;
    }
    const price =
      (effectiveInputTokens / 1000000) * inputTokenPrice * groupRatio +
      (audioInputTokens / 1000000) * audioInputPrice * groupRatio +
      (completionTokens / 1000000) * completionTokenPrice * groupRatio +
      (webSearchCallCount / 1000) * webSearchPrice * groupRatio +
      (fileSearchCallCount / 1000) * fileSearchPrice * groupRatio +
      imageGenerationCallPrice * groupRatio;

    let inputDesc = '';
    if (image && imageOutputTokens > 0) {
      inputDesc = buildBillingPriceText(
        '(输入 {{nonImageInput}} tokens + 图片输入 {{imageInput}} tokens / 1M tokens * {{symbol}}{{price}}',
        {
          nonImageInput: inputTokens - imageOutputTokens,
          imageInput: imageOutputTokens,
          symbol,
          amount: inputTokenPrice,
        },
      );
    } else if (cacheTokens > 0) {
      inputDesc = buildBillingText(
        '(输入 {{nonCacheInput}} tokens / 1M tokens * {{symbol}}{{price}} + 缓存 {{cacheInput}} tokens / 1M tokens * {{symbol}}{{cachePrice}}',
        {
          nonCacheInput: inputTokens - cacheTokens,
          cacheInput: cacheTokens,
          symbol,
          price: formatBillingDisplayPrice(inputTokenPrice),
          cachePrice: formatBillingDisplayPrice(cacheRatioPrice),
        },
      );
    } else if (audioInputSeperatePrice && audioInputTokens > 0) {
      inputDesc = buildBillingText(
        '(输入 {{nonAudioInput}} tokens / 1M tokens * {{symbol}}{{price}} + 音频输入 {{audioInput}} tokens / 1M tokens * {{symbol}}{{audioPrice}}',
        {
          nonAudioInput: inputTokens - audioInputTokens,
          audioInput: audioInputTokens,
          symbol,
          price: formatBillingDisplayPrice(inputTokenPrice),
          audioPrice: formatBillingDisplayPrice(audioInputPrice),
        },
      );
    } else {
      inputDesc = buildBillingPriceText(
        '(输入 {{input}} tokens / 1M tokens * {{symbol}}{{price}}',
        {
          input: inputTokens,
          symbol,
          amount: inputTokenPrice,
        },
      );
    }

    const outputDesc = buildBillingText(
      '输出 {{completion}} tokens / 1M tokens * {{symbol}}{{compPrice}}) * {{ratioType}} {{ratio}}',
      {
        completion: completionTokens,
        symbol,
        compPrice: formatBillingDisplayPrice(completionTokenPrice),
        ratio: groupRatio,
        ratioType: ratioLabel,
      },
    );

    const extraServices = [
      webSearch && webSearchCallCount > 0
        ? buildBillingPriceText(
            ' + Web搜索 {{count}}次 / 1K 次 * {{symbol}}{{price}} * {{ratioType}} {{ratio}}',
            {
              count: webSearchCallCount,
              symbol,
              amount: webSearchPrice,
              ratio: groupRatio,
              ratioType: ratioLabel,
            },
          )
        : '',
      fileSearch && fileSearchCallCount > 0
        ? buildBillingPriceText(
            ' + 文件搜索 {{count}}次 / 1K 次 * {{symbol}}{{price}} * {{ratioType}} {{ratio}}',
            {
              count: fileSearchCallCount,
              symbol,
              amount: fileSearchPrice,
              ratio: groupRatio,
              ratioType: ratioLabel,
            },
          )
        : '',
      imageGenerationCall && imageGenerationCallPrice > 0
        ? buildBillingPriceText(
            ' + 图片生成调用 {{symbol}}{{price}} / 1次 * {{ratioType}} {{ratio}}',
            {
              symbol,
              amount: imageGenerationCallPrice,
              ratio: groupRatio,
              ratioType: ratioLabel,
            },
          )
        : '',
    ].join('');

    const billingLines = [
      buildBillingPriceText(
        '输入价格：{{symbol}}{{price}} / 1M tokens{{audioPrice}}',
        {
          symbol,
          amount: inputTokenPrice,
          audioPrice: audioInputSeperatePrice
            ? `，${i18next.t('音频输入价格')} ${symbol}${formatBillingDisplayPrice(audioInputPrice)} / 1M tokens`
            : '',
        },
      ),
      buildBillingPriceText('输出价格：{{symbol}}{{total}} / 1M tokens', {
        symbol,
        amount: completionTokenPrice,
        amountKey: 'total',
      }),
      cacheTokens > 0
        ? buildBillingPriceText(
            '缓存读取价格：{{symbol}}{{total}} / 1M tokens',
            {
              symbol,
              amount: inputTokenPrice * cacheRatio,
              amountKey: 'total',
            },
          )
        : null,
      image && imageOutputTokens > 0
        ? buildBillingPriceText(
            '图片输入价格：{{symbol}}{{total}} / 1M tokens',
            {
              symbol,
              amount: imageRatioPrice,
              amountKey: 'total',
            },
          )
        : null,
      webSearch && webSearchCallCount > 0
        ? buildBillingPriceText('Web搜索价格：{{symbol}}{{price}} / 1K 次', {
            symbol,
            amount: webSearchPrice,
          })
        : null,
      fileSearch && fileSearchCallCount > 0
        ? buildBillingPriceText('文件搜索价格：{{symbol}}{{price}} / 1K 次', {
            symbol,
            amount: fileSearchPrice,
          })
        : null,
      imageGenerationCall && imageGenerationCallPrice > 0
        ? buildBillingPriceText('图片生成调用：{{symbol}}{{price}} / 1次', {
            symbol,
            amount: imageGenerationCallPrice,
          })
        : null,
      buildBillingText(
        '{{inputDesc}} + {{outputDesc}}{{extraServices}} = {{symbol}}{{total}}',
        {
          inputDesc,
          outputDesc,
          extraServices,
          symbol,
          total: formatBillingDisplayPrice(price),
        },
      ),
    ];

    return renderBillingArticle(billingLines);
  }

  if (modelFixedPrice !== -1) {
    const displayPrice = modelFixedPrice.toFixed(6);
    const displayTotal = (modelFixedPrice * groupRatio).toFixed(6);
    return i18next.t(
      '按次：{{symbol}}{{price}} * {{ratioType}}：{{ratio}} = {{symbol}}{{total}}',
      {
        symbol: symbol,
        price: displayPrice,
        ratio: groupRatio,
        total: displayTotal,
        ratioType: ratioLabel,
      },
    );
  }

  const modelPriceValue = formatRatioValue(modelPrice);
  const cacheRatioValue = formatRatioValue(cacheRatio);
  const imageRatioValue = formatRatioValue(imageRatio);
  const inputTokenPrice = modelPrice;
  const completionTokenPrice = completionPrice;
  const audioRatioValue =
    audioInputSeperatePrice && audioInputPrice > 0
      ? formatRatioValue(audioInputPrice / inputTokenPrice)
      : null;

  const textInputTokens = Math.max(
    inputTokens - cacheTokens - audioInputTokens,
    0,
  );
  const imageInputTokens =
    image && imageOutputTokens > 0 ? imageOutputTokens : 0;
  const cacheInputTokens = cacheTokens;

  const textInputAmount =
    (textInputTokens / 1000000) * inputTokenPrice * groupRatio;
  const cacheInputAmount =
    (cacheInputTokens / 1000000) *
    inputTokenPrice *
    cacheRatioValue *
    groupRatio;
  const imageInputAmount =
    (imageInputTokens / 1000000) *
    inputTokenPrice *
    imageRatioValue *
    groupRatio;
  const audioInputAmount =
    (audioInputTokens / 1000000) * audioInputPrice * groupRatio;
  const completionAmount =
    (completionTokens / 1000000) * completionTokenPrice * groupRatio;
  const webSearchAmount =
    (webSearchCallCount / 1000) * webSearchPrice * groupRatio;
  const fileSearchAmount =
    (fileSearchCallCount / 1000) * fileSearchPrice * groupRatio;
  const imageGenerationAmount = imageGenerationCallPrice * groupRatio;

  const totalAmount =
    textInputAmount +
    cacheInputAmount +
    imageInputAmount +
    audioInputAmount +
    completionAmount +
    webSearchAmount +
    fileSearchAmount +
    imageGenerationAmount;

  return renderBillingArticle([
    [
      buildBillingText('模型价格 {{modelPrice}} / 1M tokens', {
        modelPrice: renderDisplayAmount(modelPrice),
      }),
      buildBillingText('模型补全价格 {{completionPrice}} / 1M tokens', {
        completionPrice: renderDisplayAmount(completionPrice),
      }),
      cacheInputTokens > 0
        ? buildBillingText('缓存倍率 {{cacheRatio}}', {
            cacheRatio: cacheRatioValue,
          })
        : null,
      imageInputTokens > 0
        ? buildBillingText('图片倍率 {{imageRatio}}', {
            imageRatio: imageRatioValue,
          })
        : null,
      audioRatioValue !== null
        ? buildBillingText('音频倍率 {{audioRatio}}', {
            audioRatio: audioRatioValue,
          })
        : null,
      buildBillingText('{{ratioType}} {{ratio}}', {
        ratioType: ratioLabel,
        ratio: groupRatio,
      }),
    ]
      .filter(Boolean)
      .join('，'),
    textInputTokens > 0
      ? buildBillingText(
          '普通输入：{{tokens}} / 1M * 模型价格 {{modelPrice}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: textInputTokens,
            modelPrice: renderDisplayAmount(modelPrice),
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(textInputAmount),
          },
        )
      : null,
    cacheInputTokens > 0
      ? buildBillingText(
          '缓存输入：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 缓存倍率 {{cacheRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheInputTokens,
            modelPrice: renderDisplayAmount(modelPrice),
            cacheRatio: cacheRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(cacheInputAmount),
          },
        )
      : null,
    imageInputTokens > 0
      ? buildBillingText(
          '图片输入：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 图片倍率 {{imageRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: imageInputTokens,
            modelPrice: renderDisplayAmount(modelPrice),
            imageRatio: imageRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(imageInputAmount),
          },
        )
      : null,
    audioInputTokens > 0 && audioRatioValue !== null
      ? buildBillingText(
          '音频输入：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 音频倍率 {{audioRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: audioInputTokens,
            modelPrice: renderDisplayAmount(modelPrice),
            audioRatio: audioRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(audioInputAmount),
          },
        )
      : null,
    buildBillingText(
      '输出：{{tokens}} / 1M * 模型补全价格 {{completionPrice}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: completionTokens,
        completionPrice: renderDisplayAmount(completionPrice),
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmount(completionAmount),
      },
    ),
    webSearch && webSearchCallCount > 0
      ? buildBillingText(
          'Web 搜索：{{count}} / 1K * 单价 {{price}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            count: webSearchCallCount,
            price: renderDisplayAmount(webSearchPrice),
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(webSearchAmount),
          },
        )
      : null,
    fileSearch && fileSearchCallCount > 0
      ? buildBillingText(
          '文件搜索：{{count}} / 1K * 单价 {{price}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            count: fileSearchCallCount,
            price: renderDisplayAmount(fileSearchPrice),
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(fileSearchAmount),
          },
        )
      : null,
    imageGenerationCall && imageGenerationCallPrice > 0
      ? buildBillingText(
          '图片生成：1 次 * 单价 {{price}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            price: renderDisplayAmount(imageGenerationCallPrice),
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(imageGenerationAmount),
          },
        )
      : null,
    buildBillingText('合计：{{total}}', {
      total: renderDisplayAmount(totalAmount),
    }),
  ]);
}

export function renderLogContent(opts) {
  const {
    model_price: modelPrice = 0,
    completion_price: completionPrice = modelPrice,
    model_fixed_price: modelFixedPrice = -1,
    group_ratio: groupRatio,
    user_group_ratio,
    cache_ratio: cacheRatio = 1.0,
    image = false,
    image_ratio: imageRatio = 1.0,
    web_search: webSearch = false,
    web_search_call_count: webSearchCallCount = 0,
    file_search: fileSearch = false,
    file_search_call_count: fileSearchCallCount = 0,
    displayMode = 'price',
  } = opts;
  const {
    ratio,
    label: ratioLabel,
    useUserGroupRatio: useUserGroupRatio,
  } = getEffectiveRatio(groupRatio, user_group_ratio);

  // 获取货币配置
  const { symbol } = getCurrencyConfig();

  if (isPriceDisplayMode(displayMode, modelFixedPrice)) {
    if (modelFixedPrice !== -1) {
      return joinBillingSummary([
        i18next.t('模型价格 {{symbol}}{{price}} / 次', {
          symbol,
          price: modelFixedPrice.toFixed(6),
        }),
        getGroupRatioText(groupRatio, user_group_ratio),
      ]);
    }

    const parts = [
      i18next.t('输入价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: modelPrice.toFixed(6),
      }),
      i18next.t('输出价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: completionPrice.toFixed(6),
      }),
    ];
    appendPricePart(
      parts,
      cacheRatio !== 1.0,
      '缓存读取价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelPrice * cacheRatio).toFixed(6),
      },
    );
    appendPricePart(
      parts,
      image,
      '图片输入价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelPrice * imageRatio).toFixed(6),
      },
    );
    appendPricePart(
      parts,
      webSearch,
      'Web 搜索调用 {{webSearchCallCount}} 次',
      {
        webSearchCallCount,
      },
    );
    appendPricePart(
      parts,
      fileSearch,
      '文件搜索调用 {{fileSearchCallCount}} 次',
      {
        fileSearchCallCount,
      },
    );
    parts.push(getGroupRatioText(groupRatio, user_group_ratio));
    return joinBillingSummary(parts);
  }

  if (modelFixedPrice !== -1) {
    return i18next.t('模型价格 {{symbol}}{{price}}，{{ratioType}} {{ratio}}', {
      symbol: symbol,
      price: modelFixedPrice.toFixed(6),
      ratioType: ratioLabel,
      ratio,
    });
  } else {
    if (image) {
      return i18next.t(
        '模型价格 {{modelPrice}}，缓存倍率 {{cacheRatio}}，模型补全价格 {{completionPrice}}，图片输入倍率 {{imageRatio}}，{{ratioType}} {{ratio}}',
        {
          modelPrice: renderDisplayAmount(modelPrice),
          cacheRatio: cacheRatio,
          completionPrice: renderDisplayAmount(completionPrice),
          imageRatio: imageRatio,
          ratioType: ratioLabel,
          ratio,
        },
      );
    } else if (webSearch) {
      return i18next.t(
        '模型价格 {{modelPrice}}，缓存倍率 {{cacheRatio}}，模型补全价格 {{completionPrice}}，{{ratioType}} {{ratio}}，Web 搜索调用 {{webSearchCallCount}} 次',
        {
          modelPrice: renderDisplayAmount(modelPrice),
          cacheRatio: cacheRatio,
          completionPrice: renderDisplayAmount(completionPrice),
          ratioType: ratioLabel,
          ratio,
          webSearchCallCount,
        },
      );
    } else {
      return i18next.t(
        '模型价格 {{modelPrice}}，缓存倍率 {{cacheRatio}}，模型补全价格 {{completionPrice}}，{{ratioType}} {{ratio}}',
        {
          modelPrice: renderDisplayAmount(modelPrice),
          cacheRatio: cacheRatio,
          completionPrice: renderDisplayAmount(completionPrice),
          ratioType: ratioLabel,
          ratio,
        },
      );
    }
  }
}

export function stripExprVersion(exprStr) {
  if (!exprStr) return { version: 1, body: '' };
  const m = exprStr.match(/^v(\d+):([\s\S]*)$/);
  if (m) return { version: Number(m[1]), body: m[2] };
  return { version: 1, body: exprStr };
}

function parseTierBody(bodyStr) {
  const coeffs = {};
  const re = new RegExp(BILLING_VAR_REGEX.source, 'g');
  let m;
  while ((m = re.exec(bodyStr)) !== null) {
    if (!(m[1] in coeffs)) coeffs[m[1]] = Number(m[2]);
  }
  const tier = {};
  for (const [varName, field] of Object.entries(BILLING_VAR_KEY_TO_FIELD)) {
    tier[field] = coeffs[varName] || 0;
  }
  return tier;
}

export function parseTiersFromExpr(exprStr) {
  if (!exprStr) return [];
  try {
    const { body } = stripExprVersion(exprStr);
    const condGroup = `((?:(?:p|c|len)\\s*(?:<|<=|>|>=)\\s*[\\d.eE+]+)(?:\\s*&&\\s*(?:p|c|len)\\s*(?:<|<=|>|>=)\\s*[\\d.eE+]+)*)`;
    const tierRe = new RegExp(
      `(?:${condGroup}\\s*\\?\\s*)?tier\\("([^"]*)",\\s*([^)]+)\\)`,
      'g',
    );
    const tiers = [];
    let m;
    while ((m = tierRe.exec(body)) !== null) {
      const condStr = m[1] || '';
      const conditions = [];
      if (condStr) {
        for (const cp of condStr.split(/\s*&&\s*/)) {
          const cm = cp.trim().match(/^(p|c|len)\s*(<|<=|>|>=)\s*([\d.eE+]+)$/);
          if (cm)
            conditions.push({ var: cm[1], op: cm[2], value: Number(cm[3]) });
        }
      }
      const tier = parseTierBody(m[3]);
      tier.label = m[2];
      tier.conditions = conditions;
      tiers.push(tier);
    }
    return tiers;
  } catch {
    return [];
  }
}

export const decodeFromBase64 = (base64) => {
  if (!base64) return '';

  const binaryString =
    typeof window !== 'undefined'
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }

  return decodeURIComponent(
    Array.prototype.map
      .call(bytes, (byte) => '%' + byte.toString(16).padStart(2, '0'))
      .join(''),
  );
};

export const normalizeLabel = (label) => {
  if (!label) return '';
  return label
    .replace(/<[=＝]?|≤|＜[=＝]?/g, '<')
    .replace(/>[=＝]?|≥|＞[=＝]?/g, '>')
    .replace(/\s+/g, '')
    .toLowerCase();
};

export function renderTieredModelPrice(opts) {
  const {
    prompt_tokens: inputTokens = 0,
    completion_tokens: completionTokens = 0,
    expr_b64: exprB64,
    matched_tier: matchedTier,
    group_ratio: groupRatio,
    cache_tokens: cacheTokens = 0,
    cache_creation_tokens: cacheCreationTokens = 0,
    cache_creation_tokens_5m: cacheCreationTokens5m = 0,
    cache_creation_tokens_1h: cacheCreationTokens1h = 0,
  } = opts;
  let exprStr = '';
  try {
    exprStr = decodeFromBase64(exprB64);
  } catch {
    /* ignore */
  }
  const tiers = parseTiersFromExpr(exprStr);
  if (tiers.length === 0) {
    return i18next.t('阶梯计费（表达式解析失败）');
  }

  const tier = tiers.find((t) => {
    const l1 = normalizeLabel(t.label);
    const l2 = normalizeLabel(matchedTier);
    return l1 === l2 && l1 !== '';
  });

  if (!tier) {
    return i18next.t('阶梯计费（未匹配到对应阶梯）');
  }
  const { symbol } = getCurrencyConfig();
  const gr = groupRatio || 1;

  const hasAnyCacheTokens =
    cacheTokens > 0 ||
    cacheCreationTokens > 0 ||
    cacheCreationTokens5m > 0 ||
    cacheCreationTokens1h > 0;

  const priceLines = BILLING_PRICING_VARS.filter(
    (v) => v.group !== 'cache' || hasAnyCacheTokens,
  ).map((v) => [v.field, v.label]);

  const lines = [
    buildBillingText('命中档位：{{tier}}', { tier: matchedTier || tier.label }),
    ...priceLines
      .filter(([field]) => tier[field] > 0)
      .map(([field, label]) =>
        buildBillingPriceText(`${label}：{{symbol}}{{price}} / 1M tokens`, {
          symbol,
          amount: tier[field],
        }),
      ),
  ];

  return renderBillingArticle(lines);
}

export function renderTieredModelPriceSimple(opts) {
  const {
    expr_b64: exprB64,
    matched_tier: matchedTier,
    group_ratio: groupRatio,
    user_group_ratio,
    cache_tokens: cacheTokens = 0,
    cache_creation_tokens_5m: cacheCreationTokens5m = 0,
    cache_creation_tokens_1h: cacheCreationTokens1h = 0,
    cache_creation_tokens: cacheCreationTokens = 0,
    displayMode = 'price',
    outputMode = 'segments',
  } = opts;
  let exprStr = '';
  try {
    exprStr = decodeFromBase64(exprB64);
  } catch {
    /* ignore */
  }
  const tiers = parseTiersFromExpr(exprStr);
  const tier = tiers.find((t) => {
    const l1 = normalizeLabel(t.label);
    const l2 = normalizeLabel(matchedTier);
    return l1 === l2 && l1 !== '';
  });

  if (outputMode === 'segments') {
    const segments = [
      {
        tone: 'primary',
        text: getGroupRatioText(groupRatio, user_group_ratio),
      },
    ];

    if (!tier) {
      segments.push({
        tone: 'secondary',
        text:
          tiers.length === 0
            ? i18next.t('阶梯计费（表达式解析失败）')
            : i18next.t('阶梯计费（未匹配到对应阶梯）'),
      });
    } else if (isPriceDisplayMode(displayMode)) {
      const hasAnyCacheTokens =
        cacheTokens > 0 ||
        cacheCreationTokens > 0 ||
        cacheCreationTokens5m > 0 ||
        cacheCreationTokens1h > 0;
      const priceSegments = BILLING_PRICING_VARS.filter(
        (v) => v.group !== 'cache' || hasAnyCacheTokens,
      ).map((v) => [v.field, v.shortLabel]);
      for (const [field, label] of priceSegments) {
        if (tier[field] > 0) {
          segments.push({
            tone: 'secondary',
            text: i18next.t('{{label}} {{price}} / 1M tokens', {
              label: i18next.t(label),
              price: formatCompactDisplayPrice(tier[field]),
            }),
          });
        }
      }
    }

    return segments;
  }

  return [];
}

export function renderModelPriceSimple(opts) {
  const {
    model_price: modelPrice = 0,
    model_fixed_price: modelFixedPrice = -1,
    group_ratio: groupRatio,
    user_group_ratio,
    cache_tokens: cacheTokens = 0,
    cache_ratio: cacheRatio = 1.0,
    cache_creation_tokens: cacheCreationTokens = 0,
    cache_creation_ratio: cacheCreationRatio = 1.0,
    cache_creation_tokens_5m: cacheCreationTokens5m = 0,
    cache_creation_ratio_5m: cacheCreationRatio5m = 1.0,
    cache_creation_tokens_1h: cacheCreationTokens1h = 0,
    cache_creation_ratio_1h: cacheCreationRatio1h = 1.0,
    image = false,
    image_ratio: imageRatio = 1.0,
    is_system_prompt_overwritten: isSystemPromptOverride = false,
    provider = 'openai',
    displayMode = 'price',
    outputMode = 'text',
  } = opts;
  return renderPriceSimpleCore({
    modelPrice,
    modelFixedPrice,
    groupRatio,
    user_group_ratio,
    cacheTokens,
    cacheRatio,
    cacheCreationTokens,
    cacheCreationRatio,
    cacheCreationTokens5m,
    cacheCreationRatio5m,
    cacheCreationTokens1h,
    cacheCreationRatio1h,
    image,
    imageRatio,
    isSystemPromptOverride,
    displayMode,
    outputMode,
  });
}

export function renderAudioModelPrice(opts) {
  const {
    prompt_tokens: inputTokens = 0,
    completion_tokens: completionTokens = 0,
    model_price: modelPrice = 0,
    model_fixed_price: modelFixedPrice = -1,
    completion_price: _completionPrice,
    audio_input: audioInputTokens = 0,
    audio_output: audioCompletionTokens = 0,
    audio_ratio: _audioRatio,
    audio_completion_ratio: _audioCompletionRatio,
    group_ratio: _groupRatio,
    user_group_ratio,
    cache_tokens: cacheTokens = 0,
    cache_ratio: cacheRatio = 1.0,
    displayMode = 'price',
  } = opts;
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    _groupRatio,
    user_group_ratio,
  );
  let groupRatio = effectiveGroupRatio;
  const completionPrice = _completionPrice ?? modelPrice;
  const audioRatio = parseFloat(_audioRatio ?? 0).toFixed(6);
  const audioCompletionRatio = _audioCompletionRatio ?? 0;

  // 获取货币配置
  const { symbol } = getCurrencyConfig();

  if (!shouldUseTokenQuotaDisplay(modelFixedPrice)) {
    if (modelFixedPrice !== -1) {
      return renderBillingArticle([
        buildBillingPriceText('模型价格：{{symbol}}{{price}} / 次', {
          symbol,
          amount: modelFixedPrice,
        }),
        buildBillingPriceText(
          '模型价格 {{symbol}}{{price}} / 次 * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
          {
            symbol,
            amount: modelFixedPrice,
            ratioType: ratioLabel,
            ratio: groupRatio,
            total: formatBillingDisplayPrice(modelFixedPrice * groupRatio),
          },
        ),
      ]);
    }

    const inputTokenPrice = modelPrice;
    const completionTokenPrice = completionPrice;
    const textPrice =
      ((inputTokens - cacheTokens + cacheTokens * cacheRatio) / 1000000) *
        inputTokenPrice *
        groupRatio +
      (completionTokens / 1000000) * completionTokenPrice * groupRatio;
    const audioPrice =
      (audioInputTokens / 1000000) * inputTokenPrice * audioRatio * groupRatio +
      (audioCompletionTokens / 1000000) *
        inputTokenPrice *
        audioRatio *
        audioCompletionRatio *
        groupRatio;
    const totalPrice = textPrice + audioPrice;

    return renderBillingArticle([
      buildBillingPriceText('输入价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        amount: inputTokenPrice,
      }),
      buildBillingPriceText('输出价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        amount: completionTokenPrice,
      }),
      cacheTokens > 0
        ? buildBillingPriceText(
            '缓存读取价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              amount: inputTokenPrice * cacheRatio,
            },
          )
        : null,
      buildBillingPriceText('音频输入价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        amount: inputTokenPrice * audioRatio,
      }),
      buildBillingPriceText('音频补全价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        amount: inputTokenPrice * audioRatio * audioCompletionRatio,
      }),
      buildBillingText(
        '文字提示 {{input}} tokens / 1M tokens * {{symbol}}{{textInputPrice}} + 文字补全 {{completion}} tokens / 1M tokens * {{symbol}}{{textCompPrice}} + 音频提示 {{audioInput}} tokens / 1M tokens * {{symbol}}{{audioInputPrice}} + 音频补全 {{audioCompletion}} tokens / 1M tokens * {{symbol}}{{audioCompPrice}} * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
        {
          input: inputTokens,
          completion: completionTokens,
          audioInput: audioInputTokens,
          audioCompletion: audioCompletionTokens,
          textInputPrice: formatBillingDisplayPrice(inputTokenPrice),
          textCompPrice: formatBillingDisplayPrice(completionTokenPrice),
          audioInputPrice: formatBillingDisplayPrice(
            audioRatio * inputTokenPrice,
          ),
          audioCompPrice: formatBillingDisplayPrice(
            audioRatio * audioCompletionRatio * inputTokenPrice,
          ),
          ratioType: ratioLabel,
          ratio: groupRatio,
          symbol,
          total: formatBillingDisplayPrice(totalPrice),
        },
      ),
    ]);
  }

  // Legacy ratio display: 1 ratio maps to 0.002 current-currency units per 1K tokens.
  if (modelPrice !== -1) {
    return i18next.t(
      '模型价格：{{symbol}}{{price}} * {{ratioType}}：{{ratio}} = {{symbol}}{{total}}',
      {
        symbol: symbol,
        price: modelPrice.toFixed(6),
        ratio: groupRatio,
        total: (modelPrice * groupRatio).toFixed(6),
        ratioType: ratioLabel,
      },
    );
  }

  const modelPriceValue = renderDisplayAmount(modelPrice);
  const completionPriceValue = renderDisplayAmount(completionPrice);
  const cacheRatioValue = formatRatioValue(cacheRatio);
  const audioRatioValue = formatRatioValue(audioRatio);
  const audioCompletionRatioValue = formatRatioValue(audioCompletionRatio);

  const inputTokenPrice = modelPrice;
  const completionTokenPrice = completionPrice;

  const effectiveInputTokens =
    inputTokens - cacheTokens + cacheTokens * cacheRatioValue;

  const textPrice =
    (effectiveInputTokens / 1000000) * inputTokenPrice * groupRatio +
    (completionTokens / 1000000) * completionTokenPrice * groupRatio;
  const audioPrice =
    (audioInputTokens / 1000000) *
      inputTokenPrice *
      audioRatioValue *
      groupRatio +
    (audioCompletionTokens / 1000000) *
      inputTokenPrice *
      audioRatioValue *
      audioCompletionRatioValue *
      groupRatio;
  const totalPrice = textPrice + audioPrice;

  return renderBillingArticle([
    buildBillingText(
      '模型价格 {{modelPrice}}，模型补全价格 {{completionPrice}}，音频倍率 {{audioRatio}}，音频补全倍率 {{audioCompletionRatio}}，{{cachePart}}{{ratioType}} {{ratio}}',
      {
        modelPrice: modelPriceValue,
        completionPrice: completionPriceValue,
        audioRatio: audioRatioValue,
        audioCompletionRatio: audioCompletionRatioValue,
        cachePart:
          cacheTokens > 0
            ? `${i18next.t('缓存倍率')} ${cacheRatioValue}，`
            : '',
        ratioType: ratioLabel,
        ratio: groupRatio,
      },
    ),
    buildBillingText(
      '普通输入：{{tokens}} / 1M * 模型价格 {{modelPrice}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: Math.max(inputTokens - cacheTokens, 0),
        modelPrice: modelPriceValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmount(
          (Math.max(inputTokens - cacheTokens, 0) / 1000000) *
            inputTokenPrice *
            groupRatio,
        ),
      },
    ),
    cacheTokens > 0
      ? buildBillingText(
          '缓存输入：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 缓存倍率 {{cacheRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheTokens,
            modelPrice: modelPriceValue,
            cacheRatio: cacheRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(
              (cacheTokens / 1000000) *
                inputTokenPrice *
                cacheRatioValue *
                groupRatio,
            ),
          },
        )
      : null,
    buildBillingText(
      '文字输出：{{tokens}} / 1M * 模型补全价格 {{completionPrice}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: completionTokens,
        completionPrice: completionPriceValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmount(
          (completionTokens / 1000000) * completionTokenPrice * groupRatio,
        ),
      },
    ),
    buildBillingText(
      '音频输入：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 音频倍率 {{audioRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: audioInputTokens,
        modelPrice: modelPriceValue,
        audioRatio: audioRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmount(
          (audioInputTokens / 1000000) *
            inputTokenPrice *
            audioRatioValue *
            groupRatio,
        ),
      },
    ),
    buildBillingText(
      '音频输出：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 音频倍率 {{audioRatio}} * 音频补全倍率 {{audioCompletionRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: audioCompletionTokens,
        modelPrice: modelPriceValue,
        audioRatio: audioRatioValue,
        audioCompletionRatio: audioCompletionRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmount(
          (audioCompletionTokens / 1000000) *
            inputTokenPrice *
            audioRatioValue *
            audioCompletionRatioValue *
            groupRatio,
        ),
      },
    ),
    buildBillingText(
      '合计：文字部分 {{textTotal}} + 音频部分 {{audioTotal}} = {{total}}',
      {
        textTotal: renderDisplayAmount(textPrice),
        audioTotal: renderDisplayAmount(audioPrice),
        total: renderDisplayAmount(totalPrice),
      },
    ),
  ]);
}

export function renderQuotaWithPrompt(quota, digits) {
  return i18next.t('等价金额：') + renderQuota(quota, digits);
}

export function renderClaudeModelPrice(opts) {
  const {
    prompt_tokens: inputTokens = 0,
    completion_tokens: completionTokens = 0,
    model_price: modelPrice = 0,
    model_fixed_price: modelFixedPrice = -1,
    completion_price: _completionPrice,
    group_ratio: _groupRatio,
    user_group_ratio,
    cache_tokens: cacheTokens = 0,
    cache_ratio: cacheRatio = 1.0,
    cache_creation_tokens: cacheCreationTokens = 0,
    cache_creation_ratio: cacheCreationRatio = 1.0,
    cache_creation_tokens_5m: cacheCreationTokens5m = 0,
    cache_creation_ratio_5m: cacheCreationRatio5m = 1.0,
    cache_creation_tokens_1h: cacheCreationTokens1h = 0,
    cache_creation_ratio_1h: cacheCreationRatio1h = 1.0,
    displayMode = 'price',
  } = opts;
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    _groupRatio,
    user_group_ratio,
  );
  let groupRatio = effectiveGroupRatio;
  const completionPrice = _completionPrice ?? modelPrice;

  // 获取货币配置
  const { symbol } = getCurrencyConfig();

  if (!shouldUseTokenQuotaDisplay(modelFixedPrice)) {
    if (modelFixedPrice !== -1) {
      return renderBillingArticle([
        buildBillingPriceText('模型价格：{{symbol}}{{price}} / 次', {
          symbol,
          amount: modelFixedPrice,
        }),
        buildBillingPriceText(
          '模型价格 {{symbol}}{{price}} / 次 * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
          {
            symbol,
            amount: modelFixedPrice,
            ratioType: ratioLabel,
            ratio: groupRatio,
            total: formatBillingDisplayPrice(modelFixedPrice * groupRatio),
          },
        ),
      ]);
    }

    const inputTokenPrice = modelPrice;
    const completionTokenPrice = completionPrice;
    const cacheRatioPrice = modelPrice * cacheRatio;
    const cacheCreationRatioPrice = modelPrice * cacheCreationRatio;
    const cacheCreationRatioPrice5m = modelPrice * cacheCreationRatio5m;
    const cacheCreationRatioPrice1h = modelPrice * cacheCreationRatio1h;
    const hasSplitCacheCreation =
      cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;
    const aggregateCacheCreationTokens = hasSplitCacheCreation
      ? 0
      : cacheCreationTokens;
    const effectiveInputTokens =
      inputTokens +
      cacheTokens * cacheRatio +
      aggregateCacheCreationTokens * cacheCreationRatio +
      cacheCreationTokens5m * cacheCreationRatio5m +
      cacheCreationTokens1h * cacheCreationRatio1h;
    const price =
      (effectiveInputTokens / 1000000) * inputTokenPrice * groupRatio +
      (completionTokens / 1000000) * completionTokenPrice * groupRatio;
    const inputUnitPrice = inputTokenPrice;
    const completionUnitPrice = completionTokenPrice;
    const cacheUnitPrice = cacheRatioPrice;
    const cacheCreationUnitPrice = cacheCreationRatioPrice;
    const cacheCreationUnitPrice5m = cacheCreationRatioPrice5m;
    const cacheCreationUnitPrice1h = cacheCreationRatioPrice1h;
    const cacheCreationUnitPriceTotal =
      cacheCreationUnitPrice5m + cacheCreationUnitPrice1h;
    const shouldShowCache = cacheTokens > 0;
    const shouldShowAggregateCacheCreation =
      !hasSplitCacheCreation && cacheCreationTokens > 0;
    const shouldShowCacheCreation5m =
      hasSplitCacheCreation && cacheCreationTokens5m > 0;
    const shouldShowCacheCreation1h =
      hasSplitCacheCreation && cacheCreationTokens1h > 0;

    const breakdownSegments = [
      i18next.t('提示 {{input}} tokens / 1M tokens * {{symbol}}{{price}}', {
        input: inputTokens,
        symbol,
        price: inputUnitPrice.toFixed(6),
      }),
    ];

    if (shouldShowCache) {
      breakdownSegments.push(
        i18next.t('缓存 {{tokens}} tokens / 1M tokens * {{symbol}}{{price}}', {
          tokens: cacheTokens,
          symbol,
          price: cacheUnitPrice.toFixed(6),
        }),
      );
    }

    if (shouldShowAggregateCacheCreation) {
      breakdownSegments.push(
        i18next.t(
          '缓存创建 {{tokens}} tokens / 1M tokens * {{symbol}}{{price}}',
          {
            tokens: cacheCreationTokens,
            symbol,
            price: cacheCreationUnitPrice.toFixed(6),
          },
        ),
      );
    }

    if (shouldShowCacheCreation5m) {
      breakdownSegments.push(
        i18next.t(
          '5m缓存创建 {{tokens}} tokens / 1M tokens * {{symbol}}{{price}}',
          {
            tokens: cacheCreationTokens5m,
            symbol,
            price: cacheCreationUnitPrice5m.toFixed(6),
          },
        ),
      );
    }

    if (shouldShowCacheCreation1h) {
      breakdownSegments.push(
        i18next.t(
          '1h缓存创建 {{tokens}} tokens / 1M tokens * {{symbol}}{{price}}',
          {
            tokens: cacheCreationTokens1h,
            symbol,
            price: cacheCreationUnitPrice1h.toFixed(6),
          },
        ),
      );
    }

    breakdownSegments.push(
      i18next.t(
        '补全 {{completion}} tokens / 1M tokens * {{symbol}}{{price}}',
        {
          completion: completionTokens,
          symbol,
          price: completionUnitPrice.toFixed(6),
        },
      ),
    );

    const breakdownText = breakdownSegments.join(' + ');

    return renderBillingArticle([
      buildBillingPriceText('输入价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        amount: inputTokenPrice,
      }),
      buildBillingPriceText('输出价格：{{symbol}}{{price}} / 1M tokens', {
        symbol,
        amount: completionTokenPrice,
      }),
      cacheTokens > 0
        ? buildBillingPriceText(
            '缓存读取价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              amount: cacheRatioPrice,
            },
          )
        : null,
      !hasSplitCacheCreation && cacheCreationTokens > 0
        ? buildBillingPriceText(
            '缓存创建价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              amount: cacheCreationRatioPrice,
            },
          )
        : null,
      hasSplitCacheCreation && cacheCreationTokens5m > 0
        ? buildBillingPriceText(
            '5m缓存创建价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              amount: cacheCreationRatioPrice5m,
            },
          )
        : null,
      hasSplitCacheCreation && cacheCreationTokens1h > 0
        ? buildBillingPriceText(
            '1h缓存创建价格：{{symbol}}{{price}} / 1M tokens',
            {
              symbol,
              amount: cacheCreationRatioPrice1h,
            },
          )
        : null,
      buildBillingText(
        '{{breakdown}} * {{ratioType}} {{ratio}} = {{symbol}}{{total}}',
        {
          breakdown: breakdownText,
          ratioType: ratioLabel,
          ratio: groupRatio,
          symbol,
          total: formatBillingDisplayPrice(price),
        },
      ),
    ]);
  }

  if (modelPrice !== -1) {
    return i18next.t(
      '模型价格：{{symbol}}{{price}} * {{ratioType}}：{{ratio}} = {{symbol}}{{total}}',
      {
        symbol: symbol,
        price: modelPrice.toFixed(6),
        ratioType: ratioLabel,
        ratio: groupRatio,
        total: (modelPrice * groupRatio).toFixed(6),
      },
    );
  }

  const modelPriceValue = renderDisplayAmount(modelPrice);
  const completionPriceValue = renderDisplayAmount(completionPrice);
  const cacheRatioValue = formatRatioValue(cacheRatio);
  const cacheCreationRatioValue = formatRatioValue(cacheCreationRatio);
  const cacheCreationRatio5mValue = formatRatioValue(cacheCreationRatio5m);
  const cacheCreationRatio1hValue = formatRatioValue(cacheCreationRatio1h);

  const inputTokenPrice = modelPrice;
  const completionTokenPrice = completionPrice;

  const hasSplitCacheCreation =
    cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;
  const shouldShowCache = cacheTokens > 0;
  const shouldShowAggregateCacheCreation =
    !hasSplitCacheCreation && cacheCreationTokens > 0;
  const shouldShowCacheCreation5m =
    hasSplitCacheCreation && cacheCreationTokens5m > 0;
  const shouldShowCacheCreation1h =
    hasSplitCacheCreation && cacheCreationTokens1h > 0;

  const aggregateCacheCreationTokens = hasSplitCacheCreation
    ? 0
    : cacheCreationTokens;
  const effectiveInputTokens =
    inputTokens +
    cacheTokens * cacheRatioValue +
    aggregateCacheCreationTokens * cacheCreationRatioValue +
    cacheCreationTokens5m * cacheCreationRatio5mValue +
    cacheCreationTokens1h * cacheCreationRatio1hValue;

  const totalAmount =
    (effectiveInputTokens / 1000000) * inputTokenPrice * groupRatio +
    (completionTokens / 1000000) * completionTokenPrice * groupRatio;

  return renderBillingArticle([
    buildBillingText(
      '模型价格 {{modelPrice}}，模型补全价格 {{completionPrice}}，缓存倍率 {{cacheRatio}}，{{ratioType}} {{ratio}}',
      {
        modelPrice: modelPriceValue,
        completionPrice: completionPriceValue,
        cacheRatio: cacheRatioValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
      },
    ),
    hasSplitCacheCreation
      ? buildBillingText(
          '缓存创建倍率 5m {{cacheCreationRatio5m}} / 1h {{cacheCreationRatio1h}}',
          {
            cacheCreationRatio5m: cacheCreationRatio5mValue,
            cacheCreationRatio1h: cacheCreationRatio1hValue,
          },
        )
      : buildBillingText('缓存创建倍率 {{cacheCreationRatio}}', {
          cacheCreationRatio: cacheCreationRatioValue,
        }),
    buildBillingText(
      '普通输入：{{tokens}} / 1M * 模型价格 {{modelPrice}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: inputTokens,
        modelPrice: modelPriceValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmount(
          (inputTokens / 1000000) * inputTokenPrice * groupRatio,
        ),
      },
    ),
    shouldShowCache
      ? buildBillingText(
          '缓存读取：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 缓存倍率 {{cacheRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheTokens,
            modelPrice: modelPriceValue,
            cacheRatio: cacheRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(
              (cacheTokens / 1000000) *
                inputTokenPrice *
                cacheRatioValue *
                groupRatio,
            ),
          },
        )
      : null,
    shouldShowAggregateCacheCreation
      ? buildBillingText(
          '缓存创建：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 缓存创建倍率 {{cacheCreationRatio}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheCreationTokens,
            modelPrice: modelPriceValue,
            cacheCreationRatio: cacheCreationRatioValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(
              (cacheCreationTokens / 1000000) *
                inputTokenPrice *
                cacheCreationRatioValue *
                groupRatio,
            ),
          },
        )
      : null,
    shouldShowCacheCreation5m
      ? buildBillingText(
          '5m缓存创建：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 5m缓存创建倍率 {{cacheCreationRatio5m}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheCreationTokens5m,
            modelPrice: modelPriceValue,
            cacheCreationRatio5m: cacheCreationRatio5mValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(
              (cacheCreationTokens5m / 1000000) *
                inputTokenPrice *
                cacheCreationRatio5mValue *
                groupRatio,
            ),
          },
        )
      : null,
    shouldShowCacheCreation1h
      ? buildBillingText(
          '1h缓存创建：{{tokens}} / 1M * 模型价格 {{modelPrice}} * 1h缓存创建倍率 {{cacheCreationRatio1h}} * {{ratioType}} {{ratio}} = {{amount}}',
          {
            tokens: cacheCreationTokens1h,
            modelPrice: modelPriceValue,
            cacheCreationRatio1h: cacheCreationRatio1hValue,
            ratioType: ratioLabel,
            ratio: groupRatio,
            amount: renderDisplayAmount(
              (cacheCreationTokens1h / 1000000) *
                inputTokenPrice *
                cacheCreationRatio1hValue *
                groupRatio,
            ),
          },
        )
      : null,
    buildBillingText(
      '补全 {{completion}} tokens * 模型补全价格 {{completionPrice}}',
      {
        completion: completionTokens,
        completionPrice: completionPriceValue,
      },
    ),
    buildBillingText(
      '输出：{{tokens}} / 1M * 模型补全价格 {{completionPrice}} * {{ratioType}} {{ratio}} = {{amount}}',
      {
        tokens: completionTokens,
        completionPrice: completionPriceValue,
        ratioType: ratioLabel,
        ratio: groupRatio,
        amount: renderDisplayAmount(
          (completionTokens / 1000000) * completionTokenPrice * groupRatio,
        ),
      },
    ),
    buildBillingText('合计：{{total}}', {
      total: renderDisplayAmount(totalAmount),
    }),
  ]);
}

export function renderClaudeLogContent(opts) {
  const {
    model_price: modelPrice = 0,
    completion_price: completionPrice = modelPrice,
    model_fixed_price: modelFixedPrice = -1,
    group_ratio: _groupRatio,
    user_group_ratio,
    cache_ratio: cacheRatio = 1.0,
    cache_creation_ratio: cacheCreationRatio = 1.0,
    cache_creation_tokens_5m: cacheCreationTokens5m = 0,
    cache_creation_ratio_5m: cacheCreationRatio5m = 1.0,
    cache_creation_tokens_1h: cacheCreationTokens1h = 0,
    cache_creation_ratio_1h: cacheCreationRatio1h = 1.0,
    displayMode = 'price',
  } = opts;
  const { ratio: effectiveGroupRatio, label: ratioLabel } = getEffectiveRatio(
    _groupRatio,
    user_group_ratio,
  );
  let groupRatio = effectiveGroupRatio;

  // 获取货币配置
  const { symbol } = getCurrencyConfig();

  if (isPriceDisplayMode(displayMode, modelFixedPrice)) {
    if (modelFixedPrice !== -1) {
      return joinBillingSummary([
        i18next.t('模型价格 {{symbol}}{{price}} / 次', {
          symbol,
          price: modelFixedPrice.toFixed(6),
        }),
        getGroupRatioText(groupRatio, user_group_ratio),
      ]);
    }

    const parts = [
      i18next.t('输入价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: modelPrice.toFixed(6),
      }),
      i18next.t('输出价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: completionPrice.toFixed(6),
      }),
      i18next.t('缓存读取价格 {{symbol}}{{price}} / 1M tokens', {
        symbol,
        price: (modelPrice * cacheRatio).toFixed(6),
      }),
    ];
    const hasSplitCacheCreation =
      cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;
    appendPricePart(
      parts,
      hasSplitCacheCreation && cacheCreationTokens5m > 0,
      '5m缓存创建价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelPrice * cacheCreationRatio5m).toFixed(6),
      },
    );
    appendPricePart(
      parts,
      hasSplitCacheCreation && cacheCreationTokens1h > 0,
      '1h缓存创建价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelPrice * cacheCreationRatio1h).toFixed(6),
      },
    );
    appendPricePart(
      parts,
      !hasSplitCacheCreation,
      '缓存创建价格 {{symbol}}{{price}} / 1M tokens',
      {
        symbol,
        price: (modelPrice * cacheCreationRatio).toFixed(6),
      },
    );
    parts.push(getGroupRatioText(groupRatio, user_group_ratio));
    return joinBillingSummary(parts);
  }

  if (modelFixedPrice !== -1) {
    return i18next.t('模型价格 {{symbol}}{{price}}，{{ratioType}} {{ratio}}', {
      symbol: symbol,
      price: modelFixedPrice.toFixed(6),
      ratioType: ratioLabel,
      ratio: groupRatio,
    });
  } else {
    const hasSplitCacheCreation =
      cacheCreationTokens5m > 0 || cacheCreationTokens1h > 0;
    const shouldShowCacheCreation5m =
      hasSplitCacheCreation && cacheCreationTokens5m > 0;
    const shouldShowCacheCreation1h =
      hasSplitCacheCreation && cacheCreationTokens1h > 0;

    let cacheCreationPart = null;
    if (hasSplitCacheCreation) {
      if (shouldShowCacheCreation5m && shouldShowCacheCreation1h) {
        cacheCreationPart = i18next.t(
          '缓存创建倍率 5m {{cacheCreationRatio5m}} / 1h {{cacheCreationRatio1h}}',
          {
            cacheCreationRatio5m,
            cacheCreationRatio1h,
          },
        );
      } else if (shouldShowCacheCreation5m) {
        cacheCreationPart = i18next.t(
          '缓存创建倍率 5m {{cacheCreationRatio5m}}',
          {
            cacheCreationRatio5m,
          },
        );
      } else if (shouldShowCacheCreation1h) {
        cacheCreationPart = i18next.t(
          '缓存创建倍率 1h {{cacheCreationRatio1h}}',
          {
            cacheCreationRatio1h,
          },
        );
      }
    }

    if (!cacheCreationPart) {
      cacheCreationPart = i18next.t('缓存创建倍率 {{cacheCreationRatio}}', {
        cacheCreationRatio,
      });
    }

    const parts = [
      i18next.t('模型价格 {{modelPrice}}', {
        modelPrice: renderDisplayAmount(modelPrice),
      }),
      i18next.t('模型补全价格 {{completionPrice}}', {
        completionPrice: renderDisplayAmount(completionPrice),
      }),
      i18next.t('缓存倍率 {{cacheRatio}}', { cacheRatio }),
      cacheCreationPart,
      i18next.t('{{ratioType}} {{ratio}}', {
        ratioType: ratioLabel,
        ratio: groupRatio,
      }),
    ];

    return parts.join('，');
  }
}

// 已统一至 renderModelPriceSimple，若仍有遗留引用，请改为传入 provider='claude'

/**
 * rehype 插件：将段落等文本节点拆分为逐词 <span>，并添加淡入动画 class。
 * 仅在流式渲染阶段使用，避免已渲染文字重复动画。
 */
export function rehypeSplitWordsIntoSpans(options = {}) {
  const { previousContentLength = 0 } = options;

  return (tree) => {
    let currentCharCount = 0; // 当前已处理的字符数

    visit(tree, 'element', (node) => {
      if (
        ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'strong'].includes(
          node.tagName,
        ) &&
        node.children
      ) {
        const newChildren = [];
        node.children.forEach((child) => {
          if (child.type === 'text') {
            try {
              // 使用 Intl.Segmenter 精准拆分中英文及标点
              const segmenter = new Intl.Segmenter('zh', {
                granularity: 'word',
              });
              const segments = segmenter.segment(child.value);

              Array.from(segments)
                .map((seg) => seg.segment)
                .filter(Boolean)
                .forEach((word) => {
                  const wordStartPos = currentCharCount;
                  const wordEndPos = currentCharCount + word.length;

                  // 判断这个词是否是新增的（在 previousContentLength 之后）
                  const isNewContent = wordStartPos >= previousContentLength;

                  newChildren.push({
                    type: 'element',
                    tagName: 'span',
                    properties: {
                      className: isNewContent ? ['animate-fade-in'] : [],
                    },
                    children: [{ type: 'text', value: word }],
                  });

                  currentCharCount = wordEndPos;
                });
            } catch (_) {
              // Fallback：如果浏览器不支持 Segmenter
              const textStartPos = currentCharCount;
              const isNewContent = textStartPos >= previousContentLength;

              if (isNewContent) {
                // 新内容，添加动画
                newChildren.push({
                  type: 'element',
                  tagName: 'span',
                  properties: {
                    className: ['animate-fade-in'],
                  },
                  children: [{ type: 'text', value: child.value }],
                });
              } else {
                // 旧内容，不添加动画
                newChildren.push(child);
              }

              currentCharCount += child.value.length;
            }
          } else {
            newChildren.push(child);
          }
        });
        node.children = newChildren;
      }
    });
  };
}
