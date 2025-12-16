package service

import (
	"errors"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/internal/repository"
)

var (
	ErrDeviceNotFound              = errors.New("device not found")
	ErrDeviceRequestNotFound       = errors.New("device request not found")
	ErrDeviceRequestInvalidStatus  = errors.New("device request status does not allow this operation")
	ErrDeviceNotAvailable          = errors.New("device not available")
	ErrDeviceRequestNotOwner       = errors.New("can only operate on own device request")
)

// DeviceService handles device business logic
type DeviceService struct {
	deviceRepo        *repository.DeviceRepository
	deviceRequestRepo *repository.DeviceRequestRepository
	db                *gorm.DB
}

// NewDeviceService creates a new device service
func NewDeviceService(db *gorm.DB) *DeviceService {
	return &DeviceService{
		deviceRepo:        repository.NewDeviceRepository(db),
		deviceRequestRepo: repository.NewDeviceRequestRepository(db),
		db:                db,
	}
}

// CreateDeviceRequest represents the request to create a device
type CreateDeviceRequest struct {
	Name        string `json:"name" binding:"required"`
	Type        string `json:"type"`
	Quantity    int    `json:"quantity" binding:"required,min=1"`
	Description string `json:"description"`
}

// UpdateDeviceRequest represents the request to update a device
type UpdateDeviceRequest struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Quantity    int    `json:"quantity"`
	Description string `json:"description"`
}


// RejectDeviceRequestInput represents the request to reject a device request
type RejectDeviceRequestInput struct {
	RejectReason string `json:"reject_reason" binding:"required"`
}

// ===== Device Management (Device Admin) =====

// CreateDevice creates a new device
// Implements Requirement 6.1: Device admin adds new device
func (s *DeviceService) CreateDevice(req *CreateDeviceRequest) (*model.Device, error) {
	device := &model.Device{
		Name:              req.Name,
		Type:              req.Type,
		TotalQuantity:     req.Quantity,
		AvailableQuantity: req.Quantity,
		Description:       req.Description,
	}

	if err := s.deviceRepo.Create(device); err != nil {
		return nil, err
	}

	return device, nil
}

// GetDeviceByID retrieves a device by ID
func (s *DeviceService) GetDeviceByID(id uint) (*model.Device, error) {
	device, err := s.deviceRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceNotFound) {
			return nil, ErrDeviceNotFound
		}
		return nil, err
	}
	return device, nil
}

// GetAllDevices retrieves all devices
// Implements Requirement 6.4: Device admin views all devices
func (s *DeviceService) GetAllDevices() ([]model.Device, error) {
	return s.deviceRepo.GetAll()
}

// GetAvailableDevices retrieves all available devices
// Implements Requirement 7.1: Employee views available devices
func (s *DeviceService) GetAvailableDevices() ([]model.Device, error) {
	return s.deviceRepo.GetAvailable()
}


// UpdateDevice updates a device
// Implements Requirement 6.2: Device admin updates device info
func (s *DeviceService) UpdateDevice(id uint, req *UpdateDeviceRequest) (*model.Device, error) {
	device, err := s.deviceRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceNotFound) {
			return nil, ErrDeviceNotFound
		}
		return nil, err
	}

	// Update fields if provided
	if req.Name != "" {
		device.Name = req.Name
	}
	if req.Type != "" {
		device.Type = req.Type
	}
	if req.Description != "" {
		device.Description = req.Description
	}
	if req.Quantity > 0 {
		// Calculate the difference and adjust available quantity
		diff := req.Quantity - device.TotalQuantity
		device.TotalQuantity = req.Quantity
		device.AvailableQuantity += diff
		if device.AvailableQuantity < 0 {
			device.AvailableQuantity = 0
		}
	}

	if err := s.deviceRepo.Update(device); err != nil {
		return nil, err
	}

	return device, nil
}

// DeleteDevice deletes a device
// Implements Requirement 6.3: Device admin deletes device
func (s *DeviceService) DeleteDevice(id uint) error {
	err := s.deviceRepo.Delete(id)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceNotFound) {
			return ErrDeviceNotFound
		}
		return err
	}
	return nil
}

// ===== Device Request Management =====

// CreateDeviceRequestInput represents the input for creating a device request
type CreateDeviceRequestInput struct {
	DeviceID uint `json:"device_id" binding:"required"`
}

