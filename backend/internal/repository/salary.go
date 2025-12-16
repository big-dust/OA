package repository

import (
	"errors"

	"gorm.io/gorm"

	"oa-system/internal/model"
)

var (
	ErrSalaryNotFound  = errors.New("salary record not found")
	ErrSalaryDuplicate = errors.New("salary record already exists for this employee and month")
)

// SalaryRepository handles salary data access
type SalaryRepository struct {
	db *gorm.DB
}

// NewSalaryRepository creates a new salary repository
func NewSalaryRepository(db *gorm.DB) *SalaryRepository {
	return &SalaryRepository{db: db}
}

// Create creates a new salary record
func (r *SalaryRepository) Create(salary *model.Salary) error {
	return r.db.Create(salary).Error
}

// GetByID retrieves a salary record by ID
func (r *SalaryRepository) GetByID(id uint) (*model.Salary, error) {
	var salary model.Salary
	err := r.db.Preload("Employee").First(&salary, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalaryNotFound
		}
		return nil, err
	}
	return &salary, nil
}

// GetByEmployeeAndMonth retrieves a salary record by employee ID and month
func (r *SalaryRepository) GetByEmployeeAndMonth(employeeID uint, month string) (*model.Salary, error) {
	var salary model.Salary
	err := r.db.Where("employee_id = ? AND month = ?", employeeID, month).First(&salary).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalaryNotFound
		}
		return nil, err
	}
	return &salary, nil
}


// ExistsByEmployeeAndMonth checks if a salary record exists for the given employee and month
func (r *SalaryRepository) ExistsByEmployeeAndMonth(employeeID uint, month string) (bool, error) {
	var count int64
	err := r.db.Model(&model.Salary{}).
		Where("employee_id = ? AND month = ?", employeeID, month).
		Count(&count).Error
	return count > 0, err
}

// ListByEmployeeID retrieves all salary records for an employee, ordered by month descending
// This implements Property 5: Salary records should be ordered by month descending
func (r *SalaryRepository) ListByEmployeeID(employeeID uint) ([]model.Salary, error) {
	var salaries []model.Salary
	err := r.db.Where("employee_id = ?", employeeID).
		Order("month DESC").
		Find(&salaries).Error
	return salaries, err
}

// List retrieves all salary records with optional filters
func (r *SalaryRepository) List(filters map[string]interface{}) ([]model.Salary, error) {
	var salaries []model.Salary
	query := r.db.Preload("Employee")

	if employeeID, ok := filters["employee_id"]; ok && employeeID != nil {
		query = query.Where("employee_id = ?", employeeID)
	}
	if month, ok := filters["month"]; ok && month != "" {
		query = query.Where("month = ?", month)
	}

	err := query.Order("month DESC, employee_id ASC").Find(&salaries).Error
	return salaries, err
}

// Update updates a salary record
func (r *SalaryRepository) Update(salary *model.Salary) error {
	return r.db.Save(salary).Error
}

// Delete soft deletes a salary record
func (r *SalaryRepository) Delete(id uint) error {
	result := r.db.Delete(&model.Salary{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrSalaryNotFound
	}
	return nil
}
