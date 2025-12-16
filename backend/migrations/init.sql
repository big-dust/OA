-- OA System Database Initialization Script
-- This script creates the preset super admin account and contract templates
-- Requirements: 11.1, 9.1
--
-- Usage: Run this script after GORM auto-migration creates the tables
-- mysql -u root -proot oa < migrations/init.sql

-- ============================================
-- Preset Super Admin Account
-- Username: admin, Password: admin123
-- Requirement 11.1: WHEN OA系统首次部署 THEN OA系统 SHALL 自动创建一个预设的超级管理员账号
-- ============================================

-- Check if admin already exists before inserting
INSERT INTO employees (
    username,
    employee_no,
    name,
    department,
    position,
    phone,
    email,
    hire_date,
    supervisor_id,
    role,
    password,
    is_first_login,
    is_active,
    created_at,
    updated_at
) SELECT 
    'admin',
    'EMP000001',
    '系统管理员',
    '信息技术部',
    '超级管理员',
    '',
    'admin@company.com',
    CURDATE(),
    NULL,
    'super_admin',
    'admin123',
    1,
    1,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE username = 'admin');

-- ============================================
-- Preset Contract Templates
-- Requirement 9.1: WHEN HR为特定员工创建合同（入职或离职类型）
-- ============================================

-- Onboarding Contract Template (入职合同模板)
INSERT INTO contract_templates (
    type,
    title,
    content,
    created_at
) SELECT
    'onboarding',
    '员工入职合同',
    '员工入职合同

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
签订日期：',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM contract_templates WHERE type = 'onboarding');

-- Offboarding Contract Template (离职合同模板)
INSERT INTO contract_templates (
    type,
    title,
    content,
    created_at
) SELECT
    'offboarding',
    '员工离职协议',
    '员工离职协议

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
签订日期：',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM contract_templates WHERE type = 'offboarding');
