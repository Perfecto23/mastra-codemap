# Mastra CodeMap

Mastra 框架源码架构可视化站点。通过交互式图表和模块卡片，呈现 Mastra 的核心架构、模块依赖、数据流和关键设计决策。

## 在线预览

> 截图占位符
>
> ![首页架构总览](./screenshots/home.png)
> ![模块详情页](./screenshots/modules.png)

## 本地运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

开发服务器默认运行在 `http://localhost:4321`。

## 构建部署

```bash
# 构建静态站点
pnpm build

# 本地预览构建产物
pnpm preview
```

构建产物输出到 `dist/` 目录，可直接上传到任意静态托管平台（EdgeOne Pages、Vercel、Netlify 等）。

### EdgeOne Pages 部署配置

| 配置项   | 值             |
| -------- | -------------- |
| 构建命令 | `pnpm build`   |
| 输出目录 | `dist`         |
| Node 版本 | 18 或 20      |
| 安装命令 | `pnpm install` |
| 框架预设 | Astro          |

也可以使用 `./deploy.sh` 脚本一键构建。

## 技术栈

| 类别       | 技术                          |
| ---------- | ----------------------------- |
| 框架       | Astro 5                       |
| UI 库      | React 19                      |
| 样式       | Tailwind CSS 4                |
| 动画       | Framer Motion                 |
| 图表       | Mermaid                       |
| 图标       | Lucide React                  |
| 组件       | Radix UI (Collapsible, Tabs)  |
| 语言       | TypeScript                    |
| 包管理     | pnpm                          |

## 页面结构

- `/` — 首页，架构总览与核心模块导航
- `/modules` — 模块详情，依赖关系可视化
- `/dataflow` — 数据流图
- `/decisions` — 关键设计决策

## 内容校验

构建前会自动执行 `content-check`，校验：
- 核心模块和二级模块数据完整性
- 设计决策条目
- Mermaid 图表语法
