package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

const (
	QuotaDisplayTypeUSD = "USD"
	QuotaDisplayTypeCNY = "CNY"
)

type GeneralSetting struct {
	DocsLink            string `json:"docs_link"`
	PingIntervalEnabled bool   `json:"ping_interval_enabled"`
	PingIntervalSeconds int    `json:"ping_interval_seconds"`
	QuotaDisplayType    string `json:"quota_display_type"`
}

// 默认配置
var generalSetting = GeneralSetting{
	DocsLink:            "https://docs.newapi.pro",
	PingIntervalEnabled: false,
	PingIntervalSeconds: 60,
	QuotaDisplayType:    QuotaDisplayTypeUSD,
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("general_setting", &generalSetting)
}

func GetGeneralSetting() *GeneralSetting {
	return &generalSetting
}

func IsCurrencyDisplay() bool {
	return true
}

func IsCNYDisplay() bool {
	return GetQuotaDisplayType() == QuotaDisplayTypeCNY
}

func GetQuotaDisplayType() string {
	switch generalSetting.QuotaDisplayType {
	case QuotaDisplayTypeCNY:
		return QuotaDisplayTypeCNY
	default:
		return QuotaDisplayTypeUSD
	}
}

func GetCurrencySymbol() string {
	if GetQuotaDisplayType() == QuotaDisplayTypeCNY {
		return "¥"
	}
	return "$"
}
