package service

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/internal/repository"
)

var (
	ErrLeaveRequestNotFound     = errors.New("leave request not found")
	ErrLeaveInvalidStatus       = errors.New("leave request status does not allow this operation")
	ErrLeaveInvalidDateRange    = errors.New("invalid date range: end date must be after or equal to start date")
	ErrLeaveNotSubordinate      = errors.New("can only approve/reject leave requests from subordinates")
	ErrLeaveSelfApproval        = errors.New("cannot approve/reject own leave request")
)

// LeaveService handles leave request business logic
type LeaveService struct {
	leaveRepo    *repository.LeaveRepository
	employeeRepo *repository.EmployeeRepository
	db           *gorm.DB
}

// NewLeaveService creates a new leave service
func NewLeaveService(db *gorm.DB) *LeaveService {
	return &LeaveService{
		leaveRepo:    repository.NewLeaveRepository(db),
		employeeRepo: repository.NewEmployeeRepository(db),
		db:           db,
	}
}

// CreateLeaveRequest represents the request to create a leave
type CreateLeaveRequest struct {
	LeaveType string `json:"leave_type" binding:"required"`
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
	Reason    string `json:"reason"`
}

// RejectLeaveRequest represents the request to reject a leave
type RejectLeaveRequest struct {
	RejectReason string `json:"reject_reason" binding:"required"`
}


// Create creates a new leave request
// Implements Requirement 5.1: Employee submits leave request with type, dates, and reason
func (s *LeaveService) Create(employeeID uint, req *CreateLeaveRequest) (*model.LeaveRequest, error) {
	// Parse date strings
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start date format, expected YYYY-MM-DD")
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end date format, expected YYYY-MM-DD")
	}

	// Validate date range
	if endDate.Before(startDate) {
		return nil, ErrLeaveInvalidDateRange
	}

	// Validate leave type
	if !isValidLeaveType(req.LeaveType) {
		return nil, errors.New("invalid leave type")
	}

	// Check if the employee is a super admin
	employee, err := s.employeeRepo.GetByID(employeeID)
	if err != nil {
		return nil, err
	}

	// Super admin's leave requests are auto-approved
	status := model.LeaveStatusPending
	if employee.Role == model.RoleSuperAdmin {
		status = model.LeaveStatusApproved
	}

	leave := &model.LeaveRequest{
		EmployeeID: employeeID,
		LeaveType:  req.LeaveType,
		StartDate:  startDate,
		EndDate:    endDate,
		Reason:     req.Reason,
		Status:     status,
	}

	if err := s.leaveRepo.Create(leave); err != nil {
		return nil, err
	}

	// TODO: Notify supervisor (notification module is optional)

	return leave, nil
}

// GetByID retrieves a leave request by ID
func (s *LeaveService) GetByID(id uint) (*model.LeaveRequest, error) {
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrLeaveRequestNotFound) {
			return nil, ErrLeaveRequestNotFound
		}
		return nil, err
	}
	return leave, nil
}

// GetMyLeaves retrieves all leave requests for an employee
// Implements Requirement 5.5, 5.6: Employee views their leave requests and history
func (s *LeaveService) GetMyLeaves(employeeID uint) ([]model.LeaveRequest, error) {
	return s.leaveRepo.GetByEmployeeID(employeeID)
}

