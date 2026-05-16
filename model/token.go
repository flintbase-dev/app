package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/bytedance/gopkg/util/gopool"
	"gorm.io/gorm"
)

type Token struct {
	Id              string         `json:"id" gorm:"primaryKey;type:varchar(32)"`
	UserId          string         `json:"user_id" gorm:"type:varchar(32);index"`
	CreatedByUserId string         `json:"created_by_user_id" gorm:"type:varchar(32);index"`
	AccountType     string         `json:"account_type" gorm:"type:varchar(16);index;default:'personal'"`
	AccountId       string         `json:"account_id" gorm:"type:varchar(32);index;default:''"`
	Key             string         `json:"key,omitempty" gorm:"-"`
	APIKeyHash      string         `json:"-" gorm:"column:api_key_hash;type:char(64);uniqueIndex"`
	APIKeyPrefix    string         `json:"api_key_prefix" gorm:"column:api_key_prefix;type:varchar(32)"`
	APIKeyLast4     string         `json:"api_key_last4" gorm:"column:api_key_last4;type:varchar(8)"`
	Status          int            `json:"status" gorm:"default:1"`
	Name            string         `json:"name" gorm:"index" `
	CreatedTime     int64          `json:"created_time" gorm:"bigint"`
	AccessedTime    int64          `json:"accessed_time" gorm:"bigint"`
	ExpiredTime     int64          `json:"expired_time" gorm:"bigint;default:-1"` // -1 means never expired
	RemainQuota     int            `json:"remain_quota" gorm:"default:0"`
	UnlimitedQuota  bool           `json:"unlimited_quota"`
	UsedQuota       int            `json:"used_quota" gorm:"default:0"` // used quota
	Group           string         `json:"group" gorm:"default:''"`
	CrossGroupRetry bool           `json:"cross_group_retry"` // 跨分组重试，仅auto分组有效
	DeletedAt       gorm.DeletedAt `gorm:"index"`
}

func (token *Token) Clean() {
	token.Key = ""
}

func (token *Token) NormalizeOwnership() {
	if token.CreatedByUserId == "" {
		token.CreatedByUserId = token.UserId
	}
	if token.AccountType == "" {
		token.AccountType = AccountTypePersonal
	}
	if token.AccountId == "" {
		if token.AccountType == AccountTypePersonal {
			token.AccountId = token.CreatedByUserId
		}
	}
	if token.UserId == "" {
		token.UserId = token.CreatedByUserId
	}
}

func (token *Token) SetAPIKey(key string) {
	token.Key = common.NormalizeAPIKey(key)
	token.APIKeyHash = common.APIKeyHash(token.Key)
	token.APIKeyPrefix, token.APIKeyLast4 = common.APIKeyDisplayParts(token.Key)
}

func (token *Token) GenerateAPIKey() (string, error) {
	key, err := common.GenerateAPIKey()
	if err != nil {
		return "", err
	}
	token.SetAPIKey(key)
	return key, nil
}

func (token *Token) GetMaskedKey() string {
	if token.Key != "" {
		return common.MaskAPIKey(token.Key)
	}
	return common.MaskAPIKeyFromParts(token.APIKeyPrefix, token.APIKeyLast4)
}

func GetAllUserTokens(userId string, startIdx int, num int) ([]*Token, error) {
	var tokens []*Token
	var err error
	err = DB.Where("account_type = ? AND account_id = ?", AccountTypePersonal, userId).Order("id desc").Limit(num).Offset(startIdx).Find(&tokens).Error
	return tokens, err
}

func GetAllAccountTokens(account AccountContext, startIdx int, num int) ([]*Token, error) {
	var tokens []*Token
	err := DB.Where("account_type = ? AND account_id = ?", account.Type, account.Id).Order("id desc").Limit(num).Offset(startIdx).Find(&tokens).Error
	return tokens, err
}

func GetVisibleAccountTokens(account AccountContext, actorUserId string, allowAll bool, startIdx int, num int) ([]*Token, error) {
	var tokens []*Token
	query := DB.Where("account_type = ? AND account_id = ?", account.Type, account.Id)
	if !allowAll {
		query = query.Where("created_by_user_id = ?", actorUserId)
	}
	err := query.Order("id desc").Limit(num).Offset(startIdx).Find(&tokens).Error
	return tokens, err
}

