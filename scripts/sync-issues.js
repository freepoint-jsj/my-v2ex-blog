#!/usr/bin/env node
/**
 * ============================================================
 * GitHub Issues → Hugo Posts 同步脚本
 * ============================================================
 *
 * 功能：
 *   1. 调用 GitHub API 拉取指定仓库的 Issues（排除 PR 和带特定标签的）
 *   2. 把每个 Issue 转成 Hugo markdown 文件，写入 content/posts/
 *   3. 自动生成 front matter（标题、日期、作者、标签、Issue 编号）
 *   4. 增量同步：只更新有变化的文件
 *
 * 用法：
 *   GITHUB_TOKEN=ghp_xxx  \
 *   GITHUB_REPO=username/repo  \
 *   node scripts/sync-issues.js
 *
 * 也可在 GitHub Actions 中自动运行（见 .github/workflows/sync.yml）
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ---------- 配置 ----------
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'your-username/your-blog-repo';
// 排除带这些标签的 Issue（比如 "draft"、"private"）
const EXCLUDE_LABELS = (process.env.EXCLUDE_LABELS || 'draft,private,wip').split(',').map(s => s.trim().toLowerCase());
// 只同步带这些标签的 Issue（留空表示同步所有）。多个用逗号分隔
const INCLUDE_LABELS = process.env.INCLUDE_LABELS || '';
// 输出目录
const OUTPUT_DIR = path.join(__dirname, '..', 'content', 'posts');
// 每页拉取数量（GitHub API 最大 100）
const PER_PAGE = 100;

// ---------- 工具函数 ----------

function log(msg) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${now}] ${msg}`);
}

function githubRequest(path_, page = 1) {
    return new Promise((resolve, reject) => {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/issues?state=all&per_page=${PER_PAGE}&page=${page}&direction=desc&sort=created&${path_}`;
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_REPO}/issues?state=all&per_page=${PER_PAGE}&page=${page}&sort=created&direction=desc`,
            method: 'GET',
            headers: {
                'User-Agent': 'hugo-issue-sync',
                'Accept': 'application/vnd.github+json',
                'Authorization': GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : '',
            }
        };
        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 301) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`JSON 解析失败: ${e.message}`));
                    }
                } else if (res.statusCode === 403) {
                    reject(new Error(`GitHub API 限流或权限不足 (403)。响应: ${data.substring(0, 200)}`));
                } else if (res.statusCode === 404) {
                    reject(new Error(`仓库不存在或无权访问 (404): ${GITHUB_REPO}`));
                } else {
                    reject(new Error(`GitHub API 错误 (${res.statusCode}): ${data.substring(0, 200)}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * 把 Issue 标题转成 URL 友好的 slug
 */
function slugify(title, issueNumber) {
    // 去掉 markdown 标记
    let slug = title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')  // 保留字母数字空格连字符（含中文）
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
    // 如果 slug 为空（纯中文等），用 issue 编号
    if (!slug) slug = `issue-${issueNumber}`;
    // 加上 issue 编号保证唯一
    return `${slug}-${issueNumber}`;
}

/**
 * 转义 front matter 中的特殊字符
 */
