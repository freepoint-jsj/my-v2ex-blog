+++
title = "Cloudflare Pages 部署常见问题"
date = "2024-09-12T09:15:00+08:00"
lastmod = "2024-09-12T09:15:00+08:00"
draft = false
author = "demo"
authorAvatar = "https://github.com/identicons/demo.png"
authorUrl = "https://github.com/demo"
issueNumber = 3
issueUrl = "https://github.com/your-username/your-blog-repo/issues/3"
comments = 1
labels = ["Cloudflare", "部署"]
tags = ["Cloudflare", "部署"]
+++

部署到 Cloudflare Pages 时，新手常遇到几个坑。这里集中说一下。

## 1. Hugo 版本不对

Cloudflare Pages 默认的 Hugo 版本可能比较旧，导致一些新语法不支持。**解决方法**：在项目的环境变量里加：

```
HUGO_VERSION = 0.140.0
```

或者用最新版号。设置位置：Cloudflare Pages 项目 → Settings → Environment variables。

## 2. 构建命令写错

正确的构建命令是：

```
hugo --minify --gc
```

- `--minify`：压缩 HTML/CSS/JS
- `--gc`：清理未使用的资源

输出目录填 `public`，不是 `dist` 或 `build`。

## 3. 子模块没拉下来

如果你的主题是用 git submodule 引入的，需要在 Cloudflare Pages 设置里：

- **Build & deployments** → **Source** 里勾选 "Include submodules"

不过我们这个项目主题是直接放在 `themes/v2ex/` 里的，不是 submodule，所以不用管。

## 4. 自定义域名 HTTPS 不生效

如果域名不在 Cloudflare 托管，需要手动添加 CNAME 记录指向 `xxx.pages.dev`，然后等 HTTPS 证书签发（通常几分钟到几小时）。

如果域名在 Cloudflare 托管，添加自定义域名时会自动配置 DNS 和证书，**完全无脑**。

## 5. 部署后看不到更新

可能原因：

1. GitHub Actions 同步 Issue 后没有 commit 成功 → 检查仓库 Actions 标签页
2. Cloudflare Pages 没检测到 git 变更 → 手动在 Cloudflare 控制台点 "Retry deployment"
3. 浏览器缓存 → 强制刷新（Ctrl+Shift+R）

## 6. 免费额度够用吗？

Cloudflare Pages 免费版：

- **无限请求**（带宽无限）
- **500 次构建/月**（对个人博客完全够用，每天更新 10 篇都用不完）
- **无限站点数**

GitHub Actions 免费版：

- **公开仓库**：无限分钟
- **私有仓库**：2000 分钟/月

所以**完全免费**，不用担心额度。

## 7. 怎么回滚

Cloudflare Pages 每次部署都有版本，可以在项目主页看到所有 deployment。点任何一个，可以查看那次部署的预览 URL，也可以一键回滚到那个版本。

非常方便，写错了也不怕。
