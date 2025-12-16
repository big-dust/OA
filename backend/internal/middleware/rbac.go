package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"oa-system/internal/model"
)

// Permission represents a system permission
type Permission string

// Permission constants
const (
	// Employee permissions (base permissions for all roles)
	PermViewProfile         Permission = "view_profile"
	PermEditProfile         Permission = "edit_profile"
	PermViewAttendance      Permission = "view_attendance"
	PermSignInOut           Permission = "sign_in_out"
	PermViewLeave           Permission = "view_leave"
	PermApplyLeave          Permission = "apply_leave"
	PermCancelLeave         Permission = "cancel_leave"
	PermViewDevices         Permission = "view_devices"
	PermApplyDevice         Permission = "apply_device"
	PermCollectDevice       Permission = "collect_device"
	PermReturnDevice        Permission = "return_device"
	PermCancelDeviceRequest Permission = "cancel_device_request"
	PermViewMeetingRooms    Permission = "view_meeting_rooms"
	PermBookMeetingRoom     Permission = "book_meeting_room"
	PermCancelBooking       Permission = "cancel_booking"
	PermCompleteBooking     Permission = "complete_booking"
	PermViewOwnSalary       Permission = "view_own_salary"
	PermViewOwnContracts    Permission = "view_own_contracts"
	PermSignContract        Permission = "sign_contract"
	PermViewNotifications   Permission = "view_notifications"

	// Super Admin permissions
	PermManageRoles        Permission = "manage_roles"
	PermManageEmployees    Permission = "manage_employees"
	PermManageMeetingRooms Permission = "manage_meeting_rooms"

	// HR permissions
	PermManageAccounts  Permission = "manage_accounts"
	PermManageContracts Permission = "manage_contracts"

	// Finance permissions
	PermManageSalaries   Permission = "manage_salaries"
	PermViewAllSalaries  Permission = "view_all_salaries"

	// Device Admin permissions
	PermManageDevices        Permission = "manage_devices"
	PermApproveDeviceRequest Permission = "approve_device_request"
	PermConfirmDeviceReturn  Permission = "confirm_device_return"

	// Supervisor permissions
	PermApproveLeave Permission = "approve_leave"
)


// Base permissions for all employees
var employeePermissions = []Permission{
	PermViewProfile,
	PermEditProfile,
	PermViewAttendance,
	PermSignInOut,
	PermViewLeave,
	PermApplyLeave,
	PermCancelLeave,
	PermViewDevices,
	PermApplyDevice,
	PermCollectDevice,
	PermReturnDevice,
	PermCancelDeviceRequest,
	PermViewMeetingRooms,
	PermBookMeetingRoom,
	PermCancelBooking,
	PermCompleteBooking,
	PermViewOwnSalary,
	PermViewOwnContracts,
	PermSignContract,
	PermViewNotifications,
}

// RolePermissions maps roles to their permissions
var RolePermissions = map[string][]Permission{
	model.RoleEmployee: employeePermissions,

	model.RoleSuperAdmin: append(
		employeePermissions,
		PermManageRoles,
		PermManageEmployees,
		PermManageMeetingRooms,
		PermManageAccounts,
	),

	model.RoleHR: append(
		employeePermissions,
		PermManageEmployees,
		PermManageAccounts,
		PermManageContracts,
		PermManageRoles,
	),

	model.RoleFinance: append(
		employeePermissions,
		PermManageSalaries,
		PermViewAllSalaries,
	),

	model.RoleDeviceAdmin: append(
		employeePermissions,
		PermManageDevices,
		PermApproveDeviceRequest,
		PermConfirmDeviceReturn,
	),

	model.RoleSupervisor: append(
		employeePermissions,
		PermApproveLeave,
	),
}

// HasPermission checks if a role has a specific permission
func HasPermission(role string, permission Permission) bool {
	permissions, exists := RolePermissions[role]
	if !exists {
		return false
	}

	for _, p := range permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// HasAnyPermission checks if a role has any of the specified permissions
func HasAnyPermission(role string, permissions ...Permission) bool {
	for _, perm := range permissions {
		if HasPermission(role, perm) {
			return true
		}
	}
	return false
}

// HasAllPermissions checks if a role has all of the specified permissions
func HasAllPermissions(role string, permissions ...Permission) bool {
	for _, perm := range permissions {
		if !HasPermission(role, perm) {
			return false
		}
	}
	return true
}

// GetRolePermissions returns all permissions for a given role
func GetRolePermissions(role string) []Permission {
	permissions, exists := RolePermissions[role]
	if !exists {
		return []Permission{}
	}
	return permissions
}

// IsValidRole checks if a role is valid
func IsValidRole(role string) bool {
	_, exists := RolePermissions[role]
	return exists
}


// RequirePermission creates a middleware that checks for a specific permission
func RequirePermission(permission Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRole(c)
		if role == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_CONTEXT_ERROR",
				"message": "Authentication context not found",
			})
			c.Abort()
			return
		}

		if !HasPermission(role, permission) {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "AUTH_PERMISSION_DENIED",
				"message": "You do not have permission to access this resource",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyPermission creates a middleware that checks for any of the specified permissions
func RequireAnyPermission(permissions ...Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRole(c)
		if role == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_CONTEXT_ERROR",
				"message": "Authentication context not found",
			})
			c.Abort()
			return
		}

		if !HasAnyPermission(role, permissions...) {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "AUTH_PERMISSION_DENIED",
				"message": "You do not have permission to access this resource",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAllPermissions creates a middleware that checks for all of the specified permissions
func RequireAllPermissions(permissions ...Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := GetRole(c)
		if role == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_CONTEXT_ERROR",
				"message": "Authentication context not found",
			})
			c.Abort()
			return
		}

		if !HasAllPermissions(role, permissions...) {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "AUTH_PERMISSION_DENIED",
				"message": "You do not have permission to access this resource",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole creates a middleware that checks for a specific role
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole := GetRole(c)
		if userRole == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTH_CONTEXT_ERROR",
				"message": "Authentication context not found",
			})
			c.Abort()
			return
		}

		for _, role := range roles {
			if userRole == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"code":    "AUTH_ROLE_DENIED",
			"message": "Your role does not have access to this resource",
		})
		c.Abort()
	}
}

// RequireSuperAdmin is a convenience middleware for super admin only routes
func RequireSuperAdmin() gin.HandlerFunc {
	return RequireRole(model.RoleSuperAdmin)
}

// RequireHR is a convenience middleware for HR only routes
func RequireHR() gin.HandlerFunc {
	return RequireRole(model.RoleHR)
}

// RequireFinance is a convenience middleware for Finance only routes
func RequireFinance() gin.HandlerFunc {
	return RequireRole(model.RoleFinance)
}

// RequireDeviceAdmin is a convenience middleware for Device Admin only routes
func RequireDeviceAdmin() gin.HandlerFunc {
	return RequireRole(model.RoleDeviceAdmin)
}

// RequireSupervisor is a convenience middleware for Supervisor only routes
func RequireSupervisor() gin.HandlerFunc {
	return RequireRole(model.RoleSupervisor)
}

// RequireHROrSuperAdmin is a convenience middleware for HR or Super Admin routes
func RequireHROrSuperAdmin() gin.HandlerFunc {
	return RequireRole(model.RoleHR, model.RoleSuperAdmin)
}
