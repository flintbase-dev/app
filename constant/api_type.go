package constant

const (
	APITypeOpenAI = iota
	APITypeAnthropic
	APITypeGemini
	APITypeAws
	APITypeVertexAi
	APITypeDummy
)

var AllowedAPITypes = []int{
	APITypeOpenAI,
	APITypeAnthropic,
	APITypeGemini,
	APITypeAws,
	APITypeVertexAi,
}
