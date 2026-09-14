+++
title = "欢迎使用 V2EX 风格时间轴博客"
date = "2024-09-14T10:00:00+08:00"
lastmod = "2024-09-14T10:00:00+08:00"
draft = false
author = "demo"
authorAvatar = "https://github.com/identicons/demo.png"
authorUrl = "https://github.com/demo"
issueNumber = 1
issueUrl = "https://github.com/your-username/your-blog-repo/issues/1"
comments = 0
labels = ["公告", "教程"]
tags = ["公告", "教程"]
+++

这是一个用 **GitHub Issues + Hugo + Cloudflare Pages** 搭建的 V2EX 风格时间轴博客。

## 它是怎么工作的

整个流程非常简单：

1. **写作**：你在 GitHub Issues 里写东西，就像以前一样
2. **同步**：GitHub Actions 自动调用同步脚本，把 Issues 拉下来转成 Hugo markdown 文件
3. **构建**：Cloudflare Pages 检测到仓库变更，自动用 Hugo 构建静态网站
4. **访问**：用户访问你的 `xxx.pages.dev` 域名，看到的就是最新内容

整个过程**完全免费**，**完全自动**，你只需要专注于写作。

## 支持的 Markdown 语法

### 标题

```
# 一级标题
## 二级标题
### 三级标题
```

### 代码块

```python
def hello():
    print("Hello, V2EX!")
```

### 引用

> 这是一段引用文字。
> 可以有多行。

### 列表

- 无序列表项 1
- 无序列表项 2
  - 嵌套项

1. 有序列表项 1
2. 有序列表项 2

### 表格

| 功能 | 是否支持 |
|------|---------|
| Markdown | 是 |
| 图片 | 是 |
| 代码高亮 | 是 |
| 标签 | 是 |

### 链接和图片

[GitHub](https://github.com) 链接会自动在新标签页打开。

图片可以直接拖拽到 GitHub Issue 编辑器里上传。

## 标签系统

给 Issue 加 Label，会自动同步成文章标签。比如这篇就带了「公告」和「教程」两个标签。

## 草稿功能

如果你不想让某篇 Issue 同步到网站，给它加上 `draft` 标签即可。等写完了，去掉这个标签，几分钟后就会自动同步。

## 开始写作

去你的仓库 Issues 页面，新建一个 Issue 试试吧！

- 标题就是文章标题
- 正文就是文章内容
- Labels 就是文章标签

写完保存，等几分钟，刷新网站就能看到了。
