package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

func fillTypedID(id *string, prefix string) {
	if common.IsEmptyID(*id) {
		*id = common.MustNewTypedID(prefix, 12)
	}
}

func (user *User) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&user.Id, "usr")
	return nil
}

func (token *Token) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&token.Id, "tok")
	return nil
}

func (channel *Channel) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&channel.Id, "chn")
	return nil
}

func (redemption *Redemption) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&redemption.Id, "red")
	return nil
}

func (grant *CreditGrant) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&grant.Id, "grn")
	return nil
}

func (entry *CreditLedgerEntry) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&entry.Id, "led")
	return nil
}

func (topUp *TopUp) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&topUp.Id, "tup")
	return nil
}

func (log *Log) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&log.Id, "log")
	return nil
}

func (model *Model) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&model.Id, "mdl")
	return nil
}

func (vendor *Vendor) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&vendor.Id, "ven")
	return nil
}

func (group *PrefillGroup) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&group.Id, "pfg")
	return nil
}

func (setup *Setup) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&setup.ID, "set")
	return nil
}

func (checkin *Checkin) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&checkin.Id, "chk")
	return nil
}

func (order *SubscriptionOrder) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&order.Id, "sod")
	return nil
}