// CreateRequest creates a new device request
// Implements Requirement 7.2: Employee submits device request
func (s *DeviceService) CreateRequest(employeeID uint, req *CreateDeviceRequestInput) (*model.DeviceRequest, error) {
	// Check if device exists and is available
	device, err := s.deviceRepo.GetByID(req.DeviceID)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceNotFound) {
			return nil, ErrDeviceNotFound
		}
		return nil, err
	}

	if device.AvailableQuantity <= 0 {
		return nil, ErrDeviceNotAvailable
	}

	request := &model.DeviceRequest{
		EmployeeID: employeeID,
		DeviceID:   req.DeviceID,
		Status:     model.DeviceRequestStatusPending,
	}

	if err := s.deviceRequestRepo.Create(request); err != nil {
		return nil, err
	}

	// Reload with associations
	return s.deviceRequestRepo.GetByID(request.ID)
}


// GetRequestByID retrieves a device request by ID
func (s *DeviceService) GetRequestByID(id uint) (*model.DeviceRequest, error) {
	request, err := s.deviceRequestRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceRequestNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}
	return request, nil
}

// GetMyRequests retrieves all device requests for an employee
// Implements Requirement 7.8: Employee views their device requests
func (s *DeviceService) GetMyRequests(employeeID uint) ([]model.DeviceRequest, error) {
	return s.deviceRequestRepo.GetByEmployeeID(employeeID)
}

// GetPendingRequests retrieves all pending device requests
// Implements Requirement 7.2: Device admin views pending requests
func (s *DeviceService) GetPendingRequests() ([]model.DeviceRequest, error) {
	return s.deviceRequestRepo.GetPending()
}

// GetReturnPendingRequests retrieves all return pending device requests
// Implements Requirement 7.6: Device admin views return pending requests
func (s *DeviceService) GetReturnPendingRequests() ([]model.DeviceRequest, error) {
	return s.deviceRequestRepo.GetReturnPending()
}

// ApproveRequest approves a device request
// Implements Property 11: 设备申请状态机 - pending → approved
// Implements Requirement 7.3: Device admin approves request
func (s *DeviceService) ApproveRequest(requestID uint) (*model.DeviceRequest, error) {
	request, err := s.deviceRequestRepo.GetByID(requestID)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceRequestNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}

	// Property 11: Only pending status can transition to approved
	if request.Status != model.DeviceRequestStatusPending {
		return nil, ErrDeviceRequestInvalidStatus
	}

	request.Status = model.DeviceRequestStatusApproved
	if err := s.deviceRequestRepo.Update(request); err != nil {
		return nil, err
	}

	// TODO: Notify employee (notification module is optional)

	return request, nil
}


// RejectRequest rejects a device request
// Implements Property 11: 设备申请状态机 - pending → rejected
// Implements Requirement 7.4: Device admin rejects request with reason
func (s *DeviceService) RejectRequest(requestID uint, reason string) (*model.DeviceRequest, error) {
	request, err := s.deviceRequestRepo.GetByID(requestID)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceRequestNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}

	// Property 11: Only pending status can transition to rejected
	if request.Status != model.DeviceRequestStatusPending {
		return nil, ErrDeviceRequestInvalidStatus
	}

	request.Status = model.DeviceRequestStatusRejected
	request.RejectReason = reason
	if err := s.deviceRequestRepo.Update(request); err != nil {
		return nil, err
	}

	// TODO: Notify employee (notification module is optional)

	return request, nil
}

// CollectDevice marks a device as collected by the employee
// Implements Property 11: 设备申请状态机 - approved → collected
// Implements Property 10: 设备可用数量一致性 - decrements available quantity
// Implements Requirement 7.5: Employee confirms device collection
func (s *DeviceService) CollectDevice(requestID uint, employeeID uint) (*model.DeviceRequest, error) {
	request, err := s.deviceRequestRepo.GetByID(requestID)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceRequestNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}

	// Can only collect own request
	if request.EmployeeID != employeeID {
		return nil, ErrDeviceRequestNotOwner
	}

	// Property 11: Only approved status can transition to collected
	if request.Status != model.DeviceRequestStatusApproved {
		return nil, ErrDeviceRequestInvalidStatus
	}

	// Use transaction to ensure consistency (Property 10)
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Update request status
		request.Status = model.DeviceRequestStatusCollected
		if err := tx.Save(request).Error; err != nil {
			return err
		}

		// Decrement available quantity (Property 10)
		result := tx.Model(&model.Device{}).
			Where("id = ? AND available_quantity > 0", request.DeviceID).
			Update("available_quantity", gorm.Expr("available_quantity - 1"))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrDeviceNotAvailable
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return request, nil
}