// sanitizeLikePattern 校验并清洗用户输入的 LIKE 搜索模式。
// 规则：
//  1. 转义 ! 和 _（使用 ! 作为 ESCAPE 字符，兼容 PostgreSQL）
//  2. 连续的 % 合并为单个 %
//  3. 最多允许 2 个 %
//  4. 含 % 时（模糊搜索），去掉 % 后关键词长度必须 >= 2
//  5. 不含 % 时按精确匹配
func sanitizeLikePattern(input string) (string, error) {
	// 1. 先转义 ESCAPE 字符 ! 自身，再转义 _
	//    使用 ! 而非 \ 作为 ESCAPE 字符，避免反斜杠的字符串转义问题
	input = strings.ReplaceAll(input, "!", "!!")
	input = strings.ReplaceAll(input, `_`, `!_`)

	// 2. 连续的 % 直接拒绝
	if strings.Contains(input, "%%") {
		return "", errors.New("搜索模式中不允许包含连续的 % 通配符")
	}

	// 3. 统计 % 数量，不得超过 2
	count := strings.Count(input, "%")
	if count > 2 {
		return "", errors.New("搜索模式中最多允许包含 2 个 % 通配符")
	}

	// 4. 含 % 时，去掉 % 后关键词长度必须 >= 2
	if count > 0 {
		stripped := strings.ReplaceAll(input, "%", "")
		if len(stripped) < 2 {
			return "", errors.New("使用模糊搜索时，关键词长度至少为 2 个字符")
		}
		return input, nil
	}

	// 5. 无 % 时，精确全匹配
	return input, nil
}

const searchHardLimit = 100

func SearchUserTokens(userId string, keyword string, token string, offset int, limit int) (tokens []*Token, total int64, err error) {
	// model 层强制截断
	if limit <= 0 || limit > searchHardLimit {
		limit = searchHardLimit
	}
	if offset < 0 {
		offset = 0
	}

	// 超量用户（令牌数超过上限）只允许精确搜索，禁止模糊搜索
	maxTokens := operation_setting.GetMaxUserTokens()
	hasFuzzy := strings.Contains(keyword, "%") || strings.Contains(token, "%")
	if hasFuzzy {
		count, err := CountUserTokens(userId)
		if err != nil {
			common.SysLog("failed to count user tokens: " + err.Error())
			return nil, 0, errors.New("获取令牌数量失败")
		}
		if int(count) > maxTokens {
			return nil, 0, errors.New("令牌数量超过上限，仅允许精确搜索，请勿使用 % 通配符")
		}
	}

	baseQuery := DB.Model(&Token{}).Where("account_type = ? AND account_id = ?", AccountTypePersonal, userId)

	// 非空才加 LIKE 条件，空则跳过（不过滤该字段）
	if keyword != "" {
		keywordPattern, err := sanitizeLikePattern(keyword)
		if err != nil {
			return nil, 0, err
		}
		baseQuery = baseQuery.Where("name LIKE ? ESCAPE '!'", keywordPattern)
	}
	if token != "" {
		tokenPattern, err := sanitizeLikePattern(token)
		if err != nil {
			return nil, 0, err
		}
		baseQuery = baseQuery.Where("api_key_prefix LIKE ? ESCAPE '!' OR api_key_last4 = ?", tokenPattern, strings.TrimLeft(token, "%"))
	}

	// 先查匹配总数（用于分页，受 maxTokens 上限保护，避免全表 COUNT）
	err = baseQuery.Limit(maxTokens).Count(&total).Error
	if err != nil {
		common.SysError("failed to count search tokens: " + err.Error())
		return nil, 0, errors.New("搜索令牌失败")
	}

	// 再分页查数据
	err = baseQuery.Order("id desc").Offset(offset).Limit(limit).Find(&tokens).Error
	if err != nil {
		common.SysError("failed to search tokens: " + err.Error())
		return nil, 0, errors.New("搜索令牌失败")
	}
	return tokens, total, nil
}

