package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
)

func GetAdminStatus(c *gin.Context) {
	dbErr := model.PingDB()
	logDBErr := model.PingLogDB()
	setupInitialized := constant.Setup
	if dbErr == nil {
		setupInitialized = model.RefreshSetupStatus()
	}

	data := gin.H{
		"status_contract_version": 1,
		"version":                 common.Version,
		"start_time":              common.StartTime,
		"setup":                   setupInitialized,
		"http_stats":              middleware.GetStats(),
		"database": gin.H{
			"ok": dbErr == nil,
		},
		"log_database": gin.H{
			"ok": logDBErr == nil,
		},
	}

	if dbErr != nil {
		data["database"].(gin.H)["error"] = dbErr.Error()
	}
	if logDBErr != nil {
		data["log_database"].(gin.H)["error"] = logDBErr.Error()
	}
	if dbErr != nil || logDBErr != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"message": "服务依赖检查失败",
			"data":    data,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Server is running",
		"data":    data,
	})
	return
}

func GetStatus(c *gin.Context) {
	setupInitialized := model.RefreshSetupStatus()

	cs := console_setting.GetConsoleSetting()
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()

	legalSetting := system_setting.GetLegalSettings()

	data := gin.H{
		"status_contract_version":     1,
		"version":                     common.Version,
		"start_time":                  common.StartTime,
		"workos_auth":                 true,
		"system_name":                 common.SystemName,
		"logo":                        common.Logo,
		"footer_html":                 common.Footer,
		"server_address":              system_setting.ServerAddress,
		"docs_link":                   operation_setting.GetGeneralSetting().DocsLink,
		"site_credits_per_price_unit": common.SiteCreditsPerPriceUnit,
		"quota_display_type":          operation_setting.GetQuotaDisplayType(),
		"currency_symbol":             operation_setting.GetCurrencySymbol(),
		"enable_batch_update":         common.BatchUpdateEnabled,
		"enable_drawing":              common.DrawingEnabled,
		"enable_data_export":          true,
		"data_export_default_time":    common.DataExportDefaultTime,
		"default_collapse_sidebar":    common.DefaultCollapseSidebar,
		"chats":                       setting.Chats,
		"default_use_auto_group":      setting.DefaultUseAutoGroup,

		"stripe_unit_price": setting.StripeUnitPrice,

		// 面板启用开关
		"api_info_enabled":    cs.ApiInfoEnabled,
		"uptime_kuma_enabled": cs.UptimeKumaEnabled,
		"faq_enabled":         cs.FAQEnabled,

		// 模块管理配置
		"HeaderNavModules":    common.OptionMap["HeaderNavModules"],
		"SidebarModulesAdmin": common.OptionMap["SidebarModulesAdmin"],

		"setup":                  setupInitialized,
		"user_agreement_enabled": legalSetting.UserAgreement != "",
		"privacy_policy_enabled": legalSetting.PrivacyPolicy != "",
		"checkin_enabled":        operation_setting.GetCheckinSetting().Enabled,
		"hcaptcha_check":         common.HCaptchaCheckEnabled,
		"hcaptcha_site_key":      common.HCaptchaSiteKey,
	}

	// 根据启用状态注入可选内容
	if cs.ApiInfoEnabled {
		data["api_info"] = console_setting.GetApiInfo()
	}
	if cs.FAQEnabled {
		data["faq"] = console_setting.GetFAQ()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    data,
	})
	return
}

func GetAbout(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["About"],
	})
	return
}

func GetUserAgreement(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    system_setting.GetLegalSettings().UserAgreement,
	})
	return
}

func GetPrivacyPolicy(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    system_setting.GetLegalSettings().PrivacyPolicy,
	})
	return
}

func GetHomePageContent(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["HomePageContent"],
	})
	return
}
