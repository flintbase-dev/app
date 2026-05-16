package model

import (
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
)

func cacheSetToken(token Token) error {
	key := token.APIKeyHash
	token.Clean()
	err := common.RedisHSetObj(fmt.Sprintf("api-key:%s", key), &token, time.Duration(common.RedisKeyCacheSeconds())*time.Second)
	if err != nil {
		return err
	}
	return nil
}

func cacheDeleteToken(apiKeyHash string) error {
	err := common.RedisDelKey(fmt.Sprintf("api-key:%s", apiKeyHash))
	if err != nil {
		return err
	}
	return nil
}

func cacheIncrTokenQuota(apiKeyHash string, increment int64) error {
	err := common.RedisHIncrBy(fmt.Sprintf("api-key:%s", apiKeyHash), constant.TokenFiledRemainQuota, increment)
	if err != nil {
		return err
	}
	return nil
}

func cacheDecrTokenQuota(key string, decrement int64) error {
	return cacheIncrTokenQuota(key, -decrement)
}

func cacheSetTokenField(apiKeyHash string, field string, value string) error {
	err := common.RedisHSetField(fmt.Sprintf("api-key:%s", apiKeyHash), field, value)
	if err != nil {
		return err
	}
	return nil
}

// CacheGetTokenByKey 从缓存中获取 token，如果缓存中不存在，则从数据库中获取
func cacheGetTokenByKey(key string) (*Token, error) {
	hmacKey := common.APIKeyHash(key)
	if !common.RedisEnabled {
		return nil, fmt.Errorf("redis is not enabled")
	}
	var token Token
	err := common.RedisHGetObj(fmt.Sprintf("api-key:%s", hmacKey), &token)
	if err != nil {
		return nil, err
	}
	return &token, nil
}
