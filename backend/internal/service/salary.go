package service

import (
	"errors"
	"regexp"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/internal/repository"
)

var (
	ErrSalaryNotFound     = errors.New("salary record not found")
	ErrSalaryDuplicate    = errors.New("salary record already exists for this employee and month")
	ErrInvalidMonth       = errors.New("invalid month format, expected YYYY-MM")
	ErrInvalidSalaryData  = errors.New("invalid salary data")
)

// SalaryService handles salary business logic
type SalaryService struct {
	repo         *repository.SalaryRepository
	employeeRepo *repository.EmployeeRepository
	db           *gorm.DB
}

// NewSalaryService creates a new salary service
func NewSalaryService(db *gorm.DB) *SalaryService {
	return &SalaryService{
		repo:         repository.NewSalaryRepository(db),
		employeeRepo: repository.NewEmployeeRepository(db),
		db:           db,
	}
}

// CreateSalaryRequest represents a request to create a salary record
type CreateSalaryRequest struct {
	EmployeeID uint    `json:"employee_id" binding:"required"`
	Month      string  `json:"month" binding:"required"`
	BaseSalary float64 `json:"base_salary" binding:"required"`
	Bonus      float64 `json:"bonus"`
	Deduction  float64 `json:"deduction"`
}

// monthRegex validates YYYY-MM format
var monthRegex = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

// validateMonth validates the month format (YYYY-MM)
func validateMonth(month string) bool {
	return monthRegex.MatchString(month)
}


// Create creates a new salary record
// Implements Property 15: Salary record uniqueness - only one record per employee per month
func (s *SalaryService) Create(req *CreateSalaryRequest) (*model.Salary, error) {
	// Validate month format
	if !validateMonth(req.Month) {
		return nil, ErrInvalidMonth
	}

	// Validate salary data
	if req.BaseSalary < 0 || req.Bonus < 0 || req.Deduction < 0 {
		return nil, ErrInvalidSalaryData
	}

	// Check if employee exists
	_, err := s.employeeRepo.GetByID(req.EmployeeID)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}

	// Check for duplicate record (Property 15: Salary record uniqueness)
	exists, err := s.repo.ExistsByEmployeeAndMonth(req.EmployeeID, req.Month)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrSalaryDuplicate
	}

	// Calculate net salary
	netSalary := req.BaseSalary + req.Bonus - req.Deduction

	salary := &model.Salary{
		EmployeeID: req.EmployeeID,
		Month:      req.Month,
		BaseSalary: req.BaseSalary,
		Bonus:      req.Bonus,
		Deduction:  req.Deduction,
		NetSalary:  netSalary,
	}

	if err := s.repo.Create(salary); err != nil {
		return nil, err
	}

	return salary, nil
}

// GetByID retrieves a salary record by ID
func (s *SalaryService) GetByID(id uint) (*model.Salary, error) {
	salary, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrSalaryNotFound) {
			return nil, ErrSalaryNotFound
		}
		return nil, err
	}
	return salary, nil
}

// GetByIDForEmployee retrieves a salary record by ID, ensuring it belongs to the employee
// Implements Property 4: Salary record data isolation
func (s *SalaryService) GetByIDForEmployee(id uint, employeeID uint) (*model.Salary, error) {
	salary, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrSalaryNotFound) {
			return nil, ErrSalaryNotFound
		}
		return nil, err
	}

	// Property 4: Data isolation - only return if it belongs to the employee
	if salary.EmployeeID != employeeID {
		return nil, ErrSalaryNotFound
	}

	return salary, nil
}


// ListByEmployeeID retrieves all salary records for an employee
// Implements Property 4: Data isolation - only returns records belonging to the employee
// Implements Property 5: Records are ordered by month descending
func (s *SalaryService) ListByEmployeeID(employeeID uint) ([]model.Salary, error) {
	return s.repo.ListByEmployeeID(employeeID)
}

// List retrieves all salary records with optional filters (for finance role)
func (s *SalaryService) List(filters map[string]interface{}) ([]model.Salary, error) {
	return s.repo.List(filters)
}

// Delete soft deletes a salary record
func (s *SalaryService) Delete(id uint) error {
	err := s.repo.Delete(id)
	if err != nil {
		if errors.Is(err, repository.ErrSalaryNotFound) {
			return ErrSalaryNotFound
		}
		return err
	}
	return nil
}