func ValidateUserToken(key string) (token *Token, err error) {
	key = common.NormalizeAPIKey(key)
	if key == "" {
		return nil, ErrTokenNotProvided
	}
	if !common.IsAPIKey(key) {
		return nil, ErrTokenInvalid
	}
	token, err = GetTokenByKey(key, false)
	if err == nil {
		if token.Status == common.TokenStatusExhausted ||
			token.Status == common.TokenStatusExpired ||
			token.Status != common.TokenStatusEnabled {
			return token, ErrTokenInvalid
		}
		if token.ExpiredTime != -1 && token.ExpiredTime < common.GetTimestamp() {
			if !common.RedisEnabled {
				token.Status = common.TokenStatusExpired
				err := token.SelectUpdate()
				if err != nil {
					common.SysLog("failed to update token status" + err.Error())
				}
			}
			return token, ErrTokenInvalid
		}
		if !token.UnlimitedQuota && token.RemainQuota <= 0 {
			if !common.RedisEnabled {
				token.Status = common.TokenStatusExhausted
				err := token.SelectUpdate()
				if err != nil {
					common.SysLog("failed to update token status" + err.Error())
				}
			}
			return token, ErrTokenInvalid
		}
		return token, nil
	}
	common.SysLog("ValidateUserToken: failed to get token: " + err.Error())
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrTokenInvalid
	}
	return nil, fmt.Errorf("%w: %v", ErrDatabase, err)
}

func GetTokenByIds(id string, userId string) (*Token, error) {
	if common.IsEmptyID(id) || common.IsEmptyID(userId) {
		return nil, errors.New("id 或 userId 为空！")
	}
	token := Token{Id: id, UserId: userId}
	var err error = nil
	err = DB.First(&token, "id = ? AND account_type = ? AND account_id = ?", id, AccountTypePersonal, userId).Error
	return &token, err
}

func GetTokenByIdForAccount(id string, account AccountContext) (*Token, error) {
	if common.IsEmptyID(id) || account.Id == "" {
		return nil, errors.New("id or account is empty")
	}
	token := Token{Id: id}
	err := DB.First(&token, "id = ? AND account_type = ? AND account_id = ?", id, account.Type, account.Id).Error
	return &token, err
}

func GetTokenById(id string) (*Token, error) {
	if common.IsEmptyID(id) {
		return nil, errors.New("id 为空！")
	}
	token := Token{Id: id}
	var err error = nil
	err = DB.First(&token, "id = ?", id).Error
	if shouldUpdateRedis(true, err) {
		gopool.Go(func() {
			if err := cacheSetToken(token); err != nil {
				common.SysLog("failed to update user status cache: " + err.Error())
			}
		})
	}
	return &token, err
}

func GetTokenByKey(key string, fromDB bool) (token *Token, err error) {
	key = common.NormalizeAPIKey(key)
	keyHash := common.APIKeyHash(key)
	defer func() {
		// Update Redis cache asynchronously on successful DB read
		if shouldUpdateRedis(fromDB, err) && token != nil {
			gopool.Go(func() {
				if err := cacheSetToken(*token); err != nil {
					common.SysLog("failed to update user status cache: " + err.Error())
				}
			})
		}
	}()
	if !fromDB && common.RedisEnabled {
		// Try Redis first
		token, err := cacheGetTokenByKey(key)
		if err == nil {
			return token, nil
		}
		// Don't return error - fall through to DB
	}
	fromDB = true
	err = DB.Where("api_key_hash = ?", keyHash).First(&token).Error
	return token, err
}

func GetTokenByHash(apiKeyHash string) (*Token, error) {
	apiKeyHash = strings.TrimSpace(apiKeyHash)
	if apiKeyHash == "" {
		return nil, ErrTokenNotProvided
	}
	token := &Token{}
	err := DB.Where("api_key_hash = ?", apiKeyHash).First(token).Error
	return token, err
}

func (token *Token) Insert() error {
	token.NormalizeOwnership()
	var err error
	err = DB.Create(token).Error
	return err
}

