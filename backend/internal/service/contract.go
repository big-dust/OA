package service

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/internal/repository"
)

var (
	ErrContractNotFound         = errors.New("contract not found")
	ErrContractTemplateNotFound = errors.New("contract template not found")
	ErrContractAlreadySigned    = errors.New("contract already signed")
	ErrInvalidContractType      = errors.New("invalid contract type")
)

// ContractService handles contract business logic
type ContractService struct {
	repo         *repository.ContractRepository
	employeeRepo *repository.EmployeeRepository
	db           *gorm.DB
}

// NewContractService creates a new contract service
func NewContractService(db *gorm.DB) *ContractService {
	return &ContractService{
		repo:         repository.NewContractRepository(db),
		employeeRepo: repository.NewEmployeeRepository(db),
		db:           db,
	}
}

// CreateContractRequest represents a request to create a contract
type CreateContractRequest struct {
	EmployeeID uint   `json:"employee_id" binding:"required"`
	TemplateID uint   `json:"template_id" binding:"required"`
}

// validContractTypes contains all valid contract type values
var validContractTypes = map[string]bool{
	model.ContractTypeOnboarding:  true,
	model.ContractTypeOffboarding: true,
}


// ListTemplates retrieves all contract templates
func (s *ContractService) ListTemplates() ([]model.ContractTemplate, error) {
	return s.repo.ListTemplates()
}

// GetTemplateByID retrieves a contract template by ID
func (s *ContractService) GetTemplateByID(id uint) (*model.ContractTemplate, error) {
	template, err := s.repo.GetTemplateByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrContractTemplateNotFound) {
			return nil, ErrContractTemplateNotFound
		}
		return nil, err
	}
	return template, nil
}

// Create creates a new contract based on a template
// Requirements: 9.1 - HR creates contract for employee, system creates pending contract and notifies employee
func (s *ContractService) Create(req *CreateContractRequest) (*model.Contract, error) {
	// Validate employee exists
	employee, err := s.employeeRepo.GetByID(req.EmployeeID)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}

	// Validate template exists
	template, err := s.repo.GetTemplateByID(req.TemplateID)
	if err != nil {
		if errors.Is(err, repository.ErrContractTemplateNotFound) {
			return nil, ErrContractTemplateNotFound
		}
		return nil, err
	}

	// Generate contract content from template
	// Replace placeholders with employee information
	content := s.generateContractContent(template.Content, employee)

	contract := &model.Contract{
		EmployeeID: req.EmployeeID,
		TemplateID: req.TemplateID,
		Type:       template.Type,
		Content:    content,
		Status:     model.ContractStatusPending,
	}

	if err := s.repo.Create(contract); err != nil {
		return nil, err
	}

	// Reload contract with associations
	return s.repo.GetByID(contract.ID)
}

// generateContractContent generates contract content by replacing placeholders
func (s *ContractService) generateContractContent(templateContent string, employee *model.Employee) string {
	content := templateContent
	
	// Replace common placeholders
	content = strings.ReplaceAll(content, "{{employee_name}}", employee.Name)
	content = strings.ReplaceAll(content, "{{employee_no}}", employee.EmployeeNo)
	content = strings.ReplaceAll(content, "{{department}}", employee.Department)
	content = strings.ReplaceAll(content, "{{position}}", employee.Position)
	content = strings.ReplaceAll(content, "{{hire_date}}", employee.HireDate.Format("2006-01-02"))
	content = strings.ReplaceAll(content, "{{current_date}}", time.Now().Format("2006-01-02"))
	
	return content
}


// GetByID retrieves a contract by ID
func (s *ContractService) GetByID(id uint) (*model.Contract, error) {
	contract, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrContractNotFound) {
			return nil, ErrContractNotFound
		}
		return nil, err
	}
	return contract, nil
}

// List retrieves all contracts with optional filters
// Requirements: 9.4 - HR can view all contracts
func (s *ContractService) List(filters map[string]interface{}) ([]model.Contract, error) {
	return s.repo.List(filters)
}

// GetByEmployeeID retrieves all contracts for a specific employee
// Requirements: 9.5 - Employee can view their own contracts
func (s *ContractService) GetByEmployeeID(employeeID uint) ([]model.Contract, error) {
	return s.repo.GetByEmployeeID(employeeID)
}

// Sign signs a contract
// Requirements: 9.2, 9.3 - Employee receives notification and can sign, system updates status and records timestamp
func (s *ContractService) Sign(id uint, employeeID uint) (*model.Contract, error) {
	contract, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrContractNotFound) {
			return nil, ErrContractNotFound
		}
		return nil, err
	}

	// Verify the contract belongs to the employee
	if contract.EmployeeID != employeeID {
		return nil, ErrContractNotFound
	}

	// Check if contract is already signed
	if contract.Status == model.ContractStatusSigned {
		return nil, ErrContractAlreadySigned
	}

	// Update contract status
	now := time.Now()
	contract.Status = model.ContractStatusSigned
	contract.SignedAt = &now

	if err := s.repo.Update(contract); err != nil {
		return nil, err
	}

	return contract, nil
}

// Delete soft deletes a contract
func (s *ContractService) Delete(id uint) error {
	err := s.repo.Delete(id)
	if err != nil {
		if errors.Is(err, repository.ErrContractNotFound) {
			return ErrContractNotFound
		}
		return err
	}
	return nil
}
