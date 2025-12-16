package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"oa-system/internal/middleware"
	"oa-system/internal/service"
)

// ContractHandler handles contract HTTP requests
type ContractHandler struct {
	contractService *service.ContractService
}

// NewContractHandler creates a new contract handler
func NewContractHandler(contractService *service.ContractService) *ContractHandler {
	return &ContractHandler{
		contractService: contractService,
	}
}

// ListTemplates returns all contract templates
// GET /api/contract-templates
func (h *ContractHandler) ListTemplates(c *gin.Context) {
	templates, err := h.contractService.ListTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve contract templates",
		})
		return
	}

	c.JSON(http.StatusOK, templates)
}

// GetTemplateByID returns a contract template by ID
// GET /api/contract-templates/:id
func (h *ContractHandler) GetTemplateByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid template ID",
		})
		return
	}

	template, err := h.contractService.GetTemplateByID(uint(id))
	if err != nil {
		if errors.Is(err, service.ErrContractTemplateNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "TEMPLATE_NOT_FOUND",
				"message": "Contract template not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve contract template",
		})
		return
	}

	c.JSON(http.StatusOK, template)
}


// Create creates a new contract
// POST /api/contracts
func (h *ContractHandler) Create(c *gin.Context) {
	var req service.CreateContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	contract, err := h.contractService.Create(&req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmployeeNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "EMPLOYEE_NOT_FOUND",
				"message": "Employee not found",
			})
		case errors.Is(err, service.ErrContractTemplateNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "TEMPLATE_NOT_FOUND",
				"message": "Contract template not found",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create contract",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, contract)
}

// List returns all contracts
// GET /api/contracts
func (h *ContractHandler) List(c *gin.Context) {
	filters := make(map[string]interface{})

	if employeeID := c.Query("employee_id"); employeeID != "" {
		id, err := strconv.ParseUint(employeeID, 10, 32)
		if err == nil {
			filters["employee_id"] = uint(id)
		}
	}
	if contractType := c.Query("type"); contractType != "" {
		filters["type"] = contractType
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}

	contracts, err := h.contractService.List(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve contracts",
		})
		return
	}

	c.JSON(http.StatusOK, contracts)
}


// GetByID returns a contract by ID
// GET /api/contracts/:id
func (h *ContractHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid contract ID",
		})
		return
	}

	contract, err := h.contractService.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, service.ErrContractNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "CONTRACT_NOT_FOUND",
				"message": "Contract not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve contract",
		})
		return
	}

	// Check if user is HR or the contract owner
	currentUserID := middleware.GetUserID(c)
	currentRole := middleware.GetRole(c)

	if contract.EmployeeID != currentUserID &&
		currentRole != "super_admin" &&
		currentRole != "hr" {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    "FORBIDDEN",
			"message": "You don't have permission to view this contract",
		})
		return
	}

	c.JSON(http.StatusOK, contract)
}

// GetMyContracts returns contracts for the current user
// GET /api/contracts/my
func (h *ContractHandler) GetMyContracts(c *gin.Context) {
	userID := middleware.GetUserID(c)

	contracts, err := h.contractService.GetByEmployeeID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to retrieve contracts",
		})
		return
	}

	c.JSON(http.StatusOK, contracts)
}


// Sign signs a contract
// PUT /api/contracts/:id/sign
func (h *ContractHandler) Sign(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid contract ID",
		})
		return
	}

	userID := middleware.GetUserID(c)

	contract, err := h.contractService.Sign(uint(id), userID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrContractNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "CONTRACT_NOT_FOUND",
				"message": "Contract not found",
			})
		case errors.Is(err, service.ErrContractAlreadySigned):
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "CONTRACT_ALREADY_SIGNED",
				"message": "Contract has already been signed",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to sign contract",
			})
		}
		return
	}

	c.JSON(http.StatusOK, contract)
}

// Delete soft deletes a contract
// DELETE /api/contracts/:id
func (h *ContractHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid contract ID",
		})
		return
	}

	err = h.contractService.Delete(uint(id))
	if err != nil {
		if errors.Is(err, service.ErrContractNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "CONTRACT_NOT_FOUND",
				"message": "Contract not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INTERNAL_ERROR",
			"message": "Failed to delete contract",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Contract deleted successfully",
	})
}