function escapeYaml(str) {
    if (!str) return '""';
    // 如果包含特殊字符，用双引号包裹并转义
    if (/[:#&*!|>'"%@`{}\[\],?\n]/.test(str)) {
        return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return `"${str}"`;
}

/**
 * 把 Issue body 中的 GitHub 用户图片相对路径转成绝对路径
 * GitHub Issues 里的图片通常是 user-images.githubusercontent.com 的绝对 URL，无需处理
 * 但用户上传的附件可能是相对路径，这里统一处理
 */
function normalizeContent(body) {
    if (!body) return '';
    return body;
}

/**
 * 把单个 Issue 转成 Hugo markdown 内容
 *
 * 规则：
 *   - 如果 Issue 带 "moment"（瞬间）标签，则当作「说说/短动态」处理
 *     首页时间轴会直接显示正文，不显示标题，类似 QQ 空间说说
 *   - 否则当作普通文章处理，首页显示标题 + 摘要
 */
function issueToMarkdown(issue) {
    const title = issue.title || `Issue #${issue.number}`;
    const date = issue.created_at;
    const updated = issue.updated_at;
    const author = issue.user ? issue.user.login : 'unknown';
    const authorAvatar = issue.user ? issue.user.avatar_url : '';
    const authorUrl = issue.user ? issue.user.html_url : '';
    const labels = (issue.labels || []).map(l => l.name);
    const issueNumber = issue.number;
    const comments = issue.comments || 0;
    const url = issue.html_url;
    const content = normalizeContent(issue.body || '');

    // 检测是否为「瞬间」模式
    const isMoment = labels.some(l => l.toLowerCase() === 'moment' || l === '瞬间');

    // 生成 front Matter
    const fm = [
        '+++',
        `title = ${escapeYaml(title)}`,
        `date = "${date}"`,
        `lastmod = "${updated}"`,
        `draft = false`,
        `author = ${escapeYaml(author)}`,
        `authorAvatar = "${authorAvatar}"`,
        `authorUrl = "${authorUrl}"`,
        `issueNumber = ${issueNumber}`,
        `issueUrl = "${url}"`,
        `comments = ${comments}`,
    ];

    // 标记是否为瞬间/说说
    if (isMoment) {
        fm.push(`moment = true`);
    }

    if (labels.length > 0) {
        fm.push('labels = [' + labels.map(l => escapeYaml(l)).join(', ') + ']');
        // 标签里排除 moment/瞬间，避免在侧边栏标签云里出现这个功能性标签
        const tagsForCloud = labels.filter(l => l.toLowerCase() !== 'moment' && l !== '瞬间');
        if (tagsForCloud.length > 0) {
            fm.push('tags = [' + tagsForCloud.map(l => escapeYaml(l)).join(', ') + ']');
        }
    }

    fm.push('+++');
    fm.push('');

    return fm.join('\n') + content + '\n';
}

// ---------- 主流程 ----------

async function fetchAllIssues() {
    let allIssues = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        log(`拉取 Issues 第 ${page} 页...`);
        const issues = await githubRequest('', page);

        // 过滤掉 PR（GitHub API 会把 PR 也返回）
        const realIssues = issues.filter(i => !i.pull_request);

        allIssues = allIssues.concat(realIssues);

        if (issues.length < PER_PAGE) {
            hasMore = false;
        } else {
            page++;
        }

        // 安全限制：最多拉 20 页
        if (page > 20) {
            log('达到最大页数限制 (20)，停止拉取');
            break;
        }
    }

    return allIssues;
}

function filterIssues(issues) {
    const includeSet = INCLUDE_LABELS
        ? new Set(INCLUDE_LABELS.split(',').map(s => s.trim().toLowerCase()))
        : null;

    return issues.filter(issue => {
        const labels = (issue.labels || []).map(l => l.name.toLowerCase());

        // 排除带 EXCLUDE_LABELS 的
        for (const ex of EXCLUDE_LABELS) {
            if (labels.includes(ex)) return false;
        }

        // 如果设置了 INCLUDE_LABELS，必须至少包含一个
        if (includeSet && includeSet.size > 0) {
            const hasInclude = labels.some(l => includeSet.has(l));
            if (!hasInclude) return false;
        }

        return true;
    });
}

async function main() {
    log('========================================');
    log('GitHub Issues → Hugo Posts 同步');
    log('========================================');
    log(`仓库: ${GITHUB_REPO}`);
    log(`输出目录: ${OUTPUT_DIR}`);

    if (!GITHUB_TOKEN) {
        log('警告: 未设置 GITHUB_TOKEN，匿名请求会被 GitHub API 限流（每小时 60 次）');
    }

    // 创建输出目录
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 拉取所有 Issues
    let issues;
    try {
        issues = await fetchAllIssues();
    } catch (e) {
        log(`错误: ${e.message}`);
        process.exit(1);
    }

    log(`共拉取到 ${issues.length} 个 Issue（含 PR 已过滤）`);

    // 过滤
    const filtered = filterIssues(issues);
    log(`过滤后剩余 ${filtered.length} 个 Issue`);

    if (filtered.length === 0) {
        log('没有可同步的 Issue，退出');
        return;
    }

    // 读取已有文件列表（用于增量删除）
    const existingFiles = new Set(fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.md')));

    // 写入文件
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const writtenFiles = new Set();

    for (const issue of filtered) {
        const slug = slugify(issue.title, issue.number);
        const filename = `${slug}.md`;
        const filepath = path.join(OUTPUT_DIR, filename);
        const content = issueToMarkdown(issue);

        writtenFiles.add(filename);

        if (fs.existsSync(filepath)) {
            const old = fs.readFileSync(filepath, 'utf8');
            if (old === content) {
                unchanged++;
                continue;
            } else {
                updated++;
            }
        } else {
            created++;
        }

        fs.writeFileSync(filepath, content, 'utf8');
    }

    // 删除不再存在的文件（Issue 被删除或标签变更）
    let deleted = 0;
    for (const f of existingFiles) {
        if (!writtenFiles.has(f)) {
            fs.unlinkSync(path.join(OUTPUT_DIR, f));
            deleted++;
        }
    }

    log('----------------------------------------');
    log(`同步完成: 新建 ${created} / 更新 ${updated} / 未变 ${unchanged} / 删除 ${deleted}`);
    log('========================================');
}

main().catch(e => {
    log(`致命错误: ${e.message}`);
    console.error(e);
    process.exit(1);
});
