package controller

import (
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type Setup struct {
	Status       bool   `json:"status"`
	RootInit     bool   `json:"root_init"`
	DatabaseType string `json:"database_type"`
}

func GetSetup(c *gin.Context) {
	setupInitialized := model.RefreshSetupStatus()
	setup := Setup{
		Status:       setupInitialized,
		RootInit:     model.RootUserExists(),
		DatabaseType: "postgres",
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    setup,
	})
}
