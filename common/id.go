package common

import (
	crand "crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
)

const (
	NanoIDAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	MinIDKeyLength = 6
	MaxIDKeyLength = 24
)

var nanoIDAlphabetSize = big.NewInt(int64(len(NanoIDAlphabet)))

func NewNanoIDKey(length int) (string, error) {
	if length < MinIDKeyLength || length > MaxIDKeyLength {
		return "", fmt.Errorf("nanoid key length must be between %d and %d", MinIDKeyLength, MaxIDKeyLength)
	}
	b := make([]byte, length)
	for i := range b {
		n, err := crand.Int(crand.Reader, nanoIDAlphabetSize)
		if err != nil {
			return "", err
		}
		b[i] = NanoIDAlphabet[n.Int64()]
	}
	return string(b), nil
}

func NewTypedID(prefix string, keyLength int) (string, error) {
	prefix = strings.TrimSpace(prefix)
	if len(prefix) < 2 || len(prefix) > 5 {
		return "", errors.New("id prefix must be 2 to 5 characters")
	}
	for _, ch := range prefix {
		if ch < 'a' || ch > 'z' {
			return "", errors.New("id prefix must use lowercase a-z")
		}
	}
	key, err := NewNanoIDKey(keyLength)
	if err != nil {
		return "", err
	}
	return prefix + "_" + key, nil
}

func MustNewTypedID(prefix string, keyLength int) string {
	id, err := NewTypedID(prefix, keyLength)
	if err != nil {
		panic(err)
	}
	return id
}

func MustNewNanoIDKey(length int) string {
	key, err := NewNanoIDKey(length)
	if err != nil {
		panic(err)
	}
	return key
}

func IsTypedID(id string, prefix string) bool {
	id = strings.TrimSpace(id)
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return false
	}
	head := prefix + "_"
	if !strings.HasPrefix(id, head) {
		return false
	}
	key := id[len(head):]
	if len(key) < MinIDKeyLength || len(key) > MaxIDKeyLength {
		return false
	}
	for _, ch := range key {
		if !strings.ContainsRune(NanoIDAlphabet, ch) {
			return false
		}
	}
	return true
}

func IsEmptyID(id string) bool {
	return strings.TrimSpace(id) == ""
}

func NewGeneralID() string {
	return MustNewTypedID("gen", 16)
}

func NewRequestID() string {
	return MustNewTypedID("req", 16)
}
