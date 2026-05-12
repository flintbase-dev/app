package model

import "github.com/QuantumNous/new-api/constant"

type Setup struct {
	ID            string `json:"id" gorm:"primaryKey;type:varchar(32)"`
	Version       string `json:"version" gorm:"type:varchar(50);not null"`
	InitializedAt int64  `json:"initialized_at" gorm:"type:bigint;not null"`
}

func GetSetup() *Setup {
	var setup Setup
	if DB == nil {
		return nil
	}
	err := DB.First(&setup).Error
	if err != nil {
		return nil
	}
	return &setup
}

func RefreshSetupStatus() bool {
	initialized := GetSetup() != nil
	constant.Setup = initialized
	return initialized
}
