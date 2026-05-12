package controller

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRatioSyncGraphQLOperationAliases(t *testing.T) {
	require.Equal(t, "pricing", ratioSyncGraphQLOperation(""))
	require.Equal(t, "pricing", ratioSyncGraphQLOperation("pricing"))
	require.Equal(t, "ratioConfig", ratioSyncGraphQLOperation("ratioConfig"))
	require.Equal(t, "", ratioSyncGraphQLOperation("/custom.json"))
}

func TestUnwrapGraphQLRatioSyncResponse(t *testing.T) {
	body, err := unwrapGraphQLRatioSyncResponse([]byte(`{
		"data": {
			"pricing": {
				"success": true,
				"data": [{"model_name": "gpt-test"}]
			}
		}
	}`), "pricing")
	require.NoError(t, err)
	require.JSONEq(t, `{"success":true,"data":[{"model_name":"gpt-test"}]}`, string(body))
}

func TestUnwrapGraphQLRatioSyncResponseErrors(t *testing.T) {
	_, err := unwrapGraphQLRatioSyncResponse([]byte(`{
		"errors": [{"message": "operation failed"}]
	}`), "pricing")
	require.EqualError(t, err, "operation failed")
}