// Update Make sure your token's fields is completed, because this will update non-zero values
func (token *Token) Update() (err error) {
	defer func() {
		if shouldUpdateRedis(true, err) {
			gopool.Go(func() {
				err := cacheSetToken(*token)
				if err != nil {
					common.SysLog("failed to update token cache: " + err.Error())
				}
			})
		}
	}()
	err = DB.Model(token).Select("name", "status", "expired_time", "remain_quota", "unlimited_quota",
		"group", "cross_group_retry").Updates(token).Error
	return err
}

func (token *Token) SelectUpdate() (err error) {
	defer func() {
		if shouldUpdateRedis(true, err) {
			gopool.Go(func() {
				err := cacheSetToken(*token)
				if err != nil {
					common.SysLog("failed to update token cache: " + err.Error())
				}
			})
		}
	}()
	// This can update zero values
	return DB.Model(token).Select("accessed_time", "status").Updates(token).Error
}

func (token *Token) Delete() (err error) {
	defer func() {
		if shouldUpdateRedis(true, err) {
			gopool.Go(func() {
				err := cacheDeleteToken(token.APIKeyHash)
				if err != nil {
					common.SysLog("failed to delete token cache: " + err.Error())
				}
			})
		}
	}()
	err = DB.Delete(token).Error
	return err
}

func DeleteTokenById(id string, userId string) (err error) {
	// Why we need userId here? In case user want to delete other's token.
	if common.IsEmptyID(id) || common.IsEmptyID(userId) {
		return errors.New("id 或 userId 为空！")
	}
	token := Token{Id: id}
	err = DB.First(&token, "id = ? AND account_type = ? AND account_id = ?", id, AccountTypePersonal, userId).Error
	if err != nil {
		return err
	}
	return token.Delete()
}

func DeleteTokenByIdForAccount(id string, account AccountContext, actorUserId string, allowAll bool) (err error) {
	if common.IsEmptyID(id) || account.Id == "" {
		return errors.New("id or account is empty")
	}
	token := Token{Id: id}
	query := DB.Where("id = ? AND account_type = ? AND account_id = ?", id, account.Type, account.Id)
	if !allowAll {
		query = query.Where("created_by_user_id = ?", actorUserId)
	}
	if err = query.First(&token).Error; err != nil {
		return err
	}
	return token.Delete()
}

func IncreaseTokenQuota(tokenId string, apiKeyHash string, quota int) (err error) {
	if quota < 0 {
		return errors.New("quota 不能为负数！")
	}
	if common.RedisEnabled {
		gopool.Go(func() {
			err := cacheIncrTokenQuota(apiKeyHash, int64(quota))
			if err != nil {
				common.SysLog("failed to increase token quota: " + err.Error())
			}
		})
	}
	if common.BatchUpdateEnabled {
		addNewRecord(BatchUpdateTypeTokenQuota, tokenId, quota)
		return nil
	}
	return increaseTokenQuota(tokenId, quota)
}

func increaseTokenQuota(id string, quota int) (err error) {
	err = DB.Model(&Token{}).Where("id = ?", id).Updates(
		map[string]interface{}{
			"remain_quota":  gorm.Expr("remain_quota + ?", quota),
			"used_quota":    gorm.Expr("used_quota - ?", quota),
			"accessed_time": common.GetTimestamp(),
		},
	).Error
	return err
}

func DecreaseTokenQuota(id string, apiKeyHash string, quota int) (err error) {
	if quota < 0 {
		return errors.New("quota 不能为负数！")
	}
	if common.RedisEnabled {
		gopool.Go(func() {
			err := cacheDecrTokenQuota(apiKeyHash, int64(quota))
			if err != nil {
				common.SysLog("failed to decrease token quota: " + err.Error())
			}
		})
	}
	if common.BatchUpdateEnabled {
		addNewRecord(BatchUpdateTypeTokenQuota, id, -quota)
		return nil
	}
	return decreaseTokenQuota(id, quota)
}

func decreaseTokenQuota(id string, quota int) (err error) {
	err = DB.Model(&Token{}).Where("id = ?", id).Updates(
		map[string]interface{}{
			"remain_quota":  gorm.Expr("remain_quota - ?", quota),
			"used_quota":    gorm.Expr("used_quota + ?", quota),
			"accessed_time": common.GetTimestamp(),
		},
	).Error
	return err
}

