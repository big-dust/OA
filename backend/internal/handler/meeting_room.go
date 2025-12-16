package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"oa-system/internal/middleware"
	"oa-system/internal/service"
)

// MeetingRoomHandler handles meeting room HTTP requests
type MeetingRoomHandler struct {
	meetingRoomService *service.MeetingRoomService
}

// NewMeetingRoomHandler creates a new meeting room handler
func NewMeetingRoomHandler(meetingRoomService *service.MeetingRoomService) *MeetingRoomHandler {
	return &MeetingRoomHandler{
		meetingRoomService: meetingRoomService,
	}
}

// ===== Meeting Room Management (Super Admin) =====

// CreateMeetingRoom handles creating a new meeting room
// POST /api/meeting-rooms
func (h *MeetingRoomHandler) CreateMeetingRoom(c *gin.Context) {
	var req service.CreateMeetingRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	room, err := h.meetingRoomService.CreateMeetingRoom(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "创建会议室失败",
		})
		return
	}

	c.JSON(http.StatusCreated, room)
}


// GetAllMeetingRooms handles getting all meeting rooms
// GET /api/meeting-rooms
func (h *MeetingRoomHandler) GetAllMeetingRooms(c *gin.Context) {
	rooms, err := h.meetingRoomService.GetAllMeetingRooms()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取会议室列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, rooms)
}

// GetMeetingRoom handles getting a meeting room by ID
// GET /api/meeting-rooms/:id
func (h *MeetingRoomHandler) GetMeetingRoom(c *gin.Context) {
	roomID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的会议室ID",
		})
		return
	}

	room, err := h.meetingRoomService.GetMeetingRoomByID(uint(roomID))
	if err != nil {
		if errors.Is(err, service.ErrMeetingRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "会议室不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取会议室失败",
		})
		return
	}

	c.JSON(http.StatusOK, room)
}

// UpdateMeetingRoom handles updating a meeting room
// PUT /api/meeting-rooms/:id
func (h *MeetingRoomHandler) UpdateMeetingRoom(c *gin.Context) {
	roomID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的会议室ID",
		})
		return
	}

	var req service.UpdateMeetingRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	room, err := h.meetingRoomService.UpdateMeetingRoom(uint(roomID), &req)
	if err != nil {
		if errors.Is(err, service.ErrMeetingRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "会议室不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "更新会议室失败",
		})
		return
	}

	c.JSON(http.StatusOK, room)
}


// DeleteMeetingRoom handles deleting a meeting room
// DELETE /api/meeting-rooms/:id
func (h *MeetingRoomHandler) DeleteMeetingRoom(c *gin.Context) {
	roomID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的会议室ID",
		})
		return
	}

	err = h.meetingRoomService.DeleteMeetingRoom(uint(roomID))
	if err != nil {
		if errors.Is(err, service.ErrMeetingRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "会议室不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "删除会议室失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "会议室删除成功",
	})
}

// GetRoomAvailability handles getting a meeting room's availability
// GET /api/meeting-rooms/:id/availability
func (h *MeetingRoomHandler) GetRoomAvailability(c *gin.Context) {
	roomID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的会议室ID",
		})
		return
	}

	date := c.Query("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请提供日期参数 (date=YYYY-MM-DD)",
		})
		return
	}

	availability, err := h.meetingRoomService.GetRoomAvailability(uint(roomID), date)
	if err != nil {
		if errors.Is(err, service.ErrMeetingRoomNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "会议室不存在",
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, availability)
}


// ===== Booking Management =====

// CreateBooking handles creating a new meeting room booking
// POST /api/meeting-room-bookings
func (h *MeetingRoomHandler) CreateBooking(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	var req service.CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	booking, conflictInfo, err := h.meetingRoomService.CreateBooking(employeeID, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrMeetingRoomNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "会议室不存在",
			})
		case errors.Is(err, service.ErrBookingConflict):
			c.JSON(http.StatusConflict, gin.H{
				"code":    "BOOKING_CONFLICT",
				"message": "会议室预定时间冲突",
				"details": conflictInfo,
			})
		case errors.Is(err, service.ErrBookingLimitExceeded):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "BOOKING_LIMIT_EXCEEDED",
				"message": "已有活跃预定，不能再预定",
			})
		default:
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusCreated, booking)
}

// GetMyBookings handles getting the current employee's bookings
// GET /api/meeting-room-bookings
func (h *MeetingRoomHandler) GetMyBookings(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	bookings, err := h.meetingRoomService.GetMyBookings(employeeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取预定记录失败",
		})
		return
	}

	c.JSON(http.StatusOK, bookings)
}


// CompleteBooking handles marking a booking as completed
// PUT /api/meeting-room-bookings/:id/complete
func (h *MeetingRoomHandler) CompleteBooking(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	bookingID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的预定ID",
		})
		return
	}

	booking, err := h.meetingRoomService.CompleteBooking(uint(bookingID), employeeID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrBookingNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "预定不存在",
			})
		case errors.Is(err, service.ErrBookingNotOwner):
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "只能操作自己的预定",
			})
		case errors.Is(err, service.ErrBookingInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "BOOKING_INVALID_STATUS",
				"message": "预定状态不允许此操作",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "完成预定失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, booking)
}

// CancelBooking handles cancelling a booking
// PUT /api/meeting-room-bookings/:id/cancel
func (h *MeetingRoomHandler) CancelBooking(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	bookingID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的预定ID",
		})
		return
	}

	booking, err := h.meetingRoomService.CancelBooking(uint(bookingID), employeeID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrBookingNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "预定不存在",
			})
		case errors.Is(err, service.ErrBookingNotOwner):
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "只能取消自己的预定",
			})
		case errors.Is(err, service.ErrBookingInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "BOOKING_INVALID_STATUS",
				"message": "预定状态不允许此操作",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "取消预定失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, booking)
}
