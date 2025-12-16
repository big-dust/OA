package service

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/internal/repository"
)

var (
	ErrMeetingRoomNotFound    = errors.New("meeting room not found")
	ErrBookingNotFound        = errors.New("booking not found")
	ErrBookingConflict        = errors.New("booking time conflict")
	ErrBookingLimitExceeded   = errors.New("already has an active booking")
	ErrBookingInvalidStatus   = errors.New("booking status does not allow this operation")
	ErrBookingNotOwner        = errors.New("can only operate on own booking")
)

// MeetingRoomService handles meeting room business logic
type MeetingRoomService struct {
	roomRepo    *repository.MeetingRoomRepository
	bookingRepo *repository.MeetingRoomBookingRepository
	db          *gorm.DB
}

// NewMeetingRoomService creates a new meeting room service
func NewMeetingRoomService(db *gorm.DB) *MeetingRoomService {
	return &MeetingRoomService{
		roomRepo:    repository.NewMeetingRoomRepository(db),
		bookingRepo: repository.NewMeetingRoomBookingRepository(db),
		db:          db,
	}
}

// CreateMeetingRoomRequest represents the request to create a meeting room
type CreateMeetingRoomRequest struct {
	Name     string `json:"name" binding:"required"`
	Capacity int    `json:"capacity" binding:"required,min=1"`
	Location string `json:"location"`
}

// UpdateMeetingRoomRequest represents the request to update a meeting room
type UpdateMeetingRoomRequest struct {
	Name     string `json:"name"`
	Capacity int    `json:"capacity"`
	Location string `json:"location"`
}


// CreateBookingRequest represents the request to create a booking
type CreateBookingRequest struct {
	MeetingRoomID uint   `json:"meeting_room_id" binding:"required"`
	BookingDate   string `json:"booking_date" binding:"required"` // YYYY-MM-DD format
	StartTime     string `json:"start_time" binding:"required"`   // HH:MM format
	EndTime       string `json:"end_time" binding:"required"`     // HH:MM format
}

