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

// EmployeeHandler handles employee HTTP requests
type EmployeeHandler struct {
	employeeService *service.EmployeeService
}

// NewEmployeeHandler creates a new employee handler
func NewEmployeeHandler(employeeService *service.EmployeeService) *EmployeeHandler {
	return &EmployeeHandler{
		employeeService: employeeService,
	}
}

// List returns all employees
// GET /api/employees
func (h *EmployeeHandler) List(c *gin.Context) {
	filters := make(map[string]interface{})
	
	if department := c.Query("department"); department != "" {
		filters["department"] = department
	}
	if role := c.Query("role"); role != "" {
		filters["role"] = role
	}
	if isActive := c.Query("is_active"); isActive != "" {
		filters["is_active"] = isActive == "true"
	}

	employees, err := h.employeeService.List(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve employees",
		})
		return
	}

	c.JSON(http.StatusOK, employees)
}


// GetByID returns an employee by ID
// GET /api/employees/:id
func (h *EmployeeHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid employee ID",
		})
		return
	}

	// Check if user is accessing their own info or has admin/HR role
	currentUserID := middleware.GetUserID(c)
	currentRole := middleware.GetRole(c)
	
	if uint(id) != currentUserID && 
		currentRole != model.RoleSuperAdmin && 
		currentRole != model.RoleHR {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    "FORBIDDEN",
			"message": "You don't have permission to view this employee",
		})
		return
	}

	employee, err := h.employeeService.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, service.ErrEmployeeNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve employee",
		})
		return
	}

	c.JSON(http.StatusOK, employee)
}

// GetMe returns the current authenticated user's info
// GET /api/employees/me
func (h *EmployeeHandler) GetMe(c *gin.Context) {
	userID := middleware.GetUserID(c)
	
	employee, err := h.employeeService.GetByID(userID)
	if err != nil {
		if errors.Is(err, service.ErrEmployeeNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve employee",
		})
		return
	}

	c.JSON(http.StatusOK, employee)
}

// Create creates a new employee
// POST /api/employees
func (h *EmployeeHandler) Create(c *gin.Context) {
	var req service.CreateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	resp, err := h.employeeService.Create(&req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidRole):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INVALID_ROLE",
				"message": "Invalid role specified",
			})
		case errors.Is(err, service.ErrSupervisorNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "SUPERVISOR_NOT_FOUND",
				"message": "Specified supervisor not found",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create employee",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, resp)
}


// Update updates an employee's personal information (self-update)
// PUT /api/employees/:id
func (h *EmployeeHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid employee ID",
		})
		return
	}

	currentUserID := middleware.GetUserID(c)
	currentRole := middleware.GetRole(c)

	// Check if user is updating their own info or has admin/HR role
	if uint(id) == currentUserID {
		// Self-update: limited fields only
		var req service.UpdateEmployeeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid request body",
				"details": err.Error(),
			})
			return
		}

		employee, err := h.employeeService.Update(uint(id), &req)
		if err != nil {
			if errors.Is(err, service.ErrEmployeeNotFound) {
				c.JSON(http.StatusNotFound, gin.H{
					"code":    "EMPLOYEE_NOT_FOUND",
					"message": "Employee not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update employee",
			})
			return
		}

		c.JSON(http.StatusOK, employee)
		return
	}

	// Admin/HR update: more fields allowed
	if currentRole != model.RoleSuperAdmin && currentRole != model.RoleHR {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    "FORBIDDEN",
			"message": "You don't have permission to update this employee",
		})
		return
	}

	var req service.AdminUpdateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	employee, err := h.employeeService.AdminUpdate(uint(id), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmployeeNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
		case errors.Is(err, service.ErrSupervisorNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "SUPERVISOR_NOT_FOUND",
				"message": "Specified supervisor not found",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update employee",
			})
		}
		return
	}

	c.JSON(http.StatusOK, employee)
}

// UpdateRole updates an employee's role
// PUT /api/employees/:id/role
func (h *EmployeeHandler) UpdateRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid employee ID",
		})
		return
	}

	var req service.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	employee, err := h.employeeService.UpdateRole(uint(id), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmployeeNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
		case errors.Is(err, service.ErrInvalidRole):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INVALID_ROLE",
				"message": "Invalid role specified",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update employee role",
			})
		}
		return
	}

	c.JSON(http.StatusOK, employee)
}


// UpdateSupervisor updates an employee's supervisor
// PUT /api/employees/:id/supervisor
func (h *EmployeeHandler) UpdateSupervisor(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid employee ID",
		})
		return
	}

	var req service.UpdateSupervisorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	employee, err := h.employeeService.UpdateSupervisor(uint(id), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmployeeNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
		case errors.Is(err, service.ErrSupervisorNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "SUPERVISOR_NOT_FOUND",
				"message": "Specified supervisor not found",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update employee supervisor",
			})
		}
		return
	}

	c.JSON(http.StatusOK, employee)
}

// UpdateStatus enables or disables an employee account
// PUT /api/employees/:id/status
func (h *EmployeeHandler) UpdateStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid employee ID",
		})
		return
	}

	var req service.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	currentUserID := middleware.GetUserID(c)
	employee, err := h.employeeService.UpdateStatus(uint(id), currentUserID, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmployeeNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
		case errors.Is(err, service.ErrCannotModifySelf):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "CANNOT_MODIFY_SELF",
				"message": "Cannot modify your own account status",
			})
		case errors.Is(err, service.ErrCannotDisableSuperAdmin):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "CANNOT_DISABLE_SUPER_ADMIN",
				"message": "Cannot disable super admin account",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update employee status",
			})
		}
		return
	}

	c.JSON(http.StatusOK, employee)
}

// Delete soft deletes an employee
// DELETE /api/employees/:id
func (h *EmployeeHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid employee ID",
		})
		return
	}

	err = h.employeeService.Delete(uint(id))
	if err != nil {
		if errors.Is(err, service.ErrEmployeeNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to delete employee",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Employee deleted successfully",
	})
}
