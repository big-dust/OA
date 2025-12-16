package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"oa-system/internal/middleware"
	"oa-system/internal/service"
)

// AttendanceHandler handles attendance HTTP requests
type AttendanceHandler struct {
	attendanceService *service.AttendanceService
}

// NewAttendanceHandler creates a new attendance handler
func NewAttendanceHandler(attendanceService *service.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{
		attendanceService: attendanceService,
	}
}

// SignIn handles employee sign-in
// POST /api/attendance/sign-in
func (h *AttendanceHandler) SignIn(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	resp, err := h.attendanceService.SignIn(employeeID)
	if err != nil {
		if errors.Is(err, service.ErrAlreadySignedIn) {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "ATTENDANCE_ALREADY_SIGNED_IN",
				"message": "今日已签到",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "签到失败",
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}


// SignOut handles employee sign-out
// POST /api/attendance/sign-out
func (h *AttendanceHandler) SignOut(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	resp, err := h.attendanceService.SignOut(employeeID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrNotSignedIn):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "ATTENDANCE_NOT_SIGNED_IN",
				"message": "未签到不能签退",
			})
		case errors.Is(err, service.ErrAlreadySignedOut):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "ATTENDANCE_ALREADY_SIGNED_OUT",
				"message": "今日已签退",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "签退失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetTodayStatus returns today's attendance status
// GET /api/attendance/today
func (h *AttendanceHandler) GetTodayStatus(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	status, err := h.attendanceService.GetTodayStatus(employeeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取今日考勤状态失败",
		})
		return
	}

	c.JSON(http.StatusOK, status)
}

// GetMonthlyRecords returns attendance records for a specific month
// GET /api/attendance
func (h *AttendanceHandler) GetMonthlyRecords(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	// Parse year and month from query parameters
	var year, month int
	if yearStr := c.Query("year"); yearStr != "" {
		y, err := strconv.Atoi(yearStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "无效的年份参数",
			})
			return
		}
		year = y
	}

	if monthStr := c.Query("month"); monthStr != "" {
		m, err := strconv.Atoi(monthStr)
		if err != nil || m < 1 || m > 12 {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "无效的月份参数",
			})
			return
		}
		month = m
	}

	records, err := h.attendanceService.GetMonthlyRecords(employeeID, year, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取考勤记录失败",
		})
		return
	}

	c.JSON(http.StatusOK, records)
}
