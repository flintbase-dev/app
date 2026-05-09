package controller

import (
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type Setup struct {
	Status       bool   `json:"status"`
	RootInit     bool   `json:"root_init"`
	DatabaseType string `json:"database_type"`
}

func GetSetup(c *gin.Context) {
	setup := Setup{
		Status:       constant.Setup,
		RootInit:     constant.Setup,
		DatabaseType: "postgres",
	}
	if !constant.Setup {
		setup.RootInit = model.RootUserExists()
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    setup,
	})
}
