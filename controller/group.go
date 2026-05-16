package controller

import (
	"errors"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

func GetGroups(c *gin.Context) {
	groupNames := make([]string, 0)
	for groupName := range ratio_setting.GetGroupRatioCopy() {
		groupNames = append(groupNames, groupName)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    groupNames,
	})
}

func resolvePolicyGroupForRequest(c *gin.Context, userId string) (string, error) {
	teamId := strings.TrimSpace(c.Query("team_id"))
	if teamId == "" {
		teamId = strings.TrimSpace(c.Param("team_id"))
	}
	if teamId != "" {
		if _, err := model.RequireTeamMember(teamId, c.GetString("id")); err != nil {
			return "", errors.New("team membership required")
		}
		team, err := model.GetTeamById(teamId)
		if err != nil {
			return "", err
		}
		return team.Group, nil
	}
	if common.IsEmptyID(userId) {
		return "", nil
	}
	return model.GetUserGroup(userId, false)
}

func GetUserGroups(c *gin.Context) {
	usableGroups := make(map[string]map[string]interface{})
	userId := c.GetString("id")
	userGroup, err := resolvePolicyGroupForRequest(c, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	userUsableGroups := service.GetUserUsableGroups(userGroup)
	for groupName, _ := range ratio_setting.GetGroupRatioCopy() {
		// UserUsableGroups contains the groups that the user can use
		if desc, ok := userUsableGroups[groupName]; ok {
			usableGroups[groupName] = map[string]interface{}{
				"ratio": service.GetUserGroupRatio(userGroup, groupName),
				"desc":  desc,
			}
		}
	}
	if _, ok := userUsableGroups["auto"]; ok {
		usableGroups["auto"] = map[string]interface{}{
			"ratio": "自动",
			"desc":  setting.GetUsableGroupDescription("auto"),
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    usableGroups,
	})
}