// CountUserTokens returns total number of tokens for the given user, used for pagination
func CountUserTokens(userId string) (int64, error) {
	var total int64
	err := DB.Model(&Token{}).Where("account_type = ? AND account_id = ?", AccountTypePersonal, userId).Count(&total).Error
	return total, err
}

func CountAccountTokens(account AccountContext) (int64, error) {
	var total int64
	err := DB.Model(&Token{}).Where("account_type = ? AND account_id = ?", account.Type, account.Id).Count(&total).Error
	return total, err
}

func CountVisibleAccountTokens(account AccountContext, actorUserId string, allowAll bool) (int64, error) {
	var total int64
	query := DB.Model(&Token{}).Where("account_type = ? AND account_id = ?", account.Type, account.Id)
	if !allowAll {
		query = query.Where("created_by_user_id = ?", actorUserId)
	}
	err := query.Count(&total).Error
	return total, err
}

// BatchDeleteTokens 删除指定用户的一组令牌，返回成功删除数量
func BatchDeleteTokens(ids []string, userId string) (int, error) {
	if len(ids) == 0 {
		return 0, errors.New("ids 不能为空！")
	}

	tx := DB.Begin()

	var tokens []Token
	if err := tx.Where("account_type = ? AND account_id = ? AND id IN (?)", AccountTypePersonal, userId, ids).Find(&tokens).Error; err != nil {
		tx.Rollback()
		return 0, err
	}

	if err := tx.Where("account_type = ? AND account_id = ? AND id IN (?)", AccountTypePersonal, userId, ids).Delete(&Token{}).Error; err != nil {
		tx.Rollback()
		return 0, err
	}

	if err := tx.Commit().Error; err != nil {
		return 0, err
	}

	if common.RedisEnabled {
		gopool.Go(func() {
			for _, t := range tokens {
				_ = cacheDeleteToken(t.APIKeyHash)
			}
		})
	}

	return len(tokens), nil
}

func BatchDeleteAccountTokens(ids []string, account AccountContext, actorUserId string, allowAll bool) (int, error) {
	if len(ids) == 0 {
		return 0, errors.New("ids cannot be empty")
	}

	tx := DB.Begin()
	query := tx.Where("account_type = ? AND account_id = ? AND id IN (?)", account.Type, account.Id, ids)
	if !allowAll {
		query = query.Where("created_by_user_id = ?", actorUserId)
	}

	var tokens []Token
	if err := query.Find(&tokens).Error; err != nil {
		tx.Rollback()
		return 0, err
	}
	deleteQuery := tx.Where("account_type = ? AND account_id = ? AND id IN (?)", account.Type, account.Id, ids)
	if !allowAll {
		deleteQuery = deleteQuery.Where("created_by_user_id = ?", actorUserId)
	}
	if err := deleteQuery.Delete(&Token{}).Error; err != nil {
		tx.Rollback()
		return 0, err
	}
	if err := tx.Commit().Error; err != nil {
		return 0, err
	}
	if common.RedisEnabled {
		gopool.Go(func() {
			for _, t := range tokens {
				_ = cacheDeleteToken(t.APIKeyHash)
			}
		})
	}
	return len(tokens), nil
}

// InvalidateUserTokensCache 清理指定用户所有令牌在 Redis 中的缓存，
// 配合 InvalidateUserCache 使用，可在用户被禁用/删除时立即阻断其令牌的请求。
// 下一次请求将从数据库重新加载令牌及用户状态，从而立即识别出被禁用的用户。
func InvalidateUserTokensCache(userId string) error {
	if !common.RedisEnabled {
		return nil
	}
	if common.IsEmptyID(userId) {
		return errors.New("userId 无效")
	}
	var tokens []Token
	if err := DB.Unscoped().
		Select("id", "api_key_hash").
		Where("user_id = ?", userId).
		Find(&tokens).Error; err != nil {
		return err
	}
	var firstErr error
	for _, t := range tokens {
		if t.APIKeyHash == "" {
			continue
		}
		if err := cacheDeleteToken(t.APIKeyHash); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}
