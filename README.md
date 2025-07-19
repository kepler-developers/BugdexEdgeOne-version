# BugDex - EdgeOne Pages 部署版本

## 项目结构
```
bugdex-edgeone/
├── index.html          # 前端页面
├── script.js           # 前端逻辑
├── style.css           # 样式文件
├── api/
│   ├── auth.js         # 认证相关 API
│   ├── posts.js        # 帖子相关 API
│   └── users.js        # 用户相关 API
├── edgeone.json        # EdgeOne 配置
└── README.md           # 说明文档
```

## 环境变量配置

在 EdgeOne Pages 项目设置中配置以下环境变量：

### 必需环境变量
- `JWT_SECRET`: JWT 密钥（任意字符串，用于生成登录令牌）

### 邮件服务环境变量（可选）
如果你想启用真正的邮件发送功能，需要配置以下变量：

#### 方案一：SendGrid（推荐）
- `SENDGRID_API_KEY`: SendGrid API 密钥
- `SENDGRID_FROM_EMAIL`: 发件人邮箱地址

#### 方案二：Resend
- `RESEND_API_KEY`: Resend API 密钥
- `RESEND_FROM_EMAIL`: 发件人邮箱地址

#### 方案三：自定义 SMTP
- `SMTP_HOST`: SMTP 服务器地址
- `SMTP_PORT`: SMTP 端口
- `SMTP_USER`: SMTP 用户名
- `SMTP_PASS`: SMTP 密码
- `SMTP_FROM_EMAIL`: 发件人邮箱

## 部署步骤

1. 将代码推送到 Git 仓库
2. 在 EdgeOne Pages 中创建新项目
3. 连接 Git 仓库
4. 配置环境变量
5. 配置 KV 存储命名空间
6. 部署项目

## KV 存储配置

在 EdgeOne Pages 的 KV 管理页面：
- 变量名称：`bugdex_kv`
- 命名空间：`bugdex_data`

## 功能特性

- ✅ 用户注册/登录
- ✅ 邮件验证码（支持多种邮件服务）
- ✅ 发布帖子
- ✅ 点赞功能
- ✅ 评论功能
- ✅ 用户中心
- ✅ 每周排行榜
- ✅ 响应式设计
- ✅ 现代化 UI

## 邮件服务设置指南

### SendGrid 设置步骤：

1. **注册 SendGrid 账号**
   - 访问 https://sendgrid.com/
   - 注册免费账号
   - 验证邮箱地址

2. **获取 API Key**
   - 登录 SendGrid 控制台
   - 进入 Settings > API Keys
   - 创建新的 API Key（选择 "Restricted Access" > "Mail Send"）
   - 复制 API Key

3. **验证发件人邮箱**
   - 进入 Settings > Sender Authentication
   - 验证你的邮箱地址

4. **配置环境变量**
   - `SENDGRID_API_KEY`: 你的 API Key
   - `SENDGRID_FROM_EMAIL`: 已验证的邮箱地址

### Resend 设置步骤：

1. **注册 Resend 账号**
   - 访问 https://resend.com/
   - 注册免费账号

2. **获取 API Key**
   - 登录后复制 API Key

3. **配置环境变量**
   - `RESEND_API_KEY`: 你的 API Key
   - `RESEND_FROM_EMAIL`: 你的邮箱地址

## 注意事项

- 免费邮件服务通常有发送限制
- 建议在开发阶段使用模拟发送
- 生产环境建议使用付费邮件服务
- 确保发件人邮箱已通过验证 