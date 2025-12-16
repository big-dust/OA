package repository

import (
	"errors"

	"gorm.io/gorm"

	"oa-system/internal/model"
)

var (
	ErrDeviceNotFound        = errors.New("device not found")
	ErrDeviceRequestNotFound = errors.New("device request not found")
)

// DeviceRepository handles device data access
type DeviceRepository struct {
	db *gorm.DB
}

// NewDeviceRepository creates a new device repository
func NewDeviceRepository(db *gorm.DB) *DeviceRepository {
	return &DeviceRepository{db: db}
}

// Create creates a new device
func (r *DeviceRepository) Create(device *model.Device) error {
	return r.db.Create(device).Error
}

// GetByID retrieves a device by ID
func (r *DeviceRepository) GetByID(id uint) (*model.Device, error) {
	var device model.Device
	err := r.db.First(&device, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeviceNotFound
		}
		return nil, err
	}
	return &device, nil
}

// GetAll retrieves all devices
func (r *DeviceRepository) GetAll() ([]model.Device, error) {
	var devices []model.Device
	err := r.db.Order("created_at DESC").Find(&devices).Error
	return devices, err
}


// GetAvailable retrieves all devices with available quantity > 0
// Implements Requirement 7.1: Employee views available devices
func (r *DeviceRepository) GetAvailable() ([]model.Device, error) {
	var devices []model.Device
	err := r.db.Where("available_quantity > 0").Order("created_at DESC").Find(&devices).Error
	return devices, err
}

// Update updates a device
func (r *DeviceRepository) Update(device *model.Device) error {
	return r.db.Save(device).Error
}

// Delete soft deletes a device
func (r *DeviceRepository) Delete(id uint) error {
	result := r.db.Delete(&model.Device{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrDeviceNotFound
	}
	return nil
}

// UpdateAvailableQuantity updates the available quantity of a device
func (r *DeviceRepository) UpdateAvailableQuantity(id uint, delta int) error {
	result := r.db.Model(&model.Device{}).
		Where("id = ?", id).
		Update("available_quantity", gorm.Expr("available_quantity + ?", delta))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrDeviceNotFound
	}
	return nil
}

// DeviceRequestRepository handles device request data access
type DeviceRequestRepository struct {
	db *gorm.DB
}

// NewDeviceRequestRepository creates a new device request repository
func NewDeviceRequestRepository(db *gorm.DB) *DeviceRequestRepository {
	return &DeviceRequestRepository{db: db}
}

// Create creates a new device request
func (r *DeviceRequestRepository) Create(request *model.DeviceRequest) error {
	return r.db.Create(request).Error
}

// GetByID retrieves a device request by ID
func (r *DeviceRequestRepository) GetByID(id uint) (*model.DeviceRequest, error) {
	var request model.DeviceRequest
	err := r.db.Preload("Employee").Preload("Device").First(&request, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}
	return &request, nil
}


// GetByEmployeeID retrieves all device requests for an employee
// Implements Requirement 7.8: Employee views their device requests
func (r *DeviceRequestRepository) GetByEmployeeID(employeeID uint) ([]model.DeviceRequest, error) {
	var requests []model.DeviceRequest
	err := r.db.Preload("Device").
		Where("employee_id = ?", employeeID).
		Order("created_at DESC").
		Find(&requests).Error
	return requests, err
}

// GetPending retrieves all pending device requests
// Implements Requirement 7.2: Device admin views pending requests
func (r *DeviceRequestRepository) GetPending() ([]model.DeviceRequest, error) {
	var requests []model.DeviceRequest
	err := r.db.Preload("Employee").Preload("Device").
		Where("status = ?", model.DeviceRequestStatusPending).
		Order("created_at DESC").
		Find(&requests).Error
	return requests, err
}

// GetReturnPending retrieves all return pending device requests
// Implements Requirement 7.6: Device admin views return pending requests
func (r *DeviceRequestRepository) GetReturnPending() ([]model.DeviceRequest, error) {
	var requests []model.DeviceRequest
	err := r.db.Preload("Employee").Preload("Device").
		Where("status = ?", model.DeviceRequestStatusReturnPending).
		Order("created_at DESC").
		Find(&requests).Error
	return requests, err
}

// Update updates a device request
func (r *DeviceRequestRepository) Update(request *model.DeviceRequest) error {
	return r.db.Save(request).Error
}

// UpdateStatus updates the status of a device request
func (r *DeviceRequestRepository) UpdateStatus(id uint, status string, rejectReason string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if rejectReason != "" {
		updates["reject_reason"] = rejectReason
	}
	result := r.db.Model(&model.DeviceRequest{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrDeviceRequestNotFound
	}
	return nil
}

// CountCollectedByDeviceID counts the number of collected (not returned) requests for a device
// Used for Property 10: 设备可用数量一致性
func (r *DeviceRequestRepository) CountCollectedByDeviceID(deviceID uint) (int64, error) {
	var count int64
	err := r.db.Model(&model.DeviceRequest{}).
		Where("device_id = ? AND status IN ?", deviceID, []string{
			model.DeviceRequestStatusCollected,
			model.DeviceRequestStatusReturnPending,
		}).
		Count(&count).Error
	return count, err
}

// List retrieves all device requests with optional filters
func (r *DeviceRequestRepository) List(filters map[string]interface{}) ([]model.DeviceRequest, error) {
	var requests []model.DeviceRequest
	query := r.db.Preload("Employee").Preload("Device")

	if employeeID, ok := filters["employee_id"]; ok {
		query = query.Where("employee_id = ?", employeeID)
	}
	if deviceID, ok := filters["device_id"]; ok {
		query = query.Where("device_id = ?", deviceID)
	}
	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("status = ?", status)
	}

	err := query.Order("created_at DESC").Find(&requests).Error
	return requests, err
}
