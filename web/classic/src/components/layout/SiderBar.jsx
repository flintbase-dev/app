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

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLucideIcon } from '../../helpers/render';
import { ChevronLeft, Plus } from 'lucide-react';
import { useSidebarCollapsed } from '../../hooks/common/useSidebarCollapsed';
import { useSidebar } from '../../hooks/common/useSidebar';
import { useMinimumLoadingTime } from '../../hooks/common/useMinimumLoadingTime';
import { API, isAdmin, isRoot, showError, showSuccess } from '../../helpers';
import SkeletonWrapper from './components/SkeletonWrapper';

import { Nav, Divider, Button, Input, Modal, Select } from '@douyinfe/semi-ui';

const routerMap = {
  home: '/',
  channel: '/console/channel',
  token: '/console/token',
  messages: '/console/messages',
  redemption: '/console/redemption',
  topup: '/console/topup',
  user: '/console/user',
  team: '/console/team',
  subscription: '/console/subscription',
  messageManagement: '/console/message-management',
  log: '/console/log',
  setting: '/console/setting',
  about: '/about',
  detail: '/console',
  pricing: '/pricing',
  models: '/console/models',
  playground: '/console/playground',
  personal: '/console/personal',
  teamSettings: '/console/settings',
};

const SiderBar = ({ onNavigate = () => {} }) => {
  const { t } = useTranslation();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const {
    isModuleVisible,
    hasSectionVisibleModules,
    loading: sidebarLoading,
  } = useSidebar();

  const showSkeleton = useMinimumLoadingTime(sidebarLoading, 200);

  const [selectedKeys, setSelectedKeys] = useState(['home']);
  const [chatItems, setChatItems] = useState([]);
  const [openedKeys, setOpenedKeys] = useState([]);
  const location = useLocation();
  const [routerMapState, setRouterMapState] = useState(routerMap);
  const teamMatch = location.pathname.match(/^\/teams\/([^/]+)\/console/);
  const activeTeamId = teamMatch?.[1] || '';
  const isTeamSettingsRoute =
    Boolean(activeTeamId) && location.pathname.endsWith('/settings');
  const [accountContext, setAccountContext] = useState({ teams: [] });
  const [teamCreateOpen, setTeamCreateOpen] = useState(false);
  const [teamCreatePending, setTeamCreatePending] = useState(false);
  const [teamName, setTeamName] = useState('');
  const activeTeam = (accountContext.teams || []).find(
    (team) => team.id === activeTeamId,
  );
  const isActiveTeamAdmin = activeTeam?.role === 'admin';

  const workspaceItems = useMemo(() => {
    const items = [
      {
        text: t('数据看板'),
        itemKey: 'detail',
        to: '/detail',
        className:
          localStorage.getItem('enable_data_export') === 'true'
            ? ''
            : 'tableHiddle',
      },
      {
        text: t('令牌管理'),
        itemKey: 'token',
        to: '/token',
      },
      {
        text: t('使用日志'),
        itemKey: 'log',
        to: '/log',
      },
      {
        text: t('我的消息'),
        itemKey: 'messages',
        to: '/messages',
      },
    ];
    const accountItems = activeTeamId
      ? items.filter((item) =>
          ['detail', 'token', 'log'].includes(item.itemKey),
        )
      : items;

    // 根据配置过滤项目
    const filteredItems = accountItems.filter((item) => {
      const configVisible = isModuleVisible('console', item.itemKey);
      return configVisible;
    });

    return filteredItems;
  }, [
    localStorage.getItem('enable_data_export'),
    t,
    isModuleVisible,
    activeTeamId,
  ]);

  const financeItems = useMemo(() => {
    const items = activeTeamId
      ? [
          {
            text: t('Team Billing'),
            itemKey: 'topup',
            to: '/topup',
          },
          ...(isActiveTeamAdmin
            ? [
                {
                  text: t('Team Settings'),
                  itemKey: 'teamSettings',
                  to: '/settings',
                },
              ]
            : []),
        ]
      : [
          {
            text: t('Billing'),
            itemKey: 'topup',
            to: '/topup',
          },
          {
            text: t('个人设置'),
            itemKey: 'personal',
            to: '/personal',
          },
        ];

    // 根据配置过滤项目
    const filteredItems = items.filter((item) => {
      const configVisible = isModuleVisible('personal', item.itemKey);
      return configVisible;
    });

    return filteredItems;
  }, [t, isModuleVisible, activeTeamId, isActiveTeamAdmin]);

  const adminItems = useMemo(() => {
    const items = [
      {
        text: t('渠道管理'),
        itemKey: 'channel',
        to: '/channel',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('订阅管理'),
        itemKey: 'subscription',
        to: '/subscription',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('模型管理'),
        itemKey: 'models',
        to: '/console/models',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('兑换码管理'),
        itemKey: 'redemption',
        to: '/redemption',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('用户管理'),
        itemKey: 'user',
        to: '/user',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('团队管理'),
        itemKey: 'team',
        to: '/team',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('消息管理'),
        itemKey: 'messageManagement',
        to: '/message-management',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('系统设置'),
        itemKey: 'setting',
        to: '/setting',
        className: isRoot() ? '' : 'tableHiddle',
      },
    ];

    // 根据配置过滤项目
    const filteredItems = items.filter((item) => {
      const configVisible = isModuleVisible('admin', item.itemKey);
      return configVisible;
    });

    return filteredItems;
  }, [isAdmin(), isRoot(), t, isModuleVisible]);

  const chatMenuItems = useMemo(() => {
    const items = [
      {
        text: t('操练场'),
        itemKey: 'playground',
        to: '/playground',
      },
      {
        text: t('聊天'),
        itemKey: 'chat',
        items: chatItems,
      },
    ];

    // 根据配置过滤项目
    const filteredItems = items.filter((item) => {
      const configVisible = isModuleVisible('chat', item.itemKey);
      return configVisible;
    });

    return filteredItems;
  }, [chatItems, t, isModuleVisible]);

  // 更新路由映射，添加聊天路由
  const updateRouterMapWithChats = (chats) => {
    const newRouterMap = { ...routerMap };

    if (Array.isArray(chats) && chats.length > 0) {
      for (let i = 0; i < chats.length; i++) {
        newRouterMap['chat' + i] = '/console/chat/' + i;
      }
    }

    setRouterMapState(newRouterMap);
    return newRouterMap;
  };

  // 加载聊天项
  useEffect(() => {
    let chats = localStorage.getItem('chats');
    if (chats) {
      try {
        chats = JSON.parse(chats);
        if (Array.isArray(chats)) {
          let chatItems = [];
          for (let i = 0; i < chats.length; i++) {
            let shouldSkip = false;
            let chat = {};
            for (let key in chats[i]) {
              let link = chats[i][key];
              if (typeof link !== 'string') continue; // 确保链接是字符串
              if (
                link.startsWith('fluent') ||
                link.startsWith('ccswitch') ||
                link.startsWith('deepchat')
              ) {
                shouldSkip = true;
                break;
              }
              chat.text = key;
              chat.itemKey = 'chat' + i;
              chat.to = '/console/chat/' + i;
            }
            if (shouldSkip || !chat.text) continue; // 避免推入空项
            chatItems.push(chat);
          }
          setChatItems(chatItems);
          updateRouterMapWithChats(chats);
        }
      } catch (e) {
        showError('聊天数据解析失败');
      }
    }
  }, []);

  useEffect(() => {
    API.query('accountContext')
      .then((res) => {
        if (res.data?.success) {
          setAccountContext(res.data.data || { teams: [] });
        }
      })
      .catch(() => {});
  }, []);

  const createTeam = async () => {
    const name = teamName.trim();
    if (!name) {
      showError(t('请输入名称'));
      return;
    }
    setTeamCreatePending(true);
    try {
      const res = await API.mutation('createTeam', { name });
      if (res.data?.success) {
        showSuccess(t('创建成功'));
        const redirect = res.data.data?.redirect || '/console';
        window.location.assign(redirect);
      } else {
        showError(res.data?.message || t('创建失败'));
      }
    } catch (error) {
      showError(error?.message || t('创建失败'));
    } finally {
      setTeamCreatePending(false);
    }
  };

  const teamConsoleSuffix = () => {
    if (activeTeamId) {
      return (
        location.pathname.replace(`/teams/${activeTeamId}/console`, '') || ''
      );
    }
    return location.pathname.replace('/console', '') || '';
  };

  const switchAccountContext = (value) => {
    const suffix = teamConsoleSuffix();
    if (value === 'personal') {
      const safeSuffix =
        suffix === '/topup' || suffix === '/settings' ? '' : suffix;
      window.location.assign(`/console${safeSuffix}`);
      return;
    }
    window.location.assign(
      `/teams/${value}/console${suffix === '/personal' ? '' : suffix}`,
    );
  };

  const resolveRoute = (to) => {
    if (!activeTeamId || !to?.startsWith('/console')) return to;
    return to.replace('/console', `/teams/${activeTeamId}/console`);
  };

  // 根据当前路径设置选中的菜单项
  useEffect(() => {
    const currentPath = location.pathname;
    let matchingKey = Object.keys(routerMapState).find(
      (key) => routerMapState[key] === currentPath,
    );

    // 处理聊天路由
    if (!matchingKey && currentPath.startsWith('/console/chat/')) {
      const chatIndex = currentPath.split('/').pop();
      if (!isNaN(chatIndex)) {
        matchingKey = 'chat' + chatIndex;
      } else {
        matchingKey = 'chat';
      }
    }
    if (!matchingKey && activeTeamId) {
      const teamPath = currentPath.replace(`/teams/${activeTeamId}`, '');
      matchingKey = Object.keys(routerMapState).find(
        (key) => routerMapState[key] === teamPath,
      );
      if (currentPath.endsWith('/settings')) {
        matchingKey = 'teamSettings';
      }
    }

    // 如果找到匹配的键，更新选中的键
    if (matchingKey) {
      setSelectedKeys([matchingKey]);
    }
  }, [location.pathname, routerMapState]);

  // 监控折叠状态变化以更新 body class
  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [collapsed]);

  // 选中高亮颜色（统一）
  const SELECTED_COLOR = 'var(--semi-color-primary)';

  // 渲染自定义菜单项
  const renderNavItem = (item) => {
    // 跳过隐藏的项目
    if (item.className === 'tableHiddle') return null;

    const isSelected = selectedKeys.includes(item.itemKey);
    const textColor = isSelected ? SELECTED_COLOR : 'inherit';

    return (
      <Nav.Item
        key={item.itemKey}
        itemKey={item.itemKey}
        text={
          <span
            className='truncate font-medium text-sm'
            style={{ color: textColor }}
          >
            {item.text}
          </span>
        }
        icon={
          <div className='sidebar-icon-container flex-shrink-0'>
            {getLucideIcon(item.itemKey, isSelected)}
          </div>
        }
        className={item.className}
      />
    );
  };

  // 渲染子菜单项
  const renderSubItem = (item) => {
    if (item.items && item.items.length > 0) {
      const isSelected = selectedKeys.includes(item.itemKey);
      const textColor = isSelected ? SELECTED_COLOR : 'inherit';

      return (
        <Nav.Sub
          key={item.itemKey}
          itemKey={item.itemKey}
          text={
            <span
              className='truncate font-medium text-sm'
              style={{ color: textColor }}
            >
              {item.text}
            </span>
          }
          icon={
            <div className='sidebar-icon-container flex-shrink-0'>
              {getLucideIcon(item.itemKey, isSelected)}
            </div>
          }
        >
          {item.items.map((subItem) => {
            const isSubSelected = selectedKeys.includes(subItem.itemKey);
            const subTextColor = isSubSelected ? SELECTED_COLOR : 'inherit';

            return (
              <Nav.Item
                key={subItem.itemKey}
                itemKey={subItem.itemKey}
                text={
                  <span
                    className='truncate font-medium text-sm'
                    style={{ color: subTextColor }}
                  >
                    {subItem.text}
                  </span>
                }
              />
            );
          })}
        </Nav.Sub>
      );
    } else {
      return renderNavItem(item);
    }
  };

  return (
    <div
      className='sidebar-container'
      style={{
        width: 'var(--sidebar-current-width)',
      }}
    >
      <SkeletonWrapper
        loading={showSkeleton}
        type='sidebar'
        className=''
        collapsed={collapsed}
        showAdmin={isAdmin()}
      >
        <Modal
          title={t('Create Team')}
          visible={teamCreateOpen}
          onOk={createTeam}
          onCancel={() => setTeamCreateOpen(false)}
          confirmLoading={teamCreatePending}
        >
          <label className='mb-2 block text-sm font-medium' htmlFor='team-name'>
            {t('Team name')}
          </label>
          <Input
            id='team-name'
            value={teamName}
            onChange={setTeamName}
            placeholder={t('Team name')}
          />
        </Modal>
        <Nav
          className='sidebar-nav'
          defaultIsCollapsed={collapsed}
          isCollapsed={collapsed}
          onCollapseChange={toggleCollapsed}
          selectedKeys={selectedKeys}
          itemStyle='sidebar-nav-item'
          hoverStyle='sidebar-nav-item:hover'
          selectedStyle='sidebar-nav-item-selected'
          renderWrapper={({ itemElement, props }) => {
            const to = resolveRoute(
              routerMapState[props.itemKey] || routerMap[props.itemKey],
            );

            // 如果没有路由，直接返回元素
            if (!to) return itemElement;

            return (
              <Link
                style={{ textDecoration: 'none' }}
                to={to}
                onClick={onNavigate}
              >
                {itemElement}
              </Link>
            );
          }}
          onSelect={(key) => {
            // 如果点击的是已经展开的子菜单的父项，则收起子菜单
            if (openedKeys.includes(key.itemKey)) {
              setOpenedKeys(openedKeys.filter((k) => k !== key.itemKey));
            }

            setSelectedKeys([key.itemKey]);
          }}
          openKeys={openedKeys}
          onOpenChange={(data) => {
            setOpenedKeys(data.openKeys);
          }}
        >
          {!collapsed && (
            <div className='sidebar-section px-2 pb-2'>
              <Select
                value={activeTeamId || 'personal'}
                onChange={switchAccountContext}
                style={{ width: '100%' }}
                optionList={[
                  { label: t('Personal'), value: 'personal' },
                  ...(accountContext.teams || []).map((team) => ({
                    label: team.name,
                    value: team.id,
                  })),
                ]}
              />
              <Button
                className='mt-2 w-full'
                size='small'
                type='tertiary'
                icon={<Plus size={14} />}
                onClick={() => setTeamCreateOpen(true)}
              >
                {t('Create Team')}
              </Button>
            </div>
          )}

          {isTeamSettingsRoute ? (
            <div className='sidebar-section'>
              {!collapsed && (
                <div className='px-2 pb-2'>
                  <Link to={`/teams/${activeTeamId}/console`}>
                    <Button className='w-full' type='tertiary'>
                      {t('Back')}
                    </Button>
                  </Link>
                </div>
              )}
              {!collapsed && (
                <div className='sidebar-group-label'>{t('Org Settings')}</div>
              )}
              {renderNavItem({
                text: t('Team Settings'),
                itemKey: 'teamSettings',
                to: '/settings',
              })}
            </div>
          ) : (
            <>
              {/* 聊天区域 */}
              {!activeTeamId && hasSectionVisibleModules('chat') && (
                <div className='sidebar-section'>
                  {!collapsed && (
                    <div className='sidebar-group-label'>{t('聊天')}</div>
                  )}
                  {chatMenuItems.map((item) => renderSubItem(item))}
                </div>
              )}

              {/* 控制台区域 */}
              {hasSectionVisibleModules('console') && (
                <>
                  <Divider className='sidebar-divider' />
                  <div>
                    {!collapsed && (
                      <div className='sidebar-group-label'>{t('控制台')}</div>
                    )}
                    {workspaceItems.map((item) => renderNavItem(item))}
                  </div>
                </>
              )}

              {/* 个人中心区域 */}
              {hasSectionVisibleModules('personal') && (
                <>
                  <Divider className='sidebar-divider' />
                  <div>
                    {!collapsed && (
                      <div className='sidebar-group-label'>{t('个人中心')}</div>
                    )}
                    {financeItems.map((item) => renderNavItem(item))}
                  </div>
                </>
              )}

              {/* 管理员区域 - 只在管理员时显示且配置允许时显示 */}
              {!activeTeamId &&
                isAdmin() &&
                hasSectionVisibleModules('admin') && (
                  <>
                    <Divider className='sidebar-divider' />
                    <div>
                      {!collapsed && (
                        <div className='sidebar-group-label'>{t('管理员')}</div>
                      )}
                      {adminItems.map((item) => renderNavItem(item))}
                    </div>
                  </>
                )}
            </>
          )}
        </Nav>
      </SkeletonWrapper>

      {/* 底部折叠按钮 */}
      <div className='sidebar-collapse-button'>
        <SkeletonWrapper
          loading={showSkeleton}
          type='button'
          width={collapsed ? 36 : 156}
          height={24}
          className='w-full'
        >
          <Button
            theme='outline'
            type='tertiary'
            size='small'
            icon={
              <ChevronLeft
                size={16}
                strokeWidth={2.5}
                color='var(--semi-color-text-2)'
                style={{
                  transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            }
            onClick={toggleCollapsed}
            icononly={collapsed}
            style={
              collapsed
                ? { width: 36, height: 24, padding: 0 }
                : { padding: '4px 12px', width: '100%' }
            }
          >
            {!collapsed ? t('收起侧边栏') : null}
          </Button>
        </SkeletonWrapper>
      </div>
    </div>
  );
};

export default SiderBar;
