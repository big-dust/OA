package service

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/internal/repository"
)

var (
	ErrAttendanceNotFound   = errors.New("attendance record not found")
	ErrAlreadySignedIn      = errors.New("already signed in today")
	ErrNotSignedIn          = errors.New("not signed in today, cannot sign out")
	ErrAlreadySignedOut     = errors.New("already signed out today")
)

// AttendanceService handles attendance business logic
type AttendanceService struct {
	repo *repository.AttendanceRepository
	db   *gorm.DB
}

// NewAttendanceService creates a new attendance service
func NewAttendanceService(db *gorm.DB) *AttendanceService {
	return &AttendanceService{
		repo: repository.NewAttendanceRepository(db),
		db:   db,
	}
}

// SignInResponse represents the response after signing in
type SignInResponse struct {
	Attendance *model.Attendance `json:"attendance"`
	Message    string            `json:"message"`
}

// SignOutResponse represents the response after signing out
type SignOutResponse struct {
	Attendance *model.Attendance `json:"attendance"`
	Message    string            `json:"message"`
}

// TodayStatusResponse represents today's attendance status
type TodayStatusResponse struct {
	Date        string     `json:"date"`
	SignedIn    bool       `json:"signed_in"`
	SignedOut   bool       `json:"signed_out"`
	SignInTime  *time.Time `json:"sign_in_time"`
	SignOutTime *time.Time `json:"sign_out_time"`
}


// SignIn records the sign-in time for an employee
// Implements Property 6: 签到幂等性 - First sign-in succeeds, subsequent attempts are rejected
func (s *AttendanceService) SignIn(employeeID uint) (*SignInResponse, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// Check if already signed in today (Property 6: 签到幂等性)
	attendance, err := s.repo.GetByEmployeeAndDate(employeeID, today)
	if err != nil && !errors.Is(err, repository.ErrAttendanceNotFound) {
		return nil, err
	}

	if attendance != nil && attendance.SignInTime != nil {
		// Already signed in - reject (Property 6)
		return nil, ErrAlreadySignedIn
	}

	// Create new attendance record if not exists
	if attendance == nil {
		attendance = &model.Attendance{
			EmployeeID: employeeID,
			Date:       today,
			SignInTime: &now,
		}
		if err := s.repo.Create(attendance); err != nil {
			return nil, err
		}
	} else {
		// Update existing record with sign-in time
		attendance.SignInTime = &now
		if err := s.repo.Update(attendance); err != nil {
			return nil, err
		}
	}

	return &SignInResponse{
		Attendance: attendance,
		Message:    "签到成功",
	}, nil
}

// SignOut records the sign-out time for an employee
// Implements Property 7: 签退前置条件 - Sign-out only succeeds if already signed in
func (s *AttendanceService) SignOut(employeeID uint) (*SignOutResponse, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// Check if signed in today (Property 7: 签退前置条件)
	attendance, err := s.repo.GetByEmployeeAndDate(employeeID, today)
	if err != nil {
		if errors.Is(err, repository.ErrAttendanceNotFound) {
			// Not signed in - reject (Property 7)
			return nil, ErrNotSignedIn
		}
		return nil, err
	}

	// Must have signed in first (Property 7)
	if attendance.SignInTime == nil {
		return nil, ErrNotSignedIn
	}

	// Check if already signed out
	if attendance.SignOutTime != nil {
		return nil, ErrAlreadySignedOut
	}

	// Update sign-out time
	attendance.SignOutTime = &now
	if err := s.repo.Update(attendance); err != nil {
		return nil, err
	}

	return &SignOutResponse{
		Attendance: attendance,
		Message:    "签退成功",
	}, nil
}


// GetTodayStatus returns today's attendance status for an employee
func (s *AttendanceService) GetTodayStatus(employeeID uint) (*TodayStatusResponse, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	attendance, err := s.repo.GetByEmployeeAndDate(employeeID, today)
	if err != nil {
		if errors.Is(err, repository.ErrAttendanceNotFound) {
			// No attendance record for today
			return &TodayStatusResponse{
				Date:        today.Format("2006-01-02"),
				SignedIn:    false,
				SignedOut:   false,
				SignInTime:  nil,
				SignOutTime: nil,
			}, nil
		}
		return nil, err
	}

	return &TodayStatusResponse{
		Date:        today.Format("2006-01-02"),
		SignedIn:    attendance.SignInTime != nil,
		SignedOut:   attendance.SignOutTime != nil,
		SignInTime:  attendance.SignInTime,
		SignOutTime: attendance.SignOutTime,
	}, nil
}

// GetMonthlyRecords returns all attendance records for an employee in a specific month
func (s *AttendanceService) GetMonthlyRecords(employeeID uint, year int, month int) ([]model.Attendance, error) {
	// Default to current month if not specified
	if year == 0 || month == 0 {
		now := time.Now()
		year = now.Year()
		month = int(now.Month())
	}

	return s.repo.GetByEmployeeAndMonth(employeeID, year, month)
}

// GetByID retrieves an attendance record by ID
func (s *AttendanceService) GetByID(id uint) (*model.Attendance, error) {
	attendance, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrAttendanceNotFound) {
			return nil, ErrAttendanceNotFound
		}
		return nil, err
	}
	return attendance, nil
}
