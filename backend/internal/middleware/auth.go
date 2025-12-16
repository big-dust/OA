package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"oa-system/internal/model"
	"oa-system/pkg/jwt"
)

const (
	AuthorizationHeader = "Authorization"
	BearerPrefix        = "Bearer "
	ContextUserID       = "user_id"
	ContextUsername     = "username"
	ContextRole         = "role"
	ContextIsFirstLogin = "is_first_login"
)

// AuthMiddleware creates a JWT authentication middleware
func AuthMiddleware(jwtManager *jwt.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_TOKEN_MISSING",
				"message": "Authorization header is required",
			})
			c.Abort()
			return
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_TOKEN_INVALID",
				"message": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		claims, err := jwtManager.ValidateToken(tokenString)
		if err != nil {
			code := "AUTH_TOKEN_INVALID"
			message := "Invalid token"
			if err == jwt.ErrExpiredToken {
				code = "AUTH_TOKEN_EXPIRED"
				message = "Token has expired"
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    code,
				"message": message,
			})
			c.Abort()
			return
		}

		// Check if account is still active
		var employee model.Employee
		if err := model.GetDB().First(&employee, claims.UserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_USER_NOT_FOUND",
				"message": "User not found",
			})
			c.Abort()
			return
		}

		if !employee.IsActive {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_ACCOUNT_DISABLED",
				"message": "Account has been disabled",
			})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextUsername, claims.Username)
		c.Set(ContextRole, claims.Role)
		c.Set(ContextIsFirstLogin, employee.IsFirstLogin)

		c.Next()
	}
}

// RequirePasswordChange middleware ensures user has changed their initial password
func RequirePasswordChange() gin.HandlerFunc {
	return func(c *gin.Context) {
		isFirstLogin, exists := c.Get(ContextIsFirstLogin)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_CONTEXT_ERROR",
				"message": "Authentication context not found",
			})
			c.Abort()
			return
		}

		if isFirstLogin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "AUTH_FIRST_LOGIN_REQUIRED",
				"message": "Password change required before accessing this resource",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) uint {
	userID, _ := c.Get(ContextUserID)
	return userID.(uint)
}

// GetUsername extracts username from context
func GetUsername(c *gin.Context) string {
	username, _ := c.Get(ContextUsername)
	return username.(string)
}

// GetRole extracts role from context
func GetRole(c *gin.Context) string {
	role, _ := c.Get(ContextRole)
	return role.(string)
}

// GetIsFirstLogin extracts is_first_login from context
func GetIsFirstLogin(c *gin.Context) bool {
	isFirstLogin, _ := c.Get(ContextIsFirstLogin)
	return isFirstLogin.(bool)
}
