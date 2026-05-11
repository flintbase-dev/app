package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetCheckinStatusDisabledReturnsInactiveStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)

	setting := operation_setting.GetCheckinSetting()
	original := *setting
	setting.Enabled = false
	setting.MinQuota = 1000
	setting.MaxQuota = 10000
	t.Cleanup(func() {
		*setting = original
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/checkin/status", nil)
	ctx.Set("id", "usr_CheckinDisabled01")

	GetCheckinStatus(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)

	var payload map[string]interface{}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &payload))
	require.True(t, payload["success"].(bool))

	data := payload["data"].(map[string]interface{})
	require.False(t, data["enabled"].(bool))

	stats := data["stats"].(map[string]interface{})
	require.False(t, stats["checked_in_today"].(bool))
	require.Empty(t, stats["records"])
}
