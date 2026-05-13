package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

const (
	AccountTypePersonal = "personal"
	AccountTypeTeam     = "team"
)

type AccountContext struct {
	Type string `json:"type"`
	Id   string `json:"id"`
}

func PersonalAccountContext(userId string) AccountContext {
	return AccountContext{Type: AccountTypePersonal, Id: strings.TrimSpace(userId)}
}

func TeamAccountContext(teamId string) AccountContext {
	return AccountContext{Type: AccountTypeTeam, Id: strings.TrimSpace(teamId)}
}

func NormalizeAccountContext(accountType string, accountId string) (AccountContext, error) {
	ctx := AccountContext{
		Type: strings.TrimSpace(accountType),
		Id:   strings.TrimSpace(accountId),
	}
	if ctx.Type == "" {
		ctx.Type = AccountTypePersonal
	}
	if ctx.Id == "" {
		return AccountContext{}, errors.New("account id is required")
	}
	switch ctx.Type {
	case AccountTypePersonal:
		if !common.IsTypedID(ctx.Id, "usr") {
			return AccountContext{}, errors.New("personal account id must be a user id")
		}
	case AccountTypeTeam:
		if !common.IsTypedID(ctx.Id, "team") {
			return AccountContext{}, errors.New("team account id must be a team id")
		}
	default:
		return AccountContext{}, errors.New("unsupported account type")
	}
	return ctx, nil
}

func (ctx AccountContext) IsTeam() bool {
	return ctx.Type == AccountTypeTeam
}

func (ctx AccountContext) IsPersonal() bool {
	return ctx.Type == AccountTypePersonal
}

func (ctx AccountContext) Validate() error {
	_, err := NormalizeAccountContext(ctx.Type, ctx.Id)
	return err
}
