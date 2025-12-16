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

// SalaryHandler handles salary HTTP requests
type SalaryHandler struct {
	salaryService *service.SalaryService
}

// NewSalaryHandler creates a new salary handler
func NewSalaryHandler(salaryService *service.SalaryService) *SalaryHandler {
	return &SalaryHandler{
		salaryService: salaryService,
	}
}

// Create creates a new salary record
// POST /api/salaries
func (h *SalaryHandler) Create(c *gin.Context) {
	var req service.CreateSalaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	salary, err := h.salaryService.Create(&req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmployeeNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
		case errors.Is(err, service.ErrSalaryDuplicate):
			c.JSON(http.StatusConflict, gin.H{
				"code":    "SALARY_DUPLICATE",
				"message": "Salary record already exists for this employee and month",
			})
		case errors.Is(err, service.ErrInvalidMonth):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INVALID_MONTH",
				"message": "Invalid month format, expected YYYY-MM",
			})
		case errors.Is(err, service.ErrInvalidSalaryData):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INVALID_SALARY_DATA",
				"message": "Invalid salary data: values cannot be negative",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create salary record",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, salary)
}

// List returns all salary records with optional filters (for finance role)
// GET /api/salaries
func (h *SalaryHandler) List(c *gin.Context) {
	filters := make(map[string]interface{})

	if employeeIDStr := c.Query("employee_id"); employeeIDStr != "" {
		employeeID, err := strconv.ParseUint(employeeIDStr, 10, 32)
		if err == nil {
			filters["employee_id"] = uint(employeeID)
		}
	}
	if month := c.Query("month"); month != "" {
		filters["month"] = month
	}

	salaries, err := h.salaryService.List(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve salary records",
		})
		return
	}

	c.JSON(http.StatusOK, salaries)
}

// GetMy returns the current user's salary records
// GET /api/salaries/my
// Implements Property 4: Data isolation - only returns records belonging to the employee
// Implements Property 5: Records are ordered by month descending
func (h *SalaryHandler) GetMy(c *gin.Context) {
	userID := middleware.GetUserID(c)

	salaries, err := h.salaryService.ListByEmployeeID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve salary records",
		})
		return
	}

	c.JSON(http.StatusOK, salaries)
}


// GetByID returns a salary record by ID
// GET /api/salaries/:id
func (h *SalaryHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid salary ID",
		})
		return
	}

	currentUserID := middleware.GetUserID(c)
	currentRole := middleware.GetRole(c)

	var salary *model.Salary

	// Finance can view any salary record
	if currentRole == model.RoleFinance || currentRole == model.RoleSuperAdmin {
		salary, err = h.salaryService.GetByID(uint(id))
	} else {
		// Regular employees can only view their own salary records
		// Property 4: Data isolation
		salary, err = h.salaryService.GetByIDForEmployee(uint(id), currentUserID)
	}

	if err != nil {
		if errors.Is(err, service.ErrSalaryNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "SALARY_NOT_FOUND",
				"message": "Salary record not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve salary record",
		})
		return
	}

	c.JSON(http.StatusOK, salary)
}