// GetPendingForSupervisor retrieves all pending leave requests from subordinates
// Implements Property 9: 主管只能查看下属请假 - Supervisor can only view subordinates' leaves
// Super admin can also see leave requests from employees without a supervisor
func (s *LeaveService) GetPendingForSupervisor(supervisorID uint) ([]model.LeaveRequest, error) {
	// Check if the current user is a super admin
	supervisor, err := s.employeeRepo.GetByID(supervisorID)
	if err != nil {
		return nil, err
	}

	// Get all subordinates
	subordinates, err := s.employeeRepo.GetSubordinates(supervisorID)
	if err != nil {
		return nil, err
	}

	// Extract subordinate IDs
	subordinateIDs := make([]uint, len(subordinates))
	for i, sub := range subordinates {
		subordinateIDs[i] = sub.ID
	}

	// If super admin, also include employees without a supervisor
	if supervisor.Role == model.RoleSuperAdmin {
		employeesWithoutSupervisor, err := s.employeeRepo.GetEmployeesWithoutSupervisor()
		if err != nil {
			return nil, err
		}
		for _, emp := range employeesWithoutSupervisor {
			// Don't include self
			if emp.ID != supervisorID {
				subordinateIDs = append(subordinateIDs, emp.ID)
			}
		}
	}

	// Get pending leave requests from subordinates only (Property 9)
	return s.leaveRepo.GetPendingBySubordinates(subordinateIDs)
}


// Approve approves a leave request
// Implements Property 8: 请假申请状态机 - Status transitions: pending → approved
// Implements Requirement 5.3: Supervisor approves leave request
// Super admin can approve leave requests from employees without a supervisor
func (s *LeaveService) Approve(leaveID uint, supervisorID uint) (*model.LeaveRequest, error) {
	leave, err := s.leaveRepo.GetByID(leaveID)
	if err != nil {
		if errors.Is(err, repository.ErrLeaveRequestNotFound) {
			return nil, ErrLeaveRequestNotFound
		}
		return nil, err
	}

	// Cannot approve own leave request
	if leave.EmployeeID == supervisorID {
		return nil, ErrLeaveSelfApproval
	}

	// Get the approver info
	approver, err := s.employeeRepo.GetByID(supervisorID)
	if err != nil {
		return nil, err
	}

	// Verify the employee is a subordinate of the supervisor (Property 9)
	employee, err := s.employeeRepo.GetByID(leave.EmployeeID)
	if err != nil {
		return nil, err
	}

	// Check authorization: either direct supervisor or super admin for employees without supervisor
	isDirectSupervisor := employee.SupervisorID != nil && *employee.SupervisorID == supervisorID
	isSuperAdminForOrphan := approver.Role == model.RoleSuperAdmin && employee.SupervisorID == nil

	if !isDirectSupervisor && !isSuperAdminForOrphan {
		return nil, ErrLeaveNotSubordinate
	}

	// Property 8: Only pending status can transition to approved
	if leave.Status != model.LeaveStatusPending {
		return nil, ErrLeaveInvalidStatus
	}

	leave.Status = model.LeaveStatusApproved
	if err := s.leaveRepo.Update(leave); err != nil {
		return nil, err
	}

	// TODO: Notify employee (notification module is optional)

	return leave, nil
}

// Reject rejects a leave request
// Implements Property 8: 请假申请状态机 - Status transitions: pending → rejected
// Implements Requirement 5.4: Supervisor rejects leave request with reason
// Super admin can reject leave requests from employees without a supervisor
func (s *LeaveService) Reject(leaveID uint, supervisorID uint, reason string) (*model.LeaveRequest, error) {
	leave, err := s.leaveRepo.GetByID(leaveID)
	if err != nil {
		if errors.Is(err, repository.ErrLeaveRequestNotFound) {
			return nil, ErrLeaveRequestNotFound
		}
		return nil, err
	}

	// Cannot reject own leave request
	if leave.EmployeeID == supervisorID {
		return nil, ErrLeaveSelfApproval
	}

	// Get the approver info
	approver, err := s.employeeRepo.GetByID(supervisorID)
	if err != nil {
		return nil, err
	}

	// Verify the employee is a subordinate of the supervisor (Property 9)
	employee, err := s.employeeRepo.GetByID(leave.EmployeeID)
	if err != nil {
		return nil, err
	}

	// Check authorization: either direct supervisor or super admin for employees without supervisor
	isDirectSupervisor := employee.SupervisorID != nil && *employee.SupervisorID == supervisorID
	isSuperAdminForOrphan := approver.Role == model.RoleSuperAdmin && employee.SupervisorID == nil

	if !isDirectSupervisor && !isSuperAdminForOrphan {
		return nil, ErrLeaveNotSubordinate
	}

	// Property 8: Only pending status can transition to rejected
	if leave.Status != model.LeaveStatusPending {
		return nil, ErrLeaveInvalidStatus
	}

	leave.Status = model.LeaveStatusRejected
	leave.RejectReason = reason
	if err := s.leaveRepo.Update(leave); err != nil {
		return nil, err
	}

	// TODO: Notify employee (notification module is optional)

	return leave, nil
}


