package model

import (
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"oa-system/config"
)

var DB *gorm.DB

// InitDB initializes the database connection
func InitDB(cfg *config.DatabaseConfig) error {
	var err error
	
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	DB, err = gorm.Open(mysql.Open(cfg.DSN()), gormConfig)
	if err != nil {
		return err
	}

	log.Println("Database connected successfully")
	return nil
}

// AutoMigrate runs auto migration for all models
func AutoMigrate() error {
	log.Println("Running auto migration...")
	return DB.AutoMigrate(AllModels()...)
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
