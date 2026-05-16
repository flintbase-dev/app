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
import CardPro from '../../common/ui/CardPro';
import TeamsDescription from './TeamsDescription';
import TeamsFilters from './TeamsFilters';
import TeamsTable from './TeamsTable';
import EditTeamModal from './modals/EditTeamModal';
import { useAdminTeamsData } from '../../../hooks/teams/useAdminTeamsData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';

const TeamsPage = () => {
  const teamsData = useAdminTeamsData();
  const isMobile = useIsMobile();

  return (
    <>
      <EditTeamModal
        visible={teamsData.showEditTeam}
        editingTeam={teamsData.editingTeam}
        groupOptions={teamsData.groupOptions}
        updateTeam={teamsData.updateTeam}
        handleClose={teamsData.closeEditTeam}
      />

      <CardPro
        type='type1'
        descriptionArea={
          <TeamsDescription
            compactMode={teamsData.compactMode}
            setCompactMode={teamsData.setCompactMode}
            t={teamsData.t}
          />
        }
        actionsArea={
          <TeamsFilters
            formInitValues={teamsData.formInitValues}
            setFormApi={teamsData.setFormApi}
            searchTeams={teamsData.searchTeams}
            loadTeams={teamsData.loadTeams}
            pageSize={teamsData.pageSize}
            groupOptions={teamsData.groupOptions}
            statusOptions={teamsData.statusOptions}
            loading={teamsData.loading}
            searching={teamsData.searching}
            t={teamsData.t}
          />
        }
        paginationArea={createCardProPagination({
          currentPage: teamsData.activePage,
          pageSize: teamsData.pageSize,
          total: teamsData.teamCount,
          onPageChange: teamsData.handlePageChange,
          onPageSizeChange: teamsData.handlePageSizeChange,
          isMobile,
          t: teamsData.t,
        })}
        t={teamsData.t}
      >
        <TeamsTable {...teamsData} />
      </CardPro>
    </>
  );
};

export default TeamsPage;
