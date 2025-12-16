package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"oa-system/internal/model"
)

var (
	ErrMeetingRoomNotFound    = errors.New("meeting room not found")
	ErrBookingNotFound        = errors.New("booking not found")
	ErrBookingConflict        = errors.New("booking time conflict")
)

// MeetingRoomRepository handles meeting room data access
type MeetingRoomRepository struct {
	db *gorm.DB
}

// NewMeetingRoomRepository creates a new meeting room repository
func NewMeetingRoomRepository(db *gorm.DB) *MeetingRoomRepository {
	return &MeetingRoomRepository{db: db}
}

// Create creates a new meeting room
// Implements Requirement 8.1: Super admin adds new meeting room
func (r *MeetingRoomRepository) Create(room *model.MeetingRoom) error {
	return r.db.Create(room).Error
}

// GetByID retrieves a meeting room by ID
func (r *MeetingRoomRepository) GetByID(id uint) (*model.MeetingRoom, error) {
	var room model.MeetingRoom
	err := r.db.First(&room, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMeetingRoomNotFound
		}
		return nil, err
	}
	return &room, nil
}

// GetAll retrieves all meeting rooms
// Implements Requirement 8.4: Employee views meeting room availability
func (r *MeetingRoomRepository) GetAll() ([]model.MeetingRoom, error) {
	var rooms []model.MeetingRoom
	err := r.db.Order("created_at DESC").Find(&rooms).Error
	return rooms, err
}


// Update updates a meeting room
// Implements Requirement 8.2: Super admin updates meeting room info
func (r *MeetingRoomRepository) Update(room *model.MeetingRoom) error {
	return r.db.Save(room).Error
}

// Delete soft deletes a meeting room
// Implements Requirement 8.3: Super admin deletes meeting room
func (r *MeetingRoomRepository) Delete(id uint) error {
	result := r.db.Delete(&model.MeetingRoom{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrMeetingRoomNotFound
	}
	return nil
}

// MeetingRoomBookingRepository handles meeting room booking data access
type MeetingRoomBookingRepository struct {
	db *gorm.DB
}

// NewMeetingRoomBookingRepository creates a new meeting room booking repository
func NewMeetingRoomBookingRepository(db *gorm.DB) *MeetingRoomBookingRepository {
	return &MeetingRoomBookingRepository{db: db}
}

// Create creates a new booking
func (r *MeetingRoomBookingRepository) Create(booking *model.MeetingRoomBooking) error {
	return r.db.Create(booking).Error
}

// GetByID retrieves a booking by ID
func (r *MeetingRoomBookingRepository) GetByID(id uint) (*model.MeetingRoomBooking, error) {
	var booking model.MeetingRoomBooking
	err := r.db.Preload("Employee").Preload("MeetingRoom").First(&booking, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}
	return &booking, nil
}

// GetByEmployeeID retrieves all bookings for an employee
// Implements Requirement 8.10: Employee views their bookings
func (r *MeetingRoomBookingRepository) GetByEmployeeID(employeeID uint) ([]model.MeetingRoomBooking, error) {
	var bookings []model.MeetingRoomBooking
	err := r.db.Preload("MeetingRoom").
		Where("employee_id = ?", employeeID).
		Order("booking_date DESC, start_time DESC").
		Find(&bookings).Error
	return bookings, err
}

// GetByMeetingRoomAndDate retrieves all bookings for a meeting room on a specific date
// Implements Requirement 8.4: Employee views meeting room availability
func (r *MeetingRoomBookingRepository) GetByMeetingRoomAndDate(roomID uint, date time.Time) ([]model.MeetingRoomBooking, error) {
	var bookings []model.MeetingRoomBooking
	err := r.db.Preload("Employee").
		Where("meeting_room_id = ? AND booking_date = ? AND status = ?", roomID, date, model.BookingStatusActive).
		Order("start_time ASC").
		Find(&bookings).Error
	return bookings, err
}


// HasActiveBooking checks if an employee has an active booking
// Implements Property 13: 员工单预定限制
// Implements Requirement 8.8: Employee can only have one active booking
func (r *MeetingRoomBookingRepository) HasActiveBooking(employeeID uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.MeetingRoomBooking{}).
		Where("employee_id = ? AND status = ?", employeeID, model.BookingStatusActive).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// HasConflict checks if there's a booking conflict for a meeting room at a specific time
// Implements Property 12: 会议室预定冲突检测
// Implements Requirement 8.5, 8.6: Check booking conflicts
func (r *MeetingRoomBookingRepository) HasConflict(roomID uint, date time.Time, startTime, endTime string) (bool, *model.MeetingRoomBooking, error) {
	var booking model.MeetingRoomBooking
	// Check for overlapping bookings:
	// Conflict exists if: existing.start < new.end AND existing.end > new.start
	err := r.db.Preload("Employee").
		Where("meeting_room_id = ? AND booking_date = ? AND status = ?", roomID, date, model.BookingStatusActive).
		Where("start_time < ? AND end_time > ?", endTime, startTime).
		First(&booking).Error
	
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, nil
		}
		return false, nil, err
	}
	return true, &booking, nil
}

// Update updates a booking
func (r *MeetingRoomBookingRepository) Update(booking *model.MeetingRoomBooking) error {
	return r.db.Save(booking).Error
}

// UpdateStatus updates the status of a booking
func (r *MeetingRoomBookingRepository) UpdateStatus(id uint, status string) error {
	result := r.db.Model(&model.MeetingRoomBooking{}).Where("id = ?", id).Update("status", status)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrBookingNotFound
	}
	return nil
}

// GetAllByDate retrieves all bookings for a specific date
func (r *MeetingRoomBookingRepository) GetAllByDate(date time.Time) ([]model.MeetingRoomBooking, error) {
	var bookings []model.MeetingRoomBooking
	err := r.db.Preload("Employee").Preload("MeetingRoom").
		Where("booking_date = ?", date).
		Order("meeting_room_id ASC, start_time ASC").
		Find(&bookings).Error
	return bookings, err
}

// List retrieves all bookings with optional filters
func (r *MeetingRoomBookingRepository) List(filters map[string]interface{}) ([]model.MeetingRoomBooking, error) {
	var bookings []model.MeetingRoomBooking
	query := r.db.Preload("Employee").Preload("MeetingRoom")

	if employeeID, ok := filters["employee_id"]; ok {
		query = query.Where("employee_id = ?", employeeID)
	}
	if roomID, ok := filters["meeting_room_id"]; ok {
		query = query.Where("meeting_room_id = ?", roomID)
	}
	if status, ok := filters["status"]; ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if date, ok := filters["booking_date"]; ok {
		query = query.Where("booking_date = ?", date)
	}

	err := query.Order("booking_date DESC, start_time DESC").Find(&bookings).Error
	return bookings, err
}
