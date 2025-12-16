package model

import (
	"time"

	"gorm.io/gorm"
)

// Role constants
const (
	RoleSuperAdmin  = "super_admin"
	RoleHR          = "hr"
	RoleFinance     = "finance"
	RoleDeviceAdmin = "device_admin"
	RoleSupervisor  = "supervisor"
	RoleEmployee    = "employee"
)

// Leave type constants
const (
	LeaveTypeAnnual      = "annual"
	LeaveTypeSick        = "sick"
	LeaveTypePersonal    = "personal"
	LeaveTypeMarriage    = "marriage"
	LeaveTypeMaternity   = "maternity"
	LeaveTypeBereavement = "bereavement"
)

// Leave status constants
const (
	LeaveStatusPending   = "pending"
	LeaveStatusApproved  = "approved"
	LeaveStatusRejected  = "rejected"
	LeaveStatusCancelled = "cancelled"
)

// Device request status constants
const (
	DeviceRequestStatusPending       = "pending"
	DeviceRequestStatusApproved      = "approved"
	DeviceRequestStatusRejected      = "rejected"
	DeviceRequestStatusCollected     = "collected"
	DeviceRequestStatusReturnPending = "return_pending"
	DeviceRequestStatusReturned      = "returned"
	DeviceRequestStatusCancelled     = "cancelled"
)


// Booking status constants
const (
	BookingStatusActive    = "active"
	BookingStatusCompleted = "completed"
	BookingStatusCancelled = "cancelled"
)

// Contract type constants
const (
	ContractTypeOnboarding  = "onboarding"
	ContractTypeOffboarding = "offboarding"
)

// Contract status constants
const (
	ContractStatusPending = "pending"
	ContractStatusSigned  = "signed"
)

// Employee represents an employee in the system
type Employee struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Username     string         `gorm:"uniqueIndex;size:50;not null" json:"username"`
	EmployeeNo   string         `gorm:"uniqueIndex;size:20;not null" json:"employee_no"`
	Name         string         `gorm:"size:100;not null" json:"name"`
	Department   string         `gorm:"size:100" json:"department"`
	Position     string         `gorm:"size:100" json:"position"`
	Phone        string         `gorm:"size:20" json:"phone"`
	Email        string         `gorm:"size:100" json:"email"`
	HireDate     time.Time      `json:"hire_date"`
	SupervisorID *uint          `json:"supervisor_id"`
	Supervisor   *Employee      `gorm:"foreignKey:SupervisorID" json:"supervisor,omitempty"`
	Role         string         `gorm:"size:20;not null;default:employee" json:"role"`
	Password     string         `gorm:"size:255;not null" json:"-"`
	IsFirstLogin bool           `gorm:"default:true" json:"is_first_login"`
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}


// Attendance represents daily attendance record
type Attendance struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	EmployeeID  uint       `gorm:"not null;index" json:"employee_id"`
	Employee    Employee   `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	Date        time.Time  `gorm:"type:date;not null;index" json:"date"`
	SignInTime  *time.Time `json:"sign_in_time"`
	SignOutTime *time.Time `json:"sign_out_time"`
}

// LeaveRequest represents a leave request
type LeaveRequest struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	EmployeeID   uint           `gorm:"not null;index" json:"employee_id"`
	Employee     Employee       `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	LeaveType    string         `gorm:"size:20;not null" json:"leave_type"`
	StartDate    time.Time      `gorm:"type:date;not null" json:"start_date"`
	EndDate      time.Time      `gorm:"type:date;not null" json:"end_date"`
	Reason       string         `gorm:"type:text" json:"reason"`
	Status       string         `gorm:"size:20;not null;default:pending" json:"status"`
	RejectReason string         `gorm:"type:text" json:"reject_reason"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// Device represents a device in the system
type Device struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	Name              string         `gorm:"size:100;not null" json:"name"`
	Type              string         `gorm:"size:50" json:"type"`
	TotalQuantity     int            `gorm:"not null;default:0" json:"total_quantity"`
	AvailableQuantity int            `gorm:"not null;default:0" json:"available_quantity"`
	Description       string         `gorm:"type:text" json:"description"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}


