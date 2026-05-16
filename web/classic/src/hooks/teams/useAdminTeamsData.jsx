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

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';
import { ITEMS_PER_PAGE } from '../../constants';
import { useTableCompactMode } from '../common/useTableCompactMode';

export const TEAM_STATUS_OPTIONS = [
  { label: 'active', value: 'active' },
  { label: 'deleted', value: 'deleted' },
];

export const useAdminTeamsData = () => {
  const { t } = useTranslation();
  const [compactMode, setCompactMode] = useTableCompactMode('admin-teams');

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [searching, setSearching] = useState(false);
  const [teamCount, setTeamCount] = useState(0);
  const [groupOptions, setGroupOptions] = useState([]);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState({ id: undefined });

  const formInitValues = {
    searchKeyword: '',
    searchGroup: '',
    searchStatus: '',
  };

  const [formApi, setFormApi] = useState(null);

  const getFormValues = () => {
    const formValues = formApi ? formApi.getValues() : {};
    return {
      searchKeyword: formValues.searchKeyword || '',
      searchGroup: formValues.searchGroup || '',
      searchStatus: formValues.searchStatus || '',
    };
  };

  const setTeamFormat = (items) => {
    setTeams((items || []).map((team) => ({ ...team, key: team.id })));
  };

  const loadTeams = async (page, size) => {
    setLoading(true);
    try {
      const res = await API.query('adminTeams', {
        p: page,
        page_size: size,
      });
      const { success, message, data } = res.data;
      if (success) {
        setActivePage(data.page);
        setTeamCount(data.total);
        setTeamFormat(data.items);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchTeams = async (
    page,
    size,
    searchKeyword = null,
    searchGroup = null,
    searchStatus = null,
  ) => {
    if (
      searchKeyword === null ||
      searchGroup === null ||
      searchStatus === null
    ) {
      const formValues = getFormValues();
      searchKeyword = formValues.searchKeyword;
      searchGroup = formValues.searchGroup;
      searchStatus = formValues.searchStatus;
    }

    if (searchKeyword === '' && searchGroup === '' && searchStatus === '') {
      await loadTeams(page, size);
      return;
    }

    setSearching(true);
    try {
      const res = await API.query('searchTeams', {
        keyword: searchKeyword,
        group: searchGroup,
        status: searchStatus,
        p: page,
        page_size: size,
      });
      const { success, message, data } = res.data;
      if (success) {
        setActivePage(data.page);
        setTeamCount(data.total);
        setTeamFormat(data.items);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setSearching(false);
    }
  };

  const refresh = async (page = activePage) => {
    const { searchKeyword, searchGroup, searchStatus } = getFormValues();
    if (searchKeyword === '' && searchGroup === '' && searchStatus === '') {
      await loadTeams(page, pageSize);
    } else {
      await searchTeams(
        page,
        pageSize,
        searchKeyword,
        searchGroup,
        searchStatus,
      );
    }
  };

  const updateTeam = async (payload) => {
    setLoading(true);
    try {
      const res = await API.mutation('adminUpdateTeam', {
        team_id: payload.id,
        name: payload.name,
        group: payload.group,
        quota: payload.quota,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('团队更新成功'));
        await refresh();
        setShowEditTeam(false);
        setEditingTeam({ id: undefined });
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deactivateTeam = async (team) => {
    setLoading(true);
    try {
      const res = await API.mutation('adminDeactivateTeam', {
        team_id: team.id,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('团队已停用'));
        await refresh();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setActivePage(page);
    const { searchKeyword, searchGroup, searchStatus } = getFormValues();
    if (searchKeyword === '' && searchGroup === '' && searchStatus === '') {
      loadTeams(page, pageSize).then();
    } else {
      searchTeams(
        page,
        pageSize,
        searchKeyword,
        searchGroup,
        searchStatus,
      ).then();
    }
  };

  const handlePageSizeChange = async (size) => {
    localStorage.setItem('page-size', size + '');
    setPageSize(size);
    setActivePage(1);
    await loadTeams(1, size);
  };

  const handleRow = (record) => {
    if (record.status !== 'active') {
      return {
        style: {
          background: 'var(--semi-color-disabled-border)',
        },
      };
    }
    return {};
  };

  const fetchGroups = async () => {
    try {
      const res = await API.query('groups');
      setGroupOptions(
        (res.data.data || []).map((group) => ({
          label: group,
          value: group,
        })),
      );
    } catch (error) {
      showError(error.message);
    }
  };

  const closeEditTeam = () => {
    setShowEditTeam(false);
    setEditingTeam({ id: undefined });
  };

  useEffect(() => {
    loadTeams(1, pageSize).then();
    fetchGroups().then();
  }, []);

  return {
    teams,
    loading,
    activePage,
    pageSize,
    teamCount,
    searching,
    groupOptions,
    statusOptions: TEAM_STATUS_OPTIONS,
    showEditTeam,
    editingTeam,
    setShowEditTeam,
    setEditingTeam,
    closeEditTeam,
    formInitValues,
    setFormApi,
    compactMode,
    setCompactMode,
    loadTeams,
    searchTeams,
    updateTeam,
    deactivateTeam,
    handlePageChange,
    handlePageSizeChange,
    handleRow,
    refresh,
    t,
  };
};
