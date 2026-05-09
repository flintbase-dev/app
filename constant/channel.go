package constant

const (
	ChannelTypeUnknown   = 0
	ChannelTypeOpenAI    = 1
	ChannelTypeAzure     = 3
	ChannelTypeAnthropic = 14
	ChannelTypeGemini    = 24
	ChannelTypeAws       = 33
	ChannelTypeVertexAi  = 41
)

var AllowedChannelTypes = []int{
	ChannelTypeOpenAI,
	ChannelTypeAnthropic,
	ChannelTypeGemini,
	ChannelTypeVertexAi,
	ChannelTypeAzure,
	ChannelTypeAws,
}

var ChannelBaseURLs = map[int]string{
	ChannelTypeUnknown:   "",
	ChannelTypeOpenAI:    "https://api.openai.com",
	ChannelTypeAzure:     "",
	ChannelTypeAnthropic: "https://api.anthropic.com",
	ChannelTypeGemini:    "https://generativelanguage.googleapis.com",
	ChannelTypeAws:       "",
	ChannelTypeVertexAi:  "",
}

var ChannelTypeNames = map[int]string{
	ChannelTypeUnknown:   "Unknown",
	ChannelTypeOpenAI:    "OpenAI",
	ChannelTypeAzure:     "Azure",
	ChannelTypeAnthropic: "Anthropic",
	ChannelTypeGemini:    "Gemini",
	ChannelTypeAws:       "AWS",
	ChannelTypeVertexAi:  "VertexAI",
}

func GetChannelTypeName(channelType int) string {
	if name, ok := ChannelTypeNames[channelType]; ok {
		return name
	}
	return "Unknown"
}
