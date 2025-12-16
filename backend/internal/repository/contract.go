package repository

import (
	"errors"

	"gorm.io/gorm"

	"oa-system/internal/model"
)

var (
	ErrContractNotFound         = errors.New("contract not found")
	ErrContractTemplateNotFound = errors.New("contract template not found")
)

// ContractRepository handles contract data access
type ContractRepository struct {
	db *gorm.DB
}

// NewContractRepository creates a new contract repository
func NewContractRepository(db *gorm.DB) *ContractRepository {
	return &ContractRepository{db: db}
}

// CreateTemplate creates a new contract template
func (r *ContractRepository) CreateTemplate(template *model.ContractTemplate) error {
	return r.db.Create(template).Error
}

// GetTemplateByID retrieves a contract template by ID
func (r *ContractRepository) GetTemplateByID(id uint) (*model.ContractTemplate, error) {
	var template model.ContractTemplate
	err := r.db.First(&template, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrContractTemplateNotFound
		}
		return nil, err
	}
	return &template, nil
}

// GetTemplateByType retrieves a contract template by type
func (r *ContractRepository) GetTemplateByType(contractType string) (*model.ContractTemplate, error) {
	var template model.ContractTemplate
	err := r.db.Where("type = ?", contractType).First(&template).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrContractTemplateNotFound
		}
		return nil, err
	}
	return &template, nil
}


// ListTemplates retrieves all contract templates
func (r *ContractRepository) ListTemplates() ([]model.ContractTemplate, error) {
	var templates []model.ContractTemplate
	err := r.db.Order("id ASC").Find(&templates).Error
	return templates, err
}

// UpdateTemplate updates a contract template
func (r *ContractRepository) UpdateTemplate(template *model.ContractTemplate) error {
	return r.db.Save(template).Error
}

// DeleteTemplate deletes a contract template
func (r *ContractRepository) DeleteTemplate(id uint) error {
	result := r.db.Delete(&model.ContractTemplate{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrContractTemplateNotFound
	}
	return nil
}

// Create creates a new contract
func (r *ContractRepository) Create(contract *model.Contract) error {
	return r.db.Create(contract).Error
}

// GetByID retrieves a contract by ID
func (r *ContractRepository) GetByID(id uint) (*model.Contract, error) {
	var contract model.Contract
	err := r.db.Preload("Employee").Preload("Template").First(&contract, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrContractNotFound
		}
		return nil, err
	}
	return &contract, nil
}

// List retrieves all contracts with optional filters
func (r *ContractRepository) List(filters map[string]interface{}) ([]model.Contract, error) {
	var contracts []model.Contract
	query := r.db.Preload("Employee").Preload("Template")

	if employeeID, ok := filters["employee_id"]; ok {
		query = query.Where("employee_id = ?", employeeID)
	}
	if contractType, ok := filters["type"]; ok && contractType != "" {
		query = query.Where("type = ?", contractType)
	}
	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("status = ?", status)
	}

	err := query.Order("created_at DESC").Find(&contracts).Error
	return contracts, err
}

// GetByEmployeeID retrieves all contracts for a specific employee
func (r *ContractRepository) GetByEmployeeID(employeeID uint) ([]model.Contract, error) {
	var contracts []model.Contract
	err := r.db.Preload("Employee").Preload("Template").
		Where("employee_id = ?", employeeID).
		Order("created_at DESC").
		Find(&contracts).Error
	return contracts, err
}

// Update updates a contract
func (r *ContractRepository) Update(contract *model.Contract) error {
	return r.db.Save(contract).Error
}

// Delete soft deletes a contract
func (r *ContractRepository) Delete(id uint) error {
	result := r.db.Delete(&model.Contract{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrContractNotFound
	}
	return nil
}
