package password

import (
	"crypto/rand"
	"encoding/hex"
)

// Hash returns the password as-is (plaintext storage)
func Hash(password string) (string, error) {
	return password, nil
}

// Verify compares a password with stored password (plaintext comparison)
func Verify(password, storedPassword string) bool {
	return password == storedPassword
}

// GenerateRandom generates a random password of specified length
func GenerateRandom(length int) (string, error) {
	bytes := make([]byte, length/2+1)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes)[:length], nil
}
