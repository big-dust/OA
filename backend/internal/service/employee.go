package service

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/internal/repository"
	"oa-system/pkg/password"
)

var (
	ErrEmployeeNotFound      = errors.New("employee not found")
	ErrEmployeeNoExists      = errors.New("employee number already exists")
	ErrUsernameExists        = errors.New("username already exists")
	ErrSupervisorNotFound    = errors.New("supervisor not found")
	ErrInvalidRole           = errors.New("invalid role")
	ErrCannotModifySelf      = errors.New("cannot modify own account status")
	ErrCannotDisableSuperAdmin = errors.New("cannot disable super admin account")
)

// EmployeeService handles employee business logic
type EmployeeService struct {
	repo *repository.EmployeeRepository
	db   *gorm.DB
}

// NewEmployeeService creates a new employee service
func NewEmployeeService(db *gorm.DB) *EmployeeService {
	return &EmployeeService{
		repo: repository.NewEmployeeRepository(db),
		db:   db,
	}
}

// CreateEmployeeRequest represents a request to create an employee
type CreateEmployeeRequest struct {
	Name         string `json:"name" binding:"required"`
	Department   string `json:"department"`
	Position     string `json:"position"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	SupervisorID *uint  `json:"supervisor_id"`
	Role         string `json:"role"`
}

// CreateEmployeeResponse represents the response after creating an employee
type CreateEmployeeResponse struct {
	Employee        *model.Employee `json:"employee"`
	InitialPassword string          `json:"initial_password"`
}


// UpdateEmployeeRequest represents a request to update employee info (by employee themselves)
type UpdateEmployeeRequest struct {
	Phone string `json:"phone"`
	Email string `json:"email"`
}

// AdminUpdateEmployeeRequest represents a request to update employee info (by HR/Admin)
type AdminUpdateEmployeeRequest struct {
	Name         string `json:"name"`
	Department   string `json:"department"`
	Position     string `json:"position"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	SupervisorID *uint  `json:"supervisor_id"`
}

// UpdateRoleRequest represents a request to update employee role
type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// UpdateSupervisorRequest represents a request to update employee supervisor
type UpdateSupervisorRequest struct {
	SupervisorID *uint `json:"supervisor_id"`
}

// UpdateStatusRequest represents a request to enable/disable employee account
type UpdateStatusRequest struct {
	IsActive bool `json:"is_active"`
}

// validRoles contains all valid role values
var validRoles = map[string]bool{
	model.RoleSuperAdmin:  true,
	model.RoleHR:          true,
	model.RoleFinance:     true,
	model.RoleDeviceAdmin: true,
	model.RoleSupervisor:  true,
	model.RoleEmployee:    true,
}

// Create creates a new employee with auto-generated employee number and password
func (s *EmployeeService) Create(req *CreateEmployeeRequest) (*CreateEmployeeResponse, error) {
	// Validate role if provided
	role := model.RoleEmployee
	if req.Role != "" {
		if !validRoles[req.Role] {
			return nil, ErrInvalidRole
		}
		role = req.Role
	}

	// Validate supervisor if provided
	if req.SupervisorID != nil {
		_, err := s.repo.GetByID(*req.SupervisorID)
		if err != nil {
			if errors.Is(err, repository.ErrEmployeeNotFound) {
				return nil, ErrSupervisorNotFound
			}
			return nil, err
		}
	}

	// Generate unique employee number
	employeeNo, err := s.generateEmployeeNo()
	if err != nil {
		return nil, err
	}

	// Generate username from employee number
	username := strings.ToLower(employeeNo)

	// Generate random initial password
	initialPassword, err := password.GenerateRandom(8)
	if err != nil {
		return nil, err
	}

	// Hash the password
	hashedPassword, err := password.Hash(initialPassword)
	if err != nil {
		return nil, err
	}

	employee := &model.Employee{
		Username:     username,
		EmployeeNo:   employeeNo,
		Name:         req.Name,
		Department:   req.Department,
		Position:     req.Position,
		Phone:        req.Phone,
		Email:        req.Email,
		HireDate:     time.Now(),
		SupervisorID: req.SupervisorID,
		Role:         role,
		Password:     hashedPassword,
		IsFirstLogin: true,
		IsActive:     true,
	}

	if err := s.repo.Create(employee); err != nil {
		return nil, err
	}

	return &CreateEmployeeResponse{
		Employee:        employee,
		InitialPassword: initialPassword,
	}, nil
}


