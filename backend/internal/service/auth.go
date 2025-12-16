package service

import (
	"errors"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/pkg/jwt"
	"oa-system/pkg/password"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrAccountDisabled    = errors.New("account has been disabled")
	ErrUserNotFound       = errors.New("user not found")
	ErrPasswordMismatch   = errors.New("current password is incorrect")
)

// AuthService handles authentication business logic
type AuthService struct {
	db         *gorm.DB
	jwtManager *jwt.JWTManager
}

// NewAuthService creates a new authentication service
func NewAuthService(db *gorm.DB, jwtManager *jwt.JWTManager) *AuthService {
	return &AuthService{
		db:         db,
		jwtManager: jwtManager,
	}
}

// LoginRequest represents a login request
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Token    string          `json:"token"`
	Employee *model.Employee `json:"employee"`
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// Login authenticates a user and returns a JWT token
func (s *AuthService) Login(req *LoginRequest) (*LoginResponse, error) {
	var employee model.Employee
	if err := s.db.Where("username = ?", req.Username).First(&employee).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	// Check if account is active
	if !employee.IsActive {
		return nil, ErrAccountDisabled
	}

	// Verify password
	if !password.Verify(req.Password, employee.Password) {
		return nil, ErrInvalidCredentials
	}

	// Generate JWT token
	token, err := s.jwtManager.GenerateToken(
		employee.ID,
		employee.Username,
		employee.Role,
		employee.IsFirstLogin,
	)
	if err != nil {
		return nil, err
	}

	// Clear password before returning
	employee.Password = ""

	return &LoginResponse{
		Token:    token,
		Employee: &employee,
	}, nil
}

// ChangePassword changes a user's password
func (s *AuthService) ChangePassword(userID uint, req *ChangePasswordRequest) error {
	var employee model.Employee
	if err := s.db.First(&employee, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	// Verify current password
	if !password.Verify(req.OldPassword, employee.Password) {
		return ErrPasswordMismatch
	}

	// Hash new password
	hashedPassword, err := password.Hash(req.NewPassword)
	if err != nil {
		return err
	}

	// Update password and mark first login as complete
	return s.db.Model(&employee).Updates(map[string]interface{}{
		"password":       hashedPassword,
		"is_first_login": false,
	}).Error
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(userID uint) (*model.Employee, error) {
	var employee model.Employee
	if err := s.db.First(&employee, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &employee, nil
}