// BookingConflictInfo contains information about a conflicting booking
type BookingConflictInfo struct {
	BookingID    uint   `json:"booking_id"`
	EmployeeName string `json:"employee_name"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
}

// ===== Meeting Room Management (Super Admin) =====

// CreateMeetingRoom creates a new meeting room
// Implements Requirement 8.1: Super admin adds new meeting room
func (s *MeetingRoomService) CreateMeetingRoom(req *CreateMeetingRoomRequest) (*model.MeetingRoom, error) {
	room := &model.MeetingRoom{
		Name:     req.Name,
		Capacity: req.Capacity,
		Location: req.Location,
	}

	if err := s.roomRepo.Create(room); err != nil {
		return nil, err
	}

	return room, nil
}

// GetMeetingRoomByID retrieves a meeting room by ID
func (s *MeetingRoomService) GetMeetingRoomByID(id uint) (*model.MeetingRoom, error) {
	room, err := s.roomRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrMeetingRoomNotFound) {
			return nil, ErrMeetingRoomNotFound
		}
		return nil, err
	}
	return room, nil
}

// GetAllMeetingRooms retrieves all meeting rooms
func (s *MeetingRoomService) GetAllMeetingRooms() ([]model.MeetingRoom, error) {
	return s.roomRepo.GetAll()
}


// UpdateMeetingRoom updates a meeting room
// Implements Requirement 8.2: Super admin updates meeting room info
func (s *MeetingRoomService) UpdateMeetingRoom(id uint, req *UpdateMeetingRoomRequest) (*model.MeetingRoom, error) {
	room, err := s.roomRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrMeetingRoomNotFound) {
			return nil, ErrMeetingRoomNotFound
		}
		return nil, err
	}

	// Update fields if provided
	if req.Name != "" {
		room.Name = req.Name
	}
	if req.Capacity > 0 {
		room.Capacity = req.Capacity
	}
	if req.Location != "" {
		room.Location = req.Location
	}

	if err := s.roomRepo.Update(room); err != nil {
		return nil, err
	}

	return room, nil
}

// DeleteMeetingRoom deletes a meeting room
// Implements Requirement 8.3: Super admin deletes meeting room
func (s *MeetingRoomService) DeleteMeetingRoom(id uint) error {
	err := s.roomRepo.Delete(id)
	if err != nil {
		if errors.Is(err, repository.ErrMeetingRoomNotFound) {
			return ErrMeetingRoomNotFound
		}
		return err
	}
	return nil
}

// ===== Meeting Room Availability =====

// RoomAvailability represents a meeting room's availability for a date
type RoomAvailability struct {
	Room     model.MeetingRoom         `json:"room"`
	Bookings []model.MeetingRoomBooking `json:"bookings"`
}

// GetRoomAvailability retrieves a meeting room's availability for a specific date
// Implements Requirement 8.4: Employee views meeting room availability
func (s *MeetingRoomService) GetRoomAvailability(roomID uint, dateStr string) (*RoomAvailability, error) {
	room, err := s.roomRepo.GetByID(roomID)
	if err != nil {
		if errors.Is(err, repository.ErrMeetingRoomNotFound) {
			return nil, ErrMeetingRoomNotFound
		}
		return nil, err
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, errors.New("invalid date format, expected YYYY-MM-DD")
	}

	bookings, err := s.bookingRepo.GetByMeetingRoomAndDate(roomID, date)
	if err != nil {
		return nil, err
	}

	return &RoomAvailability{
		Room:     *room,
		Bookings: bookings,
	}, nil
}


// ===== Booking Management =====

// CreateBooking creates a new meeting room booking
// Implements Property 12: 会议室预定冲突检测
// Implements Property 13: 员工单预定限制
// Implements Requirement 8.5, 8.6, 8.7, 8.8: Booking with conflict check and single booking limit
func (s *MeetingRoomService) CreateBooking(employeeID uint, req *CreateBookingRequest) (*model.MeetingRoomBooking, *BookingConflictInfo, error) {
	// Validate meeting room exists
	_, err := s.roomRepo.GetByID(req.MeetingRoomID)
	if err != nil {
		if errors.Is(err, repository.ErrMeetingRoomNotFound) {
			return nil, nil, ErrMeetingRoomNotFound
		}
		return nil, nil, err
	}

	// Parse booking date
	bookingDate, err := time.Parse("2006-01-02", req.BookingDate)
	if err != nil {
		return nil, nil, errors.New("invalid date format, expected YYYY-MM-DD")
	}

	// Validate time format and order
	if req.StartTime >= req.EndTime {
		return nil, nil, errors.New("start time must be before end time")
	}

	// Property 13: Check if employee already has an active booking
	hasActive, err := s.bookingRepo.HasActiveBooking(employeeID)
	if err != nil {
		return nil, nil, err
	}
	if hasActive {
		return nil, nil, ErrBookingLimitExceeded
	}

	// Property 12: Check for booking conflicts
	hasConflict, conflictBooking, err := s.bookingRepo.HasConflict(req.MeetingRoomID, bookingDate, req.StartTime, req.EndTime)
	if err != nil {
		return nil, nil, err
	}
	if hasConflict {
		conflictInfo := &BookingConflictInfo{
			BookingID:    conflictBooking.ID,
			EmployeeName: conflictBooking.Employee.Name,
			StartTime:    conflictBooking.StartTime,
			EndTime:      conflictBooking.EndTime,
		}
		return nil, conflictInfo, ErrBookingConflict
	}

	// Create booking
	booking := &model.MeetingRoomBooking{
		EmployeeID:    employeeID,
		MeetingRoomID: req.MeetingRoomID,
		BookingDate:   bookingDate,
		StartTime:     req.StartTime,
		EndTime:       req.EndTime,
		Status:        model.BookingStatusActive,
	}

	if err := s.bookingRepo.Create(booking); err != nil {
		return nil, nil, err
	}

	// Reload with associations
	result, err := s.bookingRepo.GetByID(booking.ID)
	return result, nil, err
}


// GetBookingByID retrieves a booking by ID
func (s *MeetingRoomService) GetBookingByID(id uint) (*model.MeetingRoomBooking, error) {
	booking, err := s.bookingRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrBookingNotFound) {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}
	return booking, nil
}

// GetMyBookings retrieves all bookings for an employee
// Implements Requirement 8.10: Employee views their bookings
func (s *MeetingRoomService) GetMyBookings(employeeID uint) ([]model.MeetingRoomBooking, error) {
	return s.bookingRepo.GetByEmployeeID(employeeID)
}

// CompleteBooking marks a booking as completed
// Implements Requirement 8.9: Employee marks booking as completed
func (s *MeetingRoomService) CompleteBooking(bookingID uint, employeeID uint) (*model.MeetingRoomBooking, error) {
	booking, err := s.bookingRepo.GetByID(bookingID)
	if err != nil {
		if errors.Is(err, repository.ErrBookingNotFound) {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	// Can only complete own booking
	if booking.EmployeeID != employeeID {
		return nil, ErrBookingNotOwner
	}

	// Can only complete active bookings
	if booking.Status != model.BookingStatusActive {
		return nil, ErrBookingInvalidStatus
	}

	booking.Status = model.BookingStatusCompleted
	if err := s.bookingRepo.Update(booking); err != nil {
		return nil, err
	}

	return booking, nil
}

// CancelBooking cancels a booking
// Implements Property 14: 会议室预定取消释放时间段
// Implements Requirement 8.11: Employee cancels active booking
func (s *MeetingRoomService) CancelBooking(bookingID uint, employeeID uint) (*model.MeetingRoomBooking, error) {
	booking, err := s.bookingRepo.GetByID(bookingID)
	if err != nil {
		if errors.Is(err, repository.ErrBookingNotFound) {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	// Can only cancel own booking
	if booking.EmployeeID != employeeID {
		return nil, ErrBookingNotOwner
	}

	// Can only cancel active bookings
	if booking.Status != model.BookingStatusActive {
		return nil, ErrBookingInvalidStatus
	}

	// Property 14: Cancelling releases the time slot for others
	booking.Status = model.BookingStatusCancelled
	if err := s.bookingRepo.Update(booking); err != nil {
		return nil, err
	}

	return booking, nil
}
