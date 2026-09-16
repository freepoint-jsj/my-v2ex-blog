# V2EX 风格时间轴博客

一个用 **GitHub Issues 写作 + Hugo 生成 + Cloudflare Pages 托管** 的极简博客，完全免费。

## 特点

- **写作方式不变**：继续在 GitHub Issues 里写东西，零迁移成本
- **V2EX 风格**：经典灰白配色、卡片式时间轴、简约排版
- **完全免费**：GitHub Actions + Cloudflare Pages 都对公开仓库免费
- **自动同步**：新建/编辑 Issue 后，几分钟内自动更新到网站
- **标签系统**：用 Issue 的 Labels 自动生成标签页
- **响应式**：手机、平板、桌面都好看
- **支持中文**：URL slug 智能处理，中文标题也能生成友好链接

## 目录结构

```
hugo-v2ex-blog/
├── config.toml                  # Hugo 配置（站点信息、菜单、参数）
├── archetypes/
│   └── default.md               # 新建文章模板（一般用不到，从 Issue 同步）
├── content/
│   └── posts/                   # 同步过来的文章（自动生成，不要手动改）
├── scripts/
│   └── sync-issues.js           # GitHub Issues → Hugo markdown 同步脚本
├── themes/
│   └── v2ex/                    # V2EX 风格主题
│       ├── layouts/
│       │   ├── index.html       # 首页（时间轴）
│       │   ├── 404.html
│       │   ├── _default/
│       │   │   ├── single.html # 文章详情页
│       │   │   ├── list.html    # 列表页
│       │   │   ├── taxonomy.html# 标签文章列表
│       │   │   └── terms.html   # 所有标签页
│       │   └── partials/
│       │       ├── header.html
│       │       └── footer.html
│       └── static/
│           ├── css/style.css    # V2EX 风格样式
│           └── js/main.js
├── .github/workflows/
│   ├── sync.yml                 # 自动同步 Issues
│   └── build-test.yml           # 构建测试
└── package.json
```

## 部署步骤（10 分钟搞定）

### 第 1 步：Fork 或新建仓库

1. 把这个项目 push 到你的 GitHub 仓库（建议公开仓库，免费）
2. 仓库可以是空的，也可以保留示例内容

### 第 2 步：修改配置

打开 `config.toml`，修改以下字段：

```toml
baseURL = "https://你的博客域名.com/"   # 部署后再改
title = "你的站点名"
[params]
  description = "你的站点描述"
  author = "你的名字"
  githubRepo = "你的用户名/你的仓库名"   # 重要！同步脚本要用
```

同时修改 `themes/v2ex/layouts/partials/header.html` 里的菜单链接，把 GitHub 链接改成你的仓库。

### 第 3 步：在 GitHub Issues 里写作

直接在仓库的 Issues 里新建 Issue 写东西就行。注意：

- **Issue 标题** = 文章标题
- **Issue 正文** = 文章正文（支持完整 Markdown）
- **Issue Labels** = 文章标签（自动同步到 Hugo tags）
- **Issue 创建时间** = 文章发布时间
- **Issue 评论数** = 显示在列表上

**特殊标签**：
- 给 Issue 加 `draft` 标签 → 不会同步到网站（草稿箱）
- 给 Issue 加 `private` 标签 → 不会同步到网站（私密）
- 给 Issue 加 `wip` 标签 → 不会同步到网站（写作中）

### 第 4 步：配置 Cloudflare Pages

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 选择你的 GitHub 仓库并授权
4. 配置构建：
   - **Framework preset**: 选 `Hugo`
   - **Build command**: `hugo --minify --gc`
   - **Build output directory**: `public`
   - **Environment variables**:
     - `HUGO_VERSION` = `0.140.0`（或最新版）
5. 点 **Save and Deploy**

部署完成后，你会得到一个 `xxx.pages.dev` 的免费域名，可以直接访问。

### 第 5 步：（可选）配置自动触发

push 代码后 Cloudflare Pages 会自动重新构建。但 Issue 变更不会触发 git push，所以需要 GitHub Actions 帮忙：