// InitiateReturn initiates a device return by the employee
// Implements Property 11: 设备申请状态机 - collected → return_pending
// Implements Requirement 7.6: Employee initiates device return
func (s *DeviceService) InitiateReturn(requestID uint, employeeID uint) (*model.DeviceRequest, error) {
	request, err := s.deviceRequestRepo.GetByID(requestID)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceRequestNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}

	// Can only return own request
	if request.EmployeeID != employeeID {
		return nil, ErrDeviceRequestNotOwner
	}

	// Property 11: Only collected status can transition to return_pending
	if request.Status != model.DeviceRequestStatusCollected {
		return nil, ErrDeviceRequestInvalidStatus
	}

	request.Status = model.DeviceRequestStatusReturnPending
	if err := s.deviceRequestRepo.Update(request); err != nil {
		return nil, err
	}

	// TODO: Notify device admin (notification module is optional)

	return request, nil
}

// ConfirmReturn confirms a device return by the device admin
// Implements Property 11: 设备申请状态机 - return_pending → returned
// Implements Property 10: 设备可用数量一致性 - increments available quantity
// Implements Requirement 7.7: Device admin confirms device return
func (s *DeviceService) ConfirmReturn(requestID uint) (*model.DeviceRequest, error) {
	request, err := s.deviceRequestRepo.GetByID(requestID)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceRequestNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}

	// Property 11: Only return_pending status can transition to returned
	if request.Status != model.DeviceRequestStatusReturnPending {
		return nil, ErrDeviceRequestInvalidStatus
	}

	// Use transaction to ensure consistency (Property 10)
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Update request status
		request.Status = model.DeviceRequestStatusReturned
		if err := tx.Save(request).Error; err != nil {
			return err
		}

		// Increment available quantity (Property 10)
		result := tx.Model(&model.Device{}).
			Where("id = ?", request.DeviceID).
			Update("available_quantity", gorm.Expr("available_quantity + 1"))
		if result.Error != nil {
			return result.Error
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return request, nil
}


// CancelRequestByEmployee cancels a device request by the employee
// Implements Property 11: 设备申请状态机 - pending → cancelled
// Implements Requirement 7.9: Employee cancels pending request
func (s *DeviceService) CancelRequestByEmployee(requestID uint, employeeID uint) (*model.DeviceRequest, error) {
	request, err := s.deviceRequestRepo.GetByID(requestID)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceRequestNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}

	// Can only cancel own request
	if request.EmployeeID != employeeID {
		return nil, ErrDeviceRequestNotOwner
	}

	// Property 11: Only pending status can transition to cancelled
	if request.Status != model.DeviceRequestStatusPending {
		return nil, ErrDeviceRequestInvalidStatus
	}

	request.Status = model.DeviceRequestStatusCancelled
	if err := s.deviceRequestRepo.Update(request); err != nil {
		return nil, err
	}

	// TODO: Notify device admin (notification module is optional)

	return request, nil
}

// CancelRequestByAdmin cancels a device request by the device admin
// Implements Property 11: 设备申请状态机 - pending → cancelled
// Implements Requirement 7.10: Device admin cancels pending request
func (s *DeviceService) CancelRequestByAdmin(requestID uint) (*model.DeviceRequest, error) {
	request, err := s.deviceRequestRepo.GetByID(requestID)
	if err != nil {
		if errors.Is(err, repository.ErrDeviceRequestNotFound) {
			return nil, ErrDeviceRequestNotFound
		}
		return nil, err
	}

	// Property 11: Only pending status can transition to cancelled
	if request.Status != model.DeviceRequestStatusPending {
		return nil, ErrDeviceRequestInvalidStatus
	}

	request.Status = model.DeviceRequestStatusCancelled
	if err := s.deviceRequestRepo.Update(request); err != nil {
		return nil, err
	}

	// TODO: Notify employee (notification module is optional)

	return request, nil
}
