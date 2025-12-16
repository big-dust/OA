package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"oa-system/internal/middleware"
	"oa-system/internal/service"
)

// DeviceHandler handles device HTTP requests
type DeviceHandler struct {
	deviceService *service.DeviceService
}

// NewDeviceHandler creates a new device handler
func NewDeviceHandler(deviceService *service.DeviceService) *DeviceHandler {
	return &DeviceHandler{
		deviceService: deviceService,
	}
}

// ===== Device Management (Device Admin) =====

// CreateDevice handles creating a new device
// POST /api/devices
func (h *DeviceHandler) CreateDevice(c *gin.Context) {
	var req service.CreateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	device, err := h.deviceService.CreateDevice(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "创建设备失败",
		})
		return
	}

	c.JSON(http.StatusCreated, device)
}


// GetAllDevices handles getting all devices
// GET /api/devices
func (h *DeviceHandler) GetAllDevices(c *gin.Context) {
	devices, err := h.deviceService.GetAllDevices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取设备列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, devices)
}

// GetAvailableDevices handles getting available devices
// GET /api/devices/available
func (h *DeviceHandler) GetAvailableDevices(c *gin.Context) {
	devices, err := h.deviceService.GetAvailableDevices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取可用设备列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, devices)
}

// GetDevice handles getting a device by ID
// GET /api/devices/:id
func (h *DeviceHandler) GetDevice(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备ID",
		})
		return
	}

	device, err := h.deviceService.GetDeviceByID(uint(deviceID))
	if err != nil {
		if errors.Is(err, service.ErrDeviceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取设备失败",
		})
		return
	}

	c.JSON(http.StatusOK, device)
}


// UpdateDevice handles updating a device
// PUT /api/devices/:id
func (h *DeviceHandler) UpdateDevice(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备ID",
		})
		return
	}

	var req service.UpdateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	device, err := h.deviceService.UpdateDevice(uint(deviceID), &req)
	if err != nil {
		if errors.Is(err, service.ErrDeviceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "更新设备失败",
		})
		return
	}

	c.JSON(http.StatusOK, device)
}

// DeleteDevice handles deleting a device
// DELETE /api/devices/:id
func (h *DeviceHandler) DeleteDevice(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备ID",
		})
		return
	}

	err = h.deviceService.DeleteDevice(uint(deviceID))
	if err != nil {
		if errors.Is(err, service.ErrDeviceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "删除设备失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "设备删除成功",
	})
}


// ===== Device Request Management =====

// CreateRequest handles creating a new device request
// POST /api/device-requests
func (h *DeviceHandler) CreateRequest(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	var req service.CreateDeviceRequestInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	request, err := h.deviceService.CreateRequest(employeeID, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrDeviceNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备不存在",
			})
		case errors.Is(err, service.ErrDeviceNotAvailable):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "DEVICE_NOT_AVAILABLE",
				"message": "设备不可用",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "创建设备申请失败",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, request)
}

// GetMyRequests handles getting the current employee's device requests
// GET /api/device-requests
func (h *DeviceHandler) GetMyRequests(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	requests, err := h.deviceService.GetMyRequests(employeeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取设备申请记录失败",
		})
		return
	}

	c.JSON(http.StatusOK, requests)
}


// GetPendingRequests handles getting pending device requests for device admin
// GET /api/device-requests/pending
func (h *DeviceHandler) GetPendingRequests(c *gin.Context) {
	requests, err := h.deviceService.GetPendingRequests()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取待审批设备申请失败",
		})
		return
	}

	c.JSON(http.StatusOK, requests)
}

// GetReturnPendingRequests handles getting return pending device requests
// GET /api/device-requests/return-pending
func (h *DeviceHandler) GetReturnPendingRequests(c *gin.Context) {
	requests, err := h.deviceService.GetReturnPendingRequests()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "获取待确认归还申请失败",
		})
		return
	}

	c.JSON(http.StatusOK, requests)
}

// ApproveRequest handles approving a device request
// PUT /api/device-requests/:id/approve
func (h *DeviceHandler) ApproveRequest(c *gin.Context) {
	requestID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备申请ID",
		})
		return
	}

	request, err := h.deviceService.ApproveRequest(uint(requestID))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrDeviceRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备申请不存在",
			})
		case errors.Is(err, service.ErrDeviceRequestInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "DEVICE_REQUEST_INVALID_STATUS",
				"message": "设备申请状态不允许此操作",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "审批设备申请失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, request)
}


