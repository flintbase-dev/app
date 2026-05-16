package common

import "strings"

const APIKeyPrefix = "sk-flb-v1-"

func GenerateAPIKey() (string, error) {
	secret, err := GenerateRandomCharsKey(48)
	if err != nil {
		return "", err
	}
	return APIKeyPrefix + secret, nil
}

func NormalizeAPIKey(key string) string {
	key = strings.TrimSpace(key)
	key = strings.TrimPrefix(key, "Bearer ")
	key = strings.TrimPrefix(key, "bearer ")
	return strings.TrimSpace(key)
}

func IsAPIKey(key string) bool {
	key = NormalizeAPIKey(key)
	return strings.HasPrefix(key, APIKeyPrefix) && len(key) > len(APIKeyPrefix)+24
}

func APIKeyHash(key string) string {
	return GenerateHMAC(NormalizeAPIKey(key))
}

func APIKeyDisplayParts(key string) (string, string) {
	key = NormalizeAPIKey(key)
	if key == "" {
		return "", ""
	}
	prefixLen := len(APIKeyPrefix) + 4
	if len(key) < prefixLen {
		prefixLen = len(key)
	}
	lastLen := 4
	if len(key) < lastLen {
		lastLen = len(key)
	}
	return key[:prefixLen], key[len(key)-lastLen:]
}

func MaskAPIKeyFromParts(prefix, last4 string) string {
	prefix = strings.TrimSpace(prefix)
	last4 = strings.TrimSpace(last4)
	if prefix == "" && last4 == "" {
		return ""
	}
	if last4 == "" {
		return prefix + "..."
	}
	if prefix == "" {
		return "..." + last4
	}
	return prefix + "..." + last4
}

func MaskAPIKey(key string) string {
	prefix, last4 := APIKeyDisplayParts(key)
	return MaskAPIKeyFromParts(prefix, last4)
}