// CancelByEmployee cancels a leave request by the employee
// Implements Property 8: 请假申请状态机 - Status transitions: pending → cancelled
// Implements Requirement 5.7: Employee cancels pending leave request
func (s *LeaveService) CancelByEmployee(leaveID uint, employeeID uint) (*model.LeaveRequest, error) {
	leave, err := s.leaveRepo.GetByID(leaveID)
	if err != nil {
		if errors.Is(err, repository.ErrLeaveRequestNotFound) {
			return nil, ErrLeaveRequestNotFound
		}
		return nil, err
	}

	// Can only cancel own leave request
	if leave.EmployeeID != employeeID {
		return nil, errors.New("can only cancel own leave request")
	}

	// Property 8: Only pending status can transition to cancelled
	if leave.Status != model.LeaveStatusPending {
		return nil, ErrLeaveInvalidStatus
	}

	leave.Status = model.LeaveStatusCancelled
	if err := s.leaveRepo.Update(leave); err != nil {
		return nil, err
	}

	// TODO: Notify supervisor (notification module is optional)

	return leave, nil
}

// CancelBySupervisor cancels a leave request by the supervisor
// Implements Property 8: 请假申请状态机 - Status transitions: pending → cancelled
// Implements Requirement 5.8: Supervisor cancels pending leave request
// Super admin can cancel leave requests from employees without a supervisor
func (s *LeaveService) CancelBySupervisor(leaveID uint, supervisorID uint) (*model.LeaveRequest, error) {
	leave, err := s.leaveRepo.GetByID(leaveID)
	if err != nil {
		if errors.Is(err, repository.ErrLeaveRequestNotFound) {
			return nil, ErrLeaveRequestNotFound
		}
		return nil, err
	}

	// Get the approver info
	approver, err := s.employeeRepo.GetByID(supervisorID)
	if err != nil {
		return nil, err
	}

	// Verify the employee is a subordinate of the supervisor (Property 9)
	employee, err := s.employeeRepo.GetByID(leave.EmployeeID)
	if err != nil {
		return nil, err
	}

	// Check authorization: either direct supervisor or super admin for employees without supervisor
	isDirectSupervisor := employee.SupervisorID != nil && *employee.SupervisorID == supervisorID
	isSuperAdminForOrphan := approver.Role == model.RoleSuperAdmin && employee.SupervisorID == nil

	if !isDirectSupervisor && !isSuperAdminForOrphan {
		return nil, ErrLeaveNotSubordinate
	}

	// Property 8: Only pending status can transition to cancelled
	if leave.Status != model.LeaveStatusPending {
		return nil, ErrLeaveInvalidStatus
	}

	leave.Status = model.LeaveStatusCancelled
	if err := s.leaveRepo.Update(leave); err != nil {
		return nil, err
	}

	// TODO: Notify employee (notification module is optional)

	return leave, nil
}

// isValidLeaveType checks if the leave type is valid
func isValidLeaveType(leaveType string) bool {
	validTypes := []string{
		model.LeaveTypeAnnual,
		model.LeaveTypeSick,
		model.LeaveTypePersonal,
		model.LeaveTypeMarriage,
		model.LeaveTypeMaternity,
		model.LeaveTypeBereavement,
	}
	for _, t := range validTypes {
		if t == leaveType {
			return true
		}
	}
	return false
}
