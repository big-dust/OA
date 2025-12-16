package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"oa-system/config"
	"oa-system/internal/handler"
	"oa-system/internal/middleware"
	"oa-system/internal/model"
	"oa-system/internal/service"
	"oa-system/migrations"
	"oa-system/pkg/jwt"
)

func main() {
	log.Println("OA System starting...")

	// Load configuration
	cfg := config.Load()
	log.Printf("Database config: %s:%s@%s:%s/%s", cfg.Database.User, "***", cfg.Database.Host, cfg.Database.Port, cfg.Database.DBName)

	// Initialize database
	if err := model.InitDB(&cfg.Database); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run auto migration
	if err := model.AutoMigrate(); err != nil {
		log.Fatalf("Failed to run auto migration: %v", err)
	}

	// Seed initial data
	if err := migrations.SeedDatabase(model.GetDB()); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	log.Println("Database initialized successfully!")

	// Initialize JWT manager
	jwtManager := jwt.NewJWTManager(cfg.JWT.Secret, cfg.JWT.ExpireHour)

	// Initialize services
	authService := service.NewAuthService(model.GetDB(), jwtManager)
	employeeService := service.NewEmployeeService(model.GetDB())
	attendanceService := service.NewAttendanceService(model.GetDB())
	leaveService := service.NewLeaveService(model.GetDB())
	deviceService := service.NewDeviceService(model.GetDB())
	meetingRoomService := service.NewMeetingRoomService(model.GetDB())
	contractService := service.NewContractService(model.GetDB())
	salaryService := service.NewSalaryService(model.GetDB())

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	employeeHandler := handler.NewEmployeeHandler(employeeService)
	attendanceHandler := handler.NewAttendanceHandler(attendanceService)
	leaveHandler := handler.NewLeaveHandler(leaveService)
	deviceHandler := handler.NewDeviceHandler(deviceService)
	meetingRoomHandler := handler.NewMeetingRoomHandler(meetingRoomService)
	contractHandler := handler.NewContractHandler(contractService)
	salaryHandler := handler.NewSalaryHandler(salaryService)

	// Setup Gin router
	gin.SetMode(cfg.Server.Mode)
	router := gin.Default()

	// Setup routes
	setupRoutes(router, jwtManager, authHandler, employeeHandler, attendanceHandler, leaveHandler, deviceHandler, meetingRoomHandler, contractHandler, salaryHandler)

	// Start server with graceful shutdown
	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: router,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func setupRoutes(router *gin.Engine, jwtManager *jwt.JWTManager, authHandler *handler.AuthHandler, employeeHandler *handler.EmployeeHandler, attendanceHandler *handler.AttendanceHandler, leaveHandler *handler.LeaveHandler, deviceHandler *handler.DeviceHandler, meetingRoomHandler *handler.MeetingRoomHandler, contractHandler *handler.ContractHandler, salaryHandler *handler.SalaryHandler) {
	api := router.Group("/api")

	// Public routes (no authentication required)
	auth := api.Group("/auth")
	{
		auth.POST("/login", authHandler.Login)
	}

	// Protected routes (authentication required)
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(jwtManager))
	{
		// Auth routes that require authentication but not password change
		protectedAuth := protected.Group("/auth")
		{
			protectedAuth.POST("/change-password", authHandler.ChangePassword)
			protectedAuth.GET("/me", authHandler.GetCurrentUser)
		}

		// Employee routes
		employees := protected.Group("/employees")
		{
			employees.GET("", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), employeeHandler.List)
			employees.GET("/me", employeeHandler.GetMe)
			employees.GET("/:id", employeeHandler.GetByID)
			employees.POST("", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), employeeHandler.Create)
			employees.PUT("/:id", employeeHandler.Update)
			employees.PUT("/:id/role", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), employeeHandler.UpdateRole)
			employees.PUT("/:id/supervisor", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), employeeHandler.UpdateSupervisor)
			employees.PUT("/:id/status", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), employeeHandler.UpdateStatus)
			employees.DELETE("/:id", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), employeeHandler.Delete)
		}

		// Attendance routes
		attendance := protected.Group("/attendance")
		{
			attendance.POST("/sign-in", attendanceHandler.SignIn)
			attendance.POST("/sign-out", attendanceHandler.SignOut)
			attendance.GET("/today", attendanceHandler.GetTodayStatus)
			attendance.GET("", attendanceHandler.GetMonthlyRecords)
		}

		// Leave routes
		leaves := protected.Group("/leaves")
		{
			leaves.POST("", leaveHandler.Create)
			leaves.GET("", leaveHandler.GetMyLeaves)
			leaves.GET("/pending", middleware.RequireRole(model.RoleSupervisor, model.RoleSuperAdmin), leaveHandler.GetPending)
			leaves.PUT("/:id/approve", middleware.RequireRole(model.RoleSupervisor, model.RoleSuperAdmin), leaveHandler.Approve)
			leaves.PUT("/:id/reject", middleware.RequireRole(model.RoleSupervisor, model.RoleSuperAdmin), leaveHandler.Reject)
			leaves.PUT("/:id/cancel", leaveHandler.Cancel)
		}

		// Device routes
		devices := protected.Group("/devices")
		{
			devices.GET("", deviceHandler.GetAllDevices)
			devices.GET("/available", deviceHandler.GetAvailableDevices)
			devices.GET("/:id", deviceHandler.GetDevice)
			devices.POST("", middleware.RequireRole(model.RoleDeviceAdmin, model.RoleSuperAdmin), deviceHandler.CreateDevice)
			devices.PUT("/:id", middleware.RequireRole(model.RoleDeviceAdmin, model.RoleSuperAdmin), deviceHandler.UpdateDevice)
			devices.DELETE("/:id", middleware.RequireRole(model.RoleDeviceAdmin, model.RoleSuperAdmin), deviceHandler.DeleteDevice)
		}

		// Device request routes
		deviceRequests := protected.Group("/device-requests")
		{
			deviceRequests.POST("", deviceHandler.CreateRequest)
			deviceRequests.GET("", deviceHandler.GetMyRequests)
			deviceRequests.GET("/pending", middleware.RequireRole(model.RoleDeviceAdmin, model.RoleSuperAdmin), deviceHandler.GetPendingRequests)
			deviceRequests.GET("/return-pending", middleware.RequireRole(model.RoleDeviceAdmin, model.RoleSuperAdmin), deviceHandler.GetReturnPendingRequests)
			deviceRequests.PUT("/:id/approve", middleware.RequireRole(model.RoleDeviceAdmin, model.RoleSuperAdmin), deviceHandler.ApproveRequest)
			deviceRequests.PUT("/:id/reject", middleware.RequireRole(model.RoleDeviceAdmin, model.RoleSuperAdmin), deviceHandler.RejectRequest)
			deviceRequests.PUT("/:id/collect", deviceHandler.CollectDevice)
			deviceRequests.PUT("/:id/return", deviceHandler.InitiateReturn)
			deviceRequests.PUT("/:id/confirm-return", middleware.RequireRole(model.RoleDeviceAdmin, model.RoleSuperAdmin), deviceHandler.ConfirmReturn)
			deviceRequests.PUT("/:id/cancel", deviceHandler.CancelRequest)
		}

		// Meeting room routes
		meetingRooms := protected.Group("/meeting-rooms")
		{
			meetingRooms.GET("", meetingRoomHandler.GetAllMeetingRooms)
			meetingRooms.GET("/:id", meetingRoomHandler.GetMeetingRoom)
			meetingRooms.GET("/:id/availability", meetingRoomHandler.GetRoomAvailability)
			meetingRooms.POST("", middleware.RequireRole(model.RoleSuperAdmin), meetingRoomHandler.CreateMeetingRoom)
			meetingRooms.PUT("/:id", middleware.RequireRole(model.RoleSuperAdmin), meetingRoomHandler.UpdateMeetingRoom)
			meetingRooms.DELETE("/:id", middleware.RequireRole(model.RoleSuperAdmin), meetingRoomHandler.DeleteMeetingRoom)
		}

		// Meeting room booking routes
		meetingRoomBookings := protected.Group("/meeting-room-bookings")
		{
			meetingRoomBookings.POST("", meetingRoomHandler.CreateBooking)
			meetingRoomBookings.GET("", meetingRoomHandler.GetMyBookings)
			meetingRoomBookings.PUT("/:id/complete", meetingRoomHandler.CompleteBooking)
			meetingRoomBookings.PUT("/:id/cancel", meetingRoomHandler.CancelBooking)
		}

		// Contract template routes
		contractTemplates := protected.Group("/contract-templates")
		{
			contractTemplates.GET("", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), contractHandler.ListTemplates)
			contractTemplates.GET("/:id", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), contractHandler.GetTemplateByID)
		}

		// Contract routes
		contracts := protected.Group("/contracts")
		{
			contracts.POST("", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), contractHandler.Create)
			contracts.GET("", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), contractHandler.List)
			contracts.GET("/my", contractHandler.GetMyContracts)
			contracts.GET("/:id", contractHandler.GetByID)
			contracts.PUT("/:id/sign", contractHandler.Sign)
			contracts.DELETE("/:id", middleware.RequireRole(model.RoleHR, model.RoleSuperAdmin), contractHandler.Delete)
		}

		// Salary routes
		salaries := protected.Group("/salaries")
		{
			salaries.POST("", middleware.RequireRole(model.RoleFinance, model.RoleSuperAdmin), salaryHandler.Create)
			salaries.GET("", middleware.RequireRole(model.RoleFinance, model.RoleSuperAdmin), salaryHandler.List)
			salaries.GET("/my", salaryHandler.GetMy)
			salaries.GET("/:id", salaryHandler.GetByID)
		}
	}
}
