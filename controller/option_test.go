package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/internal/testdb"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetOptionsHidesSensitiveKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)

	common.OptionMapRWMutex.Lock()
	original := common.OptionMap
	common.OptionMap = map[string]string{
		"SystemName":          "Flintbase",
		"PostmarkServerToken": "secret-token",
	}
	common.OptionMapRWMutex.Unlock()
	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		common.OptionMap = original
		common.OptionMapRWMutex.Unlock()
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/options", nil)

	GetOptions(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	var payload map[string]interface{}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &payload))
	require.True(t, payload["success"].(bool))

	items := payload["data"].([]interface{})
	require.Len(t, items, 1)
	option := items[0].(map[string]interface{})
	require.Equal(t, "SystemName", option["key"])
}

func TestUpdateOptionWithRevisionPersistsAuditTrail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	common.RedisEnabled = false

	db := testdb.OpenAndReset(t)
	model.DB = db
	model.LOG_DB = db

	common.OptionMapRWMutex.Lock()
	original := common.OptionMap
	common.OptionMap = map[string]string{}
	common.OptionMapRWMutex.Unlock()
	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		common.OptionMap = original
		common.OptionMapRWMutex.Unlock()
	})

	result, err := model.UpdateOptionWithRevision("CustomSetting", "enabled", model.OptionUpdateMetadata{
		ActorUserId: "usr_OptionTest01",
		RequestId:   "req_OptionTest01",
		Reason:      "initial rollout",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, result.Revision)
	require.Equal(t, "enabled", common.OptionMap["CustomSetting"])
	require.NotEmpty(t, result.Revision.Id)

	var revision model.OptionRevision
	require.NoError(t, db.First(&revision, "id = ?", result.Revision.Id).Error)
	require.Equal(t, "CustomSetting", revision.Key)
	require.Equal(t, "enabled", revision.NewValueSnapshot)
	require.False(t, revision.IsSensitive)
	require.Equal(t, "usr_OptionTest01", revision.ActorUserId)
	require.Equal(t, "req_OptionTest01", revision.RequestId)
}

func TestUpdateOptionWithRevisionRedactsSensitiveValues(t *testing.T) {
	gin.SetMode(gin.TestMode)
	common.RedisEnabled = false

	db := testdb.OpenAndReset(t)
	model.DB = db
	model.LOG_DB = db

	common.OptionMapRWMutex.Lock()
	original := common.OptionMap
	common.OptionMap = map[string]string{}
	common.OptionMapRWMutex.Unlock()
	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		common.OptionMap = original
		common.OptionMapRWMutex.Unlock()
	})

	_, err := model.UpdateOptionWithRevision("CustomSecret", "old-secret", model.OptionUpdateMetadata{
		ActorUserId: "usr_OptionTest02",
		RequestId:   "req_OptionTest02",
	})
	require.NoError(t, err)
	result, err := model.UpdateOptionWithRevision("CustomSecret", "new-secret", model.OptionUpdateMetadata{
		ActorUserId: "usr_OptionTest02",
		RequestId:   "req_OptionTest03",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, result.Revision)

	var revision model.OptionRevision
	require.NoError(t, db.First(&revision, "id = ?", result.Revision.Id).Error)
	require.True(t, revision.IsSensitive)
	require.Equal(t, "[redacted]", revision.NewValueSnapshot)
	require.Equal(t, "[redacted]", *revision.OldValueSnapshot)
	require.NotEmpty(t, revision.NewValueSHA256)
	require.NotEqual(t, revision.NewValueSHA256, revision.OldValueSHA256)
}

func TestGetOptionRevisionsReturnsLatestFirst(t *testing.T) {
	gin.SetMode(gin.TestMode)
	common.RedisEnabled = false

	db := testdb.OpenAndReset(t)
	model.DB = db
	model.LOG_DB = db

	common.OptionMapRWMutex.Lock()
	original := common.OptionMap
	common.OptionMap = map[string]string{}
	common.OptionMapRWMutex.Unlock()
	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		common.OptionMap = original
		common.OptionMapRWMutex.Unlock()
	})

	_, err := model.UpdateOptionWithRevision("CustomSetting", "first", model.OptionUpdateMetadata{})
	require.NoError(t, err)
	_, err = model.UpdateOptionWithRevision("CustomSetting", "second", model.OptionUpdateMetadata{})
	require.NoError(t, err)

	revisions, total, err := model.GetOptionRevisions("CustomSetting", 0, 10)
	require.NoError(t, err)
	require.Equal(t, int64(2), total)
	require.Len(t, revisions, 2)
	require.Equal(t, "second", revisions[0].NewValueSnapshot)
	require.Equal(t, "first", revisions[1].NewValueSnapshot)
}
