package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"oa-system/internal/model"
)

var (
	ErrAttendanceNotFound = errors.New("attendance record not found")
)

// AttendanceRepository handles attendance data access
type AttendanceRepository struct {
	db *gorm.DB
}

// NewAttendanceRepository creates a new attendance repository
func NewAttendanceRepository(db *gorm.DB) *AttendanceRepository {
	return &AttendanceRepository{db: db}
}

// Create creates a new attendance record
func (r *AttendanceRepository) Create(attendance *model.Attendance) error {
	return r.db.Create(attendance).Error
}

// GetByID retrieves an attendance record by ID
func (r *AttendanceRepository) GetByID(id uint) (*model.Attendance, error) {
	var attendance model.Attendance
	err := r.db.Preload("Employee").First(&attendance, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAttendanceNotFound
		}
		return nil, err
	}
	return &attendance, nil
}

// GetByEmployeeAndDate retrieves an attendance record by employee ID and date
func (r *AttendanceRepository) GetByEmployeeAndDate(employeeID uint, date time.Time) (*model.Attendance, error) {
	var attendance model.Attendance
	// Normalize date to start of day
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	
	err := r.db.Where("employee_id = ? AND date = ?", employeeID, dateOnly).First(&attendance).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAttendanceNotFound
		}
		return nil, err
	}
	return &attendance, nil
}


// GetByEmployeeAndMonth retrieves all attendance records for an employee in a specific month
func (r *AttendanceRepository) GetByEmployeeAndMonth(employeeID uint, year int, month int) ([]model.Attendance, error) {
	var attendances []model.Attendance
	
	// Calculate start and end of month
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Nanosecond)
	
	err := r.db.Where("employee_id = ? AND date >= ? AND date <= ?", employeeID, startDate, endDate).
		Order("date DESC").
		Find(&attendances).Error
	
	return attendances, err
}

// Update updates an attendance record
func (r *AttendanceRepository) Update(attendance *model.Attendance) error {
	return r.db.Save(attendance).Error
}

// UpdateSignIn updates the sign-in time for an attendance record
func (r *AttendanceRepository) UpdateSignIn(id uint, signInTime time.Time) error {
	result := r.db.Model(&model.Attendance{}).Where("id = ?", id).Update("sign_in_time", signInTime)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAttendanceNotFound
	}
	return nil
}

// UpdateSignOut updates the sign-out time for an attendance record
func (r *AttendanceRepository) UpdateSignOut(id uint, signOutTime time.Time) error {
	result := r.db.Model(&model.Attendance{}).Where("id = ?", id).Update("sign_out_time", signOutTime)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAttendanceNotFound
	}
	return nil
}

// Delete deletes an attendance record
func (r *AttendanceRepository) Delete(id uint) error {
	result := r.db.Delete(&model.Attendance{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAttendanceNotFound
	}
	return nil
}

// ExistsByEmployeeAndDate checks if an attendance record exists for an employee on a specific date
func (r *AttendanceRepository) ExistsByEmployeeAndDate(employeeID uint, date time.Time) (bool, error) {
	var count int64
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	err := r.db.Model(&model.Attendance{}).Where("employee_id = ? AND date = ?", employeeID, dateOnly).Count(&count).Error
	return count > 0, err
}

// HasSignedIn checks if an employee has signed in on a specific date
func (r *AttendanceRepository) HasSignedIn(employeeID uint, date time.Time) (bool, error) {
	attendance, err := r.GetByEmployeeAndDate(employeeID, date)
	if err != nil {
		if errors.Is(err, ErrAttendanceNotFound) {
			return false, nil
		}
		return false, err
	}
	return attendance.SignInTime != nil, nil
}

// HasSignedOut checks if an employee has signed out on a specific date
func (r *AttendanceRepository) HasSignedOut(employeeID uint, date time.Time) (bool, error) {
	attendance, err := r.GetByEmployeeAndDate(employeeID, date)
	if err != nil {
		if errors.Is(err, ErrAttendanceNotFound) {
			return false, nil
		}
		return false, err
	}
	return attendance.SignOutTime != nil, nil
}