// DeviceRequest represents a device request
type DeviceRequest struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	EmployeeID   uint           `gorm:"not null;index" json:"employee_id"`
	Employee     Employee       `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	DeviceID     uint           `gorm:"not null;index" json:"device_id"`
	Device       Device         `gorm:"foreignKey:DeviceID" json:"device,omitempty"`
	Status       string         `gorm:"size:20;not null;default:pending" json:"status"`
	RejectReason string         `gorm:"type:text" json:"reject_reason"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// MeetingRoom represents a meeting room
type MeetingRoom struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	Capacity  int            `gorm:"not null;default:0" json:"capacity"`
	Location  string         `gorm:"size:200" json:"location"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// MeetingRoomBooking represents a meeting room booking
type MeetingRoomBooking struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	EmployeeID    uint           `gorm:"not null;index" json:"employee_id"`
	Employee      Employee       `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	MeetingRoomID uint           `gorm:"not null;index" json:"meeting_room_id"`
	MeetingRoom   MeetingRoom    `gorm:"foreignKey:MeetingRoomID" json:"meeting_room,omitempty"`
	BookingDate   time.Time      `gorm:"type:date;not null;index" json:"booking_date"`
	StartTime     string         `gorm:"size:10;not null" json:"start_time"` // HH:MM format
	EndTime       string         `gorm:"size:10;not null" json:"end_time"`   // HH:MM format
	Status        string         `gorm:"size:20;not null;default:active" json:"status"`
	CreatedAt     time.Time      `json:"created_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}


// ContractTemplate represents a contract template
type ContractTemplate struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Type      string    `gorm:"uniqueIndex;size:20;not null" json:"type"`
	Title     string    `gorm:"size:200;not null" json:"title"`
	Content   string    `gorm:"type:text" json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// Contract represents a contract
type Contract struct {
	ID         uint              `gorm:"primaryKey" json:"id"`
	EmployeeID uint              `gorm:"not null;index" json:"employee_id"`
	Employee   Employee          `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	TemplateID uint              `gorm:"not null" json:"template_id"`
	Template   ContractTemplate  `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	Type       string            `gorm:"size:20;not null" json:"type"`
	Content    string            `gorm:"type:text" json:"content"`
	Status     string            `gorm:"size:20;not null;default:pending" json:"status"`
	SignedAt   *time.Time        `json:"signed_at"`
	CreatedAt  time.Time         `json:"created_at"`
	DeletedAt  gorm.DeletedAt    `gorm:"index" json:"-"`
}

// Salary represents a salary record
type Salary struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	EmployeeID uint           `gorm:"not null;index" json:"employee_id"`
	Employee   Employee       `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	Month      string         `gorm:"size:7;not null;index" json:"month"` // YYYY-MM format
	BaseSalary float64        `gorm:"type:decimal(10,2);not null" json:"base_salary"`
	Bonus      float64        `gorm:"type:decimal(10,2);default:0" json:"bonus"`
	Deduction  float64        `gorm:"type:decimal(10,2);default:0" json:"deduction"`
	NetSalary  float64        `gorm:"type:decimal(10,2);not null" json:"net_salary"`
	CreatedAt  time.Time      `json:"created_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}


// Notification represents a notification
type Notification struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	EmployeeID  uint           `gorm:"not null;index" json:"employee_id"`
	Employee    Employee       `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	Type        string         `gorm:"size:50;not null" json:"type"`
	Title       string         `gorm:"size:200;not null" json:"title"`
	Content     string         `gorm:"type:text" json:"content"`
	RelatedType string         `gorm:"size:50" json:"related_type"`
	RelatedID   uint           `json:"related_id"`
	IsRead      bool           `gorm:"default:false" json:"is_read"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// AllModels returns all models for auto migration
func AllModels() []interface{} {
	return []interface{}{
		&Employee{},
		&Attendance{},
		&LeaveRequest{},
		&Device{},
		&DeviceRequest{},
		&MeetingRoom{},
		&MeetingRoomBooking{},
		&ContractTemplate{},
		&Contract{},
		&Salary{},
		&Notification{},
	}
}
