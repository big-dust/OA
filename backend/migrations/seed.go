package migrations

import (
	"log"
	"time"

	"gorm.io/gorm"

	"oa-system/internal/model"
	"oa-system/pkg/password"
)

// SeedDatabase seeds the database with initial data
// Requirements: 11.1, 9.1
func SeedDatabase(db *gorm.DB) error {
	if err := seedSuperAdmin(db); err != nil {
		return err
	}
	if err := seedContractTemplates(db); err != nil {
		return err
	}
	return nil
}

// seedSuperAdmin creates the preset super admin account
// Requirement 11.1: WHEN OA系统首次部署 THEN OA系统 SHALL 自动创建一个预设的超级管理员账号
// Username: admin, Password: admin123
func seedSuperAdmin(db *gorm.DB) error {
	var count int64
	db.Model(&model.Employee{}).Where("username = ?", "admin").Count(&count)
	if count > 0 {
		log.Println("Super admin account already exists, skipping...")
		return nil
	}

	// Hash the initial password
	hashedPassword, err := password.Hash("admin123")
	if err != nil {
		return err
	}

	admin := model.Employee{
		Username:     "admin",
		EmployeeNo:   "EMP000001",
		Name:         "系统管理员",
		Department:   "信息技术部",
		Position:     "超级管理员",
		Phone:        "",
		Email:        "admin@company.com",
		HireDate:     time.Now(),
		SupervisorID: nil,
		Role:         model.RoleSuperAdmin,
		Password:     hashedPassword,
		IsFirstLogin: true,
		IsActive:     true,
	}

	if err := db.Create(&admin).Error; err != nil {
		return err
	}

	log.Println("Super admin account created successfully (username: admin, password: admin123)")
	return nil
}

// seedContractTemplates creates the preset contract templates
// Requirement 9.1: WHEN HR为特定员工创建合同（入职或离职类型）
func seedContractTemplates(db *gorm.DB) error {
	templates := []model.ContractTemplate{
		{
			Type:  model.ContractTypeOnboarding,
			Title: "员工入职合同",
			Content: `员工入职合同

甲方（用人单位）：____公司
乙方（员工）：{{employee_name}}
工号：{{employee_no}}

根据《中华人民共和国劳动法》及相关法律法规，甲乙双方在平等自愿、协商一致的基础上，签订本劳动合同。

一、合同期限
本合同自 {{start_date}} 起生效。

二、工作内容
乙方同意在甲方 {{department}} 部门担任 {{position}} 职位。

三、工作时间
乙方实行标准工时制度，每日工作8小时，每周工作40小时。

四、劳动报酬
甲方按月支付乙方工资，具体金额按公司薪酬制度执行。

五、社会保险
甲方依法为乙方缴纳社会保险。

六、其他条款
本合同未尽事宜，按国家有关规定执行。

甲方（盖章）：
乙方（签字）：
签订日期：`,
		},
		{
			Type:  model.ContractTypeOffboarding,
			Title: "员工离职协议",
			Content: `员工离职协议

甲方（用人单位）：____公司
乙方（员工）：{{employee_name}}
工号：{{employee_no}}

经甲乙双方协商一致，就乙方离职事宜达成如下协议：

一、离职日期
乙方最后工作日为 {{end_date}}。

二、工作交接
乙方应在离职前完成所有工作交接，包括但不限于：
1. 归还公司财物（电脑、门禁卡、工牌等）
2. 交接工作文档和资料
3. 完成未尽工作事项的说明

三、薪资结算
甲方应在乙方离职后按规定时间结清工资及相关费用。

四、保密义务
乙方离职后仍需遵守保密协议，不得泄露公司商业秘密。

五、竞业限制
如双方签有竞业限制协议，乙方应按协议执行。

六、其他
本协议自双方签字盖章之日起生效。

甲方（盖章）：
乙方（签字）：
签订日期：`,
		},
	}

	for _, template := range templates {
		var count int64
		db.Model(&model.ContractTemplate{}).Where("type = ?", template.Type).Count(&count)
		if count > 0 {
			log.Printf("Contract template '%s' already exists, skipping...", template.Type)
			continue
		}

		if err := db.Create(&template).Error; err != nil {
			return err
		}
		log.Printf("Contract template '%s' created successfully", template.Type)
	}

	return nil
}
