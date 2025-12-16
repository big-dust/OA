package repository

import (
	"errors"

	"gorm.io/gorm"

	"oa-system/internal/model"
)

var (
	ErrLeaveRequestNotFound = errors.New("leave request not found")
)

// LeaveRepository handles leave request data access
type LeaveRepository struct {
	db *gorm.DB
}

// NewLeaveRepository creates a new leave repository
func NewLeaveRepository(db *gorm.DB) *LeaveRepository {
	return &LeaveRepository{db: db}
}

// Create creates a new leave request
func (r *LeaveRepository) Create(leave *model.LeaveRequest) error {
	return r.db.Create(leave).Error
}

// GetByID retrieves a leave request by ID
func (r *LeaveRepository) GetByID(id uint) (*model.LeaveRequest, error) {
	var leave model.LeaveRequest
	err := r.db.Preload("Employee").First(&leave, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLeaveRequestNotFound
		}
		return nil, err
	}
	return &leave, nil
}

// GetByEmployeeID retrieves all leave requests for an employee
func (r *LeaveRepository) GetByEmployeeID(employeeID uint) ([]model.LeaveRequest, error) {
	var leaves []model.LeaveRequest
	err := r.db.Where("employee_id = ?", employeeID).
		Order("created_at DESC").
		Find(&leaves).Error
	return leaves, err
}


// GetPendingBySubordinates retrieves all pending leave requests from subordinates
// Implements Property 9: 主管只能查看下属请假
func (r *LeaveRepository) GetPendingBySubordinates(subordinateIDs []uint) ([]model.LeaveRequest, error) {
	var leaves []model.LeaveRequest
	if len(subordinateIDs) == 0 {
		return leaves, nil
	}
	err := r.db.Preload("Employee").
		Where("employee_id IN ? AND status = ?", subordinateIDs, model.LeaveStatusPending).
		Order("created_at DESC").
		Find(&leaves).Error
	return leaves, err
}

// Update updates a leave request
func (r *LeaveRepository) Update(leave *model.LeaveRequest) error {
	return r.db.Save(leave).Error
}

// UpdateStatus updates the status of a leave request
func (r *LeaveRepository) UpdateStatus(id uint, status string, rejectReason string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if rejectReason != "" {
		updates["reject_reason"] = rejectReason
	}
	result := r.db.Model(&model.LeaveRequest{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrLeaveRequestNotFound
	}
	return nil
}

// Delete soft deletes a leave request
func (r *LeaveRepository) Delete(id uint) error {
	result := r.db.Delete(&model.LeaveRequest{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrLeaveRequestNotFound
	}
	return nil
}

// GetByEmployeeIDWithStatus retrieves leave requests for an employee with specific status
func (r *LeaveRepository) GetByEmployeeIDWithStatus(employeeID uint, status string) ([]model.LeaveRequest, error) {
	var leaves []model.LeaveRequest
	err := r.db.Where("employee_id = ? AND status = ?", employeeID, status).
		Order("created_at DESC").
		Find(&leaves).Error
	return leaves, err
}

// List retrieves all leave requests with optional filters
func (r *LeaveRepository) List(filters map[string]interface{}) ([]model.LeaveRequest, error) {
	var leaves []model.LeaveRequest
	query := r.db.Preload("Employee")

	if employeeID, ok := filters["employee_id"]; ok {
		query = query.Where("employee_id = ?", employeeID)
	}
	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if leaveType, ok := filters["leave_type"]; ok && leaveType != "" {
		query = query.Where("leave_type = ?", leaveType)
	}

	err := query.Order("created_at DESC").Find(&leaves).Error
	return leaves, err
}