**默认行为**（推荐）：GitHub Actions 同步 Issue 后会 commit 到仓库，Cloudflare Pages 检测到 git 变更会自动重新部署。**无需额外配置**。

**进阶**（更快）：在 Cloudflare Pages 项目设置 → **Build & deployments** → **Deploy hooks** 创建一个 hook，把 URL 添加到仓库的 Secrets（名称 `CF_DEPLOY_HOOK_URL`），同步后会立即触发部署。

### 第 6 步：（可选）绑定自定义域名

在 Cloudflare Pages 项目设置 → **Custom domains** 添加你的域名。如果域名也在 Cloudflare 托管，会自动配置 DNS 和 HTTPS。

## 本地预览

如果你想本地预览效果：

```bash
# 安装 Hugo（macOS）
brew install hugo

# 安装 Hugo（Ubuntu/Debian）
sudo apt install hugo

# 安装 Hugo（Windows）用 scoop
scoop install hugo

# 进入项目目录
cd hugo-v2ex-blog

# 同步 Issues（需要 GitHub Token）
GITHUB_TOKEN=ghp_xxx GITHUB_REPO=你的用户名/你的仓库名 node scripts/sync-issues.js

# 启动本地服务器
hugo server -D

# 浏览器打开 http://localhost:1313
```

## 常见问题

### Q: GitHub Token 怎么获取？

A: GitHub Actions 自动运行时使用的是内置的 `GITHUB_TOKEN`，**无需手动配置**。本地运行需要：

1. 打开 https://github.com/settings/tokens
2. 点 **Generate new token (classic)**
3. 勾选 `repo` 权限（读取 Issues）
4. 复制 token，本地运行时设为环境变量

### Q: 为什么我的 Issue 没同步过来？

A: 检查：
1. Issue 是否带了 `draft` / `private` / `wip` 标签（这些会被过滤）
2. 仓库是否是公开的（私有仓库需要给 Token 更多权限）
3. GitHub Actions 是否运行成功（在仓库 Actions 标签页查看）

### Q: 怎么修改 V2EX 配色？

A: 编辑 `config.toml` 里的 `[params.colors]` 段，或者直接改 `themes/v2ex/static/css/style.css`。

### Q: 怎么修改每页显示的文章数？

A: 改 `config.toml` 里的 `paginate = 20`。

### Q: 文章 URL 是怎么生成的？

A: 根据标题 slug + Issue 编号，例如 `hello-world-123.md`。这样保证唯一性，也利于 SEO。

### Q: 能不能用 GitHub Discussions 代替 Issues？

A: 可以，但需要改 `scripts/sync-issues.js` 里的 API 路径（用 GraphQL API）。Issues 更简单，推荐用 Issues。

### Q: 图片怎么上传？

A: 在 GitHub Issue 编辑器里直接拖拽/粘贴图片，GitHub 会自动上传到 `user-images.githubusercontent.com`，Markdown 里会自动插入绝对 URL，无需额外处理。

## 自定义

### 修改主题颜色

编辑 `config.toml`：

```toml
[params.colors]
  primary = "#778087"        # 改成你喜欢的颜色
  background = "#e2e2e2"
  ...
```

然后编辑 `themes/v2ex/static/css/style.css`，搜索 `#778087` 替换成你的颜色。

### 添加统计代码

编辑 `themes/v2ex/layouts/partials/header.html`，在 `</head>` 前加你的统计代码（Google Analytics、百度统计、Umami 等）。

### 添加评论系统

由于文章原始评论在 GitHub Issues，详情页已经提供了"在 GitHub 查看"链接。如果你想嵌入评论：

- **Giscus**（推荐）：基于 GitHub Discussions，免费
- **Utterances**：基于 GitHub Issues，免费
- **Disqus**：免费但有广告

编辑 `themes/v2ex/layouts/_default/single.html`，在 `</article>` 后插入评论组件代码。

## 备份与迁移

- **文章源**：GitHub Issues（永久保存在你的仓库里）
- **同步副本**：`content/posts/*.md`（每次同步会覆盖）
- **迁移到其他平台**：直接把 `content/posts/` 下的 markdown 文件复制走即可

## 许可证

MIT
