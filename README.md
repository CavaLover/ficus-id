# 🌿 全球榕属(Ficus)物种智能鉴定网站

基于 **Express + 智谱 GLM-5V 视觉大模型**的榕树物种识别与科普网站，以 **Berg & Corner (2005)** 权威分类体系为主线，融合 AI 图像识别、分类系统展示、形态学图鉴和生态学知识。

## 功能特性

- **AI 榕种鉴定** — 上传植物照片（叶片/隐头果/树皮/树干），调用 GLM-5V 视觉模型自动识别榕属植物的亚属、组乃至物种级别
- **分类体系** — Berg & Corner (2005) 六亚属分类标准完整呈现，交互式分类树
- **形态学指南** — 隐头果、叶片、叶脉、托叶、树皮、生长习性六大鉴定器官的可视化图鉴
- **物种图鉴** — 按亚属筛选的代表物种图像库
- **全球分布** — 各亚属地理分布与物种丰富度热点
- **SEO 优化** — 自动生成 Sitemap、结构化数据注入
- **无障碍支持** — 符合 WCAG 标准的 a11y 检测
- **限流保护** — API 请求频率限制

## 技术栈

| 技术 | 用途 |
|------|------|
| Express 5 | Web 服务框架 |
| 智谱 GLM-5V | 视觉大模型（物种识别） |
| Vitest | 单元/集成测试 |

## 鉴定标准

| 来源 | 用途 |
|------|------|
| **Berg & Corner (2005)** | 六亚属权威分类体系 (Flora Malesiana Ser.I 17(2)) |
| **POWO / Kew** | 物种名录、分布数据 |
| **FigWeb** | 榕属在线分类资源参考 |

## 快速开始

### 环境变量

```bash
# .env 文件
ZHIPU_API_KEY=your_zhipu_api_key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4/chat/completions
ZHIPU_MODEL=glm-5v-turbo
FICUS_PORT=3243
SITE_BASE_URL=https://your-domain.com
```

### 安装与运行

```bash
npm install
npm run dev      # 开发模式（--watch 热重载）
npm start        # 生产模式
```

访问 `http://localhost:3243` 即可使用。

## 项目结构

```
ficus-id/
├── server.js              # Express 入口 & API 路由
├── public/                # 静态资源（HTML/CSS/JS/图片）
│   ├── index.html         # 首页
│   ├── lab.html           # AI 榕种鉴定实验室
│   ├── classification.html # 分类体系
│   ├── morphology.html     # 形态学指南
│   ├── gallery.html       # 物种图鉴
│   ├── distribution.html  # 全球分布
│   └── about.html         # 生态学与关于
├── lib/                   # 工具模块（SEO/Sitemap/a11y/导航）
├── middleware/            # 中间件（限流等）
└── tests/                 # 测试套件
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/identify-ficus` | AI 榕种鉴定（需上传 base64 图片） |
| GET  | `/api/ficus-examples` | 获取亚属/形态示例列表 |
| GET  | `/api/health` | 健康检查 |
| GET  | `/sitemap.xml` | 站点地图 |

## License

ISC
