package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"oa-system/internal/middleware"
	"oa-system/internal/model"
	"oa-system/internal/service"
)

// LeaveHandler handles leave request HTTP requests
type LeaveHandler struct {
	leaveService *service.LeaveService
}

// NewLeaveHandler creates a new leave handler
func NewLeaveHandler(leaveService *service.LeaveService) *LeaveHandler {
	return &LeaveHandler{
		leaveService: leaveService,
	}
}

// Create handles creating a new leave request
// POST /api/leaves
func (h *LeaveHandler) Create(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	var req service.CreateLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	leave, err := h.leaveService.Create(employeeID, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLeaveInvalidDateRange):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "结束日期必须大于或等于开始日期",
			})
		default:
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusCreated, leave)
}


// GetMyLeaves handles getting the current employee's leave requests
// GET /api/leaves
func (h *LeaveHandler) GetMyLeaves(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	leaves, err := h.leaveService.GetMyLeaves(employeeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取请假记录失败",
		})
		return
	}

	c.JSON(http.StatusOK, leaves)
}

// GetPending handles getting pending leave requests for supervisor approval
// GET /api/leaves/pending
func (h *LeaveHandler) GetPending(c *gin.Context) {
	supervisorID := middleware.GetUserID(c)

	leaves, err := h.leaveService.GetPendingForSupervisor(supervisorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取待审批请假申请失败",
		})
		return
	}

	c.JSON(http.StatusOK, leaves)
}

// Approve handles approving a leave request
// PUT /api/leaves/:id/approve
func (h *LeaveHandler) Approve(c *gin.Context) {
	supervisorID := middleware.GetUserID(c)

	leaveID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的请假申请ID",
		})
		return
	}

	leave, err := h.leaveService.Approve(uint(leaveID), supervisorID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLeaveRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "请假申请不存在",
			})
		case errors.Is(err, service.ErrLeaveInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "LEAVE_INVALID_STATUS",
				"message": "请假申请状态不允许此操作",
			})
		case errors.Is(err, service.ErrLeaveNotSubordinate):
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "只能审批下属的请假申请",
			})
		case errors.Is(err, service.ErrLeaveSelfApproval):
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "不能审批自己的请假申请",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "审批请假申请失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, leave)
}


// Reject handles rejecting a leave request
// PUT /api/leaves/:id/reject
func (h *LeaveHandler) Reject(c *gin.Context) {
	supervisorID := middleware.GetUserID(c)

	leaveID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的请假申请ID",
		})
		return
	}

	var req service.RejectLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请提供拒绝原因",
		})
		return
	}

	leave, err := h.leaveService.Reject(uint(leaveID), supervisorID, req.RejectReason)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLeaveRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "请假申请不存在",
			})
		case errors.Is(err, service.ErrLeaveInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "LEAVE_INVALID_STATUS",
				"message": "请假申请状态不允许此操作",
			})
		case errors.Is(err, service.ErrLeaveNotSubordinate):
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "只能审批下属的请假申请",
			})
		case errors.Is(err, service.ErrLeaveSelfApproval):
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "不能审批自己的请假申请",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "拒绝请假申请失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, leave)
}

// Cancel handles cancelling a leave request
// PUT /api/leaves/:id/cancel
func (h *LeaveHandler) Cancel(c *gin.Context) {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetRole(c)

	leaveID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的请假申请ID",
		})
		return
	}

	var leave *model.LeaveRequest

	// Check if user is supervisor or the employee themselves
	if userRole == model.RoleSupervisor || userRole == model.RoleSuperAdmin {
		// Try to cancel as supervisor first
		leave, err = h.leaveService.CancelBySupervisor(uint(leaveID), userID)
		if errors.Is(err, service.ErrLeaveNotSubordinate) {
			// Not a subordinate, try as employee
			leave, err = h.leaveService.CancelByEmployee(uint(leaveID), userID)
		}
	} else {
		// Cancel as employee
		leave, err = h.leaveService.CancelByEmployee(uint(leaveID), userID)
	}

	if err != nil {
		switch {
		case errors.Is(err, service.ErrLeaveRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "请假申请不存在",
			})
		case errors.Is(err, service.ErrLeaveInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "LEAVE_INVALID_STATUS",
				"message": "请假申请状态不允许此操作",
			})
		default:
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "无权取消此请假申请",
			})
		}
		return
	}

	c.JSON(http.StatusOK, leave)
}
