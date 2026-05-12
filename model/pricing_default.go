package model

import (
	"strings"

	"github.com/QuantumNous/new-api/constant"

	"github.com/samber/lo"
)

// 简化的供应商映射规则
var defaultVendorRules = map[string]string{
	"gpt":     "OpenAI",
	"dall-e":  "OpenAI",
	"whisper": "OpenAI",
	"o1":      "OpenAI",
	"o3":      "OpenAI",
	"claude":  "Anthropic",
	"gemini":  "Gemini",
}

// 供应商默认图标映射
var defaultVendorIcons = map[string]string{
	"OpenAI":    "OpenAI",
	"Anthropic": "Claude.Color",
	"Gemini":    "Gemini.Color",
	"Vertex":    "Gemini.Color",
	"Azure":     "AzureAI",
	"AWS":       "AWS.Color",
}

var channelVendorNames = map[int]string{
	constant.ChannelTypeOpenAI:    "OpenAI",
	constant.ChannelTypeAzure:     "Azure",
	constant.ChannelTypeAnthropic: "Anthropic",
	constant.ChannelTypeGemini:    "Gemini",
	constant.ChannelTypeAws:       "AWS",
	constant.ChannelTypeVertexAi:  "Vertex",
}

var allowedDefaultVendors = lo.SliceToMap(lo.Values(channelVendorNames), func(vendor string) (string, struct{}) {
	return vendor, struct{}{}
})

// initDefaultVendorMapping 简化的默认供应商映射
func initDefaultVendorMapping(metaMap map[string]*Model, vendorMap map[string]*Vendor, enableAbilities []AbilityWithChannel) {
	for _, ability := range enableAbilities {
		modelName := ability.Model
		if _, exists := metaMap[modelName]; exists {
			continue
		}

		vendorID := ""
		if vendorName := channelVendorNames[ability.ChannelType]; vendorName != "" {
			vendorID = getOrCreateVendor(vendorName, vendorMap)
		} else {
			modelLower := strings.ToLower(modelName)
			for pattern, vendorName := range defaultVendorRules {
				if strings.Contains(modelLower, pattern) {
					vendorID = getOrCreateVendor(vendorName, vendorMap)
					break
				}
			}
		}

		// 创建模型元数据
		metaMap[modelName] = &Model{
			ModelName: modelName,
			VendorID:  vendorID,
			Status:    1,
			NameRule:  NameRuleExact,
		}
	}
}

// 查找或创建供应商
func getOrCreateVendor(vendorName string, vendorMap map[string]*Vendor) string {
	if _, ok := allowedDefaultVendors[vendorName]; !ok {
		return ""
	}

	// 查找现有供应商
	for id, vendor := range vendorMap {
		if vendor.Name == vendorName {
			return id
		}
	}

	// 创建新供应商
	newVendor := &Vendor{
		Name:   vendorName,
		Status: 1,
		Icon:   getDefaultVendorIcon(vendorName),
	}

	if err := newVendor.Insert(); err != nil {
		return ""
	}

	vendorMap[newVendor.Id] = newVendor
	return newVendor.Id
}

// 获取供应商默认图标
func getDefaultVendorIcon(vendorName string) string {
	if icon, exists := defaultVendorIcons[vendorName]; exists {
		return icon
	}
	return ""
}