// generateEmployeeNo generates a unique employee number in format EMP + 5 digits
func (s *EmployeeService) generateEmployeeNo() (string, error) {
	maxNo, err := s.repo.GetMaxEmployeeNo()
	if err != nil {
		return "", err
	}

	var nextNum int
	if maxNo == "" {
		nextNum = 1
	} else {
		// Extract number from employee number (e.g., "EMP00001" -> 1)
		numStr := strings.TrimPrefix(maxNo, "EMP")
		num, err := strconv.Atoi(numStr)
		if err != nil {
			// If parsing fails, count employees and add 1
			count, err := s.repo.Count()
			if err != nil {
				return "", err
			}
			nextNum = int(count) + 1
		} else {
			nextNum = num + 1
		}
	}

	return fmt.Sprintf("EMP%05d", nextNum), nil
}

// GetByID retrieves an employee by ID
func (s *EmployeeService) GetByID(id uint) (*model.Employee, error) {
	employee, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}
	return employee, nil
}

// List retrieves all employees with optional filters
func (s *EmployeeService) List(filters map[string]interface{}) ([]model.Employee, error) {
	return s.repo.List(filters)
}

// Update updates an employee's personal information (limited fields for self-update)
// This enforces Property 3: System fields cannot be modified by the employee
func (s *EmployeeService) Update(id uint, req *UpdateEmployeeRequest) (*model.Employee, error) {
	employee, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}

	// Only allow updating phone and email (non-system fields)
	employee.Phone = req.Phone
	employee.Email = req.Email

	if err := s.repo.Update(employee); err != nil {
		return nil, err
	}

	return employee, nil
}

// AdminUpdate updates an employee's information (by HR/Admin)
func (s *EmployeeService) AdminUpdate(id uint, req *AdminUpdateEmployeeRequest) (*model.Employee, error) {
	employee, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}

	// Validate supervisor if provided
	if req.SupervisorID != nil {
		_, err := s.repo.GetByID(*req.SupervisorID)
		if err != nil {
			if errors.Is(err, repository.ErrEmployeeNotFound) {
				return nil, ErrSupervisorNotFound
			}
			return nil, err
		}
	}

	// Update allowed fields
	if req.Name != "" {
		employee.Name = req.Name
	}
	if req.Department != "" {
		employee.Department = req.Department
	}
	if req.Position != "" {
		employee.Position = req.Position
	}
	employee.Phone = req.Phone
	employee.Email = req.Email
	employee.SupervisorID = req.SupervisorID

	if err := s.repo.Update(employee); err != nil {
		return nil, err
	}

	return employee, nil
}


// UpdateRole updates an employee's role
func (s *EmployeeService) UpdateRole(id uint, req *UpdateRoleRequest) (*model.Employee, error) {
	if !validRoles[req.Role] {
		return nil, ErrInvalidRole
	}

	employee, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}

	employee.Role = req.Role

	if err := s.repo.Update(employee); err != nil {
		return nil, err
	}

	return employee, nil
}

// UpdateSupervisor updates an employee's supervisor
func (s *EmployeeService) UpdateSupervisor(id uint, req *UpdateSupervisorRequest) (*model.Employee, error) {
	employee, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}

	// Validate supervisor if provided
	if req.SupervisorID != nil {
		// Cannot set self as supervisor
		if *req.SupervisorID == id {
			return nil, errors.New("cannot set self as supervisor")
		}
		_, err := s.repo.GetByID(*req.SupervisorID)
		if err != nil {
			if errors.Is(err, repository.ErrEmployeeNotFound) {
				return nil, ErrSupervisorNotFound
			}
			return nil, err
		}
	}

	employee.SupervisorID = req.SupervisorID

	if err := s.repo.Update(employee); err != nil {
		return nil, err
	}

	return employee, nil
}

// UpdateStatus enables or disables an employee account
func (s *EmployeeService) UpdateStatus(id uint, currentUserID uint, req *UpdateStatusRequest) (*model.Employee, error) {
	// Cannot modify own account status
	if id == currentUserID {
		return nil, ErrCannotModifySelf
	}

	employee, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}

	// Cannot disable super admin account
	if employee.Role == model.RoleSuperAdmin && !req.IsActive {
		return nil, ErrCannotDisableSuperAdmin
	}

	employee.IsActive = req.IsActive

	if err := s.repo.Update(employee); err != nil {
		return nil, err
	}

	return employee, nil
}

// GetSubordinates retrieves all direct subordinates of a supervisor
func (s *EmployeeService) GetSubordinates(supervisorID uint) ([]model.Employee, error) {
	return s.repo.GetSubordinates(supervisorID)
}

// Delete soft deletes an employee
func (s *EmployeeService) Delete(id uint) error {
	err := s.repo.Delete(id)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return ErrEmployeeNotFound
		}
		return err
	}
	return nil
}
