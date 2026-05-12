package common

import (
	"strings"
	"testing"
)

func TestNewTypedIDFormat(t *testing.T) {
	id, err := NewTypedID("usr", 12)
	if err != nil {
		t.Fatalf("NewTypedID returned error: %v", err)
	}
	if !strings.HasPrefix(id, "usr_") {
		t.Fatalf("id %q does not have expected prefix", id)
	}
	if len(strings.TrimPrefix(id, "usr_")) != 12 {
		t.Fatalf("id %q has unexpected key length", id)
	}
	if !IsTypedID(id, "usr") {
		t.Fatalf("id %q should validate as a usr typed id", id)
	}
}

func TestNewTypedIDRejectsInvalidPrefixAndLength(t *testing.T) {
	tests := []struct {
		name      string
		prefix    string
		keyLength int
	}{
		{name: "short prefix", prefix: "u", keyLength: 12},
		{name: "long prefix", prefix: "userxx", keyLength: 12},
		{name: "uppercase prefix", prefix: "Usr", keyLength: 12},
		{name: "short key", prefix: "usr", keyLength: 5},
		{name: "long key", prefix: "usr", keyLength: 25},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := NewTypedID(tt.prefix, tt.keyLength); err == nil {
				t.Fatalf("NewTypedID(%q, %d) should fail", tt.prefix, tt.keyLength)
			}
		})
	}
}

func TestNanoIDKeyAlphabet(t *testing.T) {
	key, err := NewNanoIDKey(24)
	if err != nil {
		t.Fatalf("NewNanoIDKey returned error: %v", err)
	}
	for _, ch := range key {
		if strings.ContainsRune("-_", ch) {
			t.Fatalf("key %q contains forbidden character %q", key, ch)
		}
		if !strings.ContainsRune(NanoIDAlphabet, ch) {
			t.Fatalf("key %q contains character outside alphabet: %q", key, ch)
		}
	}
}
