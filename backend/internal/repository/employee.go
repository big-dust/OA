package repository

import (
	"errors"

	"gorm.io/gorm"

	"oa-system/internal/model"
)

var (
	ErrEmployeeNotFound      = errors.New("employee not found")
	ErrEmployeeNoExists      = errors.New("employee number already exists")
	ErrUsernameExists        = errors.New("username already exists")
	ErrSupervisorNotFound    = errors.New("supervisor not found")
)

// EmployeeRepository handles employee data access
type EmployeeRepository struct {
	db *gorm.DB
}

// NewEmployeeRepository creates a new employee repository
func NewEmployeeRepository(db *gorm.DB) *EmployeeRepository {
	return &EmployeeRepository{db: db}
}

// Create creates a new employee
func (r *EmployeeRepository) Create(employee *model.Employee) error {
	return r.db.Create(employee).Error
}

// GetByID retrieves an employee by ID
func (r *EmployeeRepository) GetByID(id uint) (*model.Employee, error) {
	var employee model.Employee
	err := r.db.Preload("Supervisor").First(&employee, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}
	return &employee, nil
}

// GetByUsername retrieves an employee by username
func (r *EmployeeRepository) GetByUsername(username string) (*model.Employee, error) {
	var employee model.Employee
	err := r.db.Where("username = ?", username).First(&employee).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}
	return &employee, nil
}

// GetByEmployeeNo retrieves an employee by employee number
func (r *EmployeeRepository) GetByEmployeeNo(employeeNo string) (*model.Employee, error) {
	var employee model.Employee
	err := r.db.Where("employee_no = ?", employeeNo).First(&employee).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}
	return &employee, nil
}


// List retrieves all employees with optional filters
func (r *EmployeeRepository) List(filters map[string]interface{}) ([]model.Employee, error) {
	var employees []model.Employee
	query := r.db.Preload("Supervisor")
	
	if department, ok := filters["department"]; ok && department != "" {
		query = query.Where("department = ?", department)
	}
	if role, ok := filters["role"]; ok && role != "" {
		query = query.Where("role = ?", role)
	}
	if isActive, ok := filters["is_active"]; ok {
		query = query.Where("is_active = ?", isActive)
	}
	
	err := query.Order("id ASC").Find(&employees).Error
	return employees, err
}

// Update updates an employee's information
func (r *EmployeeRepository) Update(employee *model.Employee) error {
	return r.db.Save(employee).Error
}

// UpdateFields updates specific fields of an employee
func (r *EmployeeRepository) UpdateFields(id uint, fields map[string]interface{}) error {
	result := r.db.Model(&model.Employee{}).Where("id = ?", id).Updates(fields)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrEmployeeNotFound
	}
	return nil
}

// Delete soft deletes an employee
func (r *EmployeeRepository) Delete(id uint) error {
	result := r.db.Delete(&model.Employee{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrEmployeeNotFound
	}
	return nil
}

// ExistsByUsername checks if a username already exists
func (r *EmployeeRepository) ExistsByUsername(username string) (bool, error) {
	var count int64
	err := r.db.Model(&model.Employee{}).Where("username = ?", username).Count(&count).Error
	return count > 0, err
}

// ExistsByEmployeeNo checks if an employee number already exists
func (r *EmployeeRepository) ExistsByEmployeeNo(employeeNo string) (bool, error) {
	var count int64
	err := r.db.Model(&model.Employee{}).Where("employee_no = ?", employeeNo).Count(&count).Error
	return count > 0, err
}

// GetSubordinates retrieves all direct subordinates of a supervisor
func (r *EmployeeRepository) GetSubordinates(supervisorID uint) ([]model.Employee, error) {
	var employees []model.Employee
	err := r.db.Where("supervisor_id = ?", supervisorID).Find(&employees).Error
	return employees, err
}

// GetMaxEmployeeNo retrieves the maximum employee number for generating new ones
func (r *EmployeeRepository) GetMaxEmployeeNo() (string, error) {
	var employee model.Employee
	err := r.db.Order("employee_no DESC").First(&employee).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return employee.EmployeeNo, nil
}

// Count returns the total count of employees
func (r *EmployeeRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&model.Employee{}).Count(&count).Error
	return count, err
}
