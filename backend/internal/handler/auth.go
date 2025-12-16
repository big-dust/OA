package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"oa-system/internal/middleware"
	"oa-system/internal/service"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	authService *service.AuthService
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Login handles user login
// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	resp, err := h.authService.Login(&req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_INVALID_CREDENTIALS",
				"message": "Invalid username or password",
			})
		case errors.Is(err, service.ErrAccountDisabled):
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_ACCOUNT_DISABLED",
				"message": "Account has been disabled",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "An internal error occurred",
			})
		}
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ChangePassword handles password change
// POST /api/auth/change-password
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req service.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	userID := middleware.GetUserID(c)
	err := h.authService.ChangePassword(userID, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "USER_NOT_FOUND",
				"message": "User not found",
			})
		case errors.Is(err, service.ErrPasswordMismatch):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "AUTH_PASSWORD_INVALID",
				"message": "Current password is incorrect",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "An internal error occurred",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password changed successfully",
	})
}

// GetCurrentUser returns the current authenticated user's info
// GET /api/auth/me
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID := middleware.GetUserID(c)
	employee, err := h.authService.GetUserByID(userID)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "USER_NOT_FOUND",
				"message": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "An internal error occurred",
		})
		return
	}

	c.JSON(http.StatusOK, employee)
}