// RejectRequest handles rejecting a device request
// PUT /api/device-requests/:id/reject
func (h *DeviceHandler) RejectRequest(c *gin.Context) {
	requestID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备申请ID",
		})
		return
	}

	var req service.RejectDeviceRequestInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "请提供拒绝原因",
		})
		return
	}

	request, err := h.deviceService.RejectRequest(uint(requestID), req.RejectReason)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrDeviceRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备申请不存在",
			})
		case errors.Is(err, service.ErrDeviceRequestInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "DEVICE_REQUEST_INVALID_STATUS",
				"message": "设备申请状态不允许此操作",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "拒绝设备申请失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, request)
}

// CollectDevice handles confirming device collection by employee
// PUT /api/device-requests/:id/collect
func (h *DeviceHandler) CollectDevice(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	requestID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备申请ID",
		})
		return
	}

	request, err := h.deviceService.CollectDevice(uint(requestID), employeeID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrDeviceRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备申请不存在",
			})
		case errors.Is(err, service.ErrDeviceRequestNotOwner):
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "只能领取自己的设备申请",
			})
		case errors.Is(err, service.ErrDeviceRequestInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "DEVICE_REQUEST_INVALID_STATUS",
				"message": "设备申请状态不允许此操作",
			})
		case errors.Is(err, service.ErrDeviceNotAvailable):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "DEVICE_NOT_AVAILABLE",
				"message": "设备不可用",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "领取设备失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, request)
}


// InitiateReturn handles initiating device return by employee
// PUT /api/device-requests/:id/return
func (h *DeviceHandler) InitiateReturn(c *gin.Context) {
	employeeID := middleware.GetUserID(c)

	requestID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备申请ID",
		})
		return
	}

	request, err := h.deviceService.InitiateReturn(uint(requestID), employeeID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrDeviceRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备申请不存在",
			})
		case errors.Is(err, service.ErrDeviceRequestNotOwner):
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "只能归还自己的设备",
			})
		case errors.Is(err, service.ErrDeviceRequestInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "DEVICE_REQUEST_INVALID_STATUS",
				"message": "设备申请状态不允许此操作",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "发起归还失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, request)
}

// ConfirmReturn handles confirming device return by device admin
// PUT /api/device-requests/:id/confirm-return
func (h *DeviceHandler) ConfirmReturn(c *gin.Context) {
	requestID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备申请ID",
		})
		return
	}

	request, err := h.deviceService.ConfirmReturn(uint(requestID))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrDeviceRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "NOT_FOUND",
				"message": "设备申请不存在",
			})
		case errors.Is(err, service.ErrDeviceRequestInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "DEVICE_REQUEST_INVALID_STATUS",
				"message": "设备申请状态不允许此操作",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "确认归还失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, request)
}


// CancelRequest handles cancelling a device request
// PUT /api/device-requests/:id/cancel
func (h *DeviceHandler) CancelRequest(c *gin.Context) {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetRole(c)

	requestID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "无效的设备申请ID",
		})
		return
	}

	// Check if user is device admin or the employee themselves
	if userRole == "device_admin" || userRole == "super_admin" {
		// Try to cancel as admin first
		request, err := h.deviceService.CancelRequestByAdmin(uint(requestID))
		if err == nil {
			c.JSON(http.StatusOK, request)
			return
		}
		if !errors.Is(err, service.ErrDeviceRequestNotOwner) {
			// If error is not about ownership, handle it
			handleCancelError(c, err)
			return
		}
		// Not the owner, try as employee
		request, err = h.deviceService.CancelRequestByEmployee(uint(requestID), userID)
		if err != nil {
			handleCancelError(c, err)
			return
		}
		c.JSON(http.StatusOK, request)
		return
	}

	// Cancel as employee
	request, err := h.deviceService.CancelRequestByEmployee(uint(requestID), userID)
	if err != nil {
		handleCancelError(c, err)
		return
	}

	c.JSON(http.StatusOK, request)
}

func handleCancelError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrDeviceRequestNotFound):
		c.JSON(http.StatusNotFound, gin.H{
			"code":    "NOT_FOUND",
			"message": "设备申请不存在",
		})
	case errors.Is(err, service.ErrDeviceRequestInvalidStatus):
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "DEVICE_REQUEST_INVALID_STATUS",
			"message": "设备申请状态不允许此操作",
		})
	case errors.Is(err, service.ErrDeviceRequestNotOwner):
		c.JSON(http.StatusForbidden, gin.H{
			"code":    "FORBIDDEN",
			"message": "无权取消此设备申请",
		})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "取消设备申请失败",
		})
	}
}
