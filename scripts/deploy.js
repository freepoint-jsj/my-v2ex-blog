#!/usr/bin/env node
/**
 * ============================================================
 * 一键部署脚本：GitHub 仓库 + Cloudflare Pages
 * ============================================================
 *
 * 这个脚本会自动完成：
 *   1. 用 GitHub API 创建一个新仓库（公开）
 *   2. 把本地代码 push 上去
 *   3. 用 Cloudflare API 创建 Pages 项目并连接 GitHub
 *   4. 触发首次部署
 *
 * 使用前需要准备：
 *   - GitHub Personal Access Token（需要 repo 权限）
 *   - Cloudflare API Token（需要 Cloudflare Pages 编辑权限）
 *   - Cloudflare Account ID
 *
 * 用法：
 *   node scripts/deploy.js
 *
 * 或者用环境变量：
 *   GH_TOKEN=xxx CF_API_TOKEN=xxx CF_ACCOUNT_ID=xxx \
 *   GH_REPO_NAME=my-blog SITE_NAME=my-blog \
 *   node scripts/deploy.js
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const readline = require('readline');

// ---------- 配置 ----------
const CONFIG = {
    ghToken: process.env.GH_TOKEN || '',
    ghUsername: process.env.GH_USERNAME || '',
    repoName: process.env.GH_REPO_NAME || 'my-v2ex-blog',
    repoDesc: process.env.GH_REPO_DESC || 'V2EX 风格时间轴博客',
    cfApiToken: process.env.CF_API_TOKEN || '',
    cfAccountId: process.env.CF_ACCOUNT_ID || '',
    siteName: process.env.CF_PROJECT_NAME || 'my-v2ex-blog',
    productionBranch: 'main',
};

const PROJECT_ROOT = path.join(__dirname, '..');

// ---------- 工具函数 ----------
function log(msg) {
    const now = new Date().toISOString().substring(11, 19);
    console.log(`[${now}] ${msg}`);
}

function logErr(msg) {
    console.error(`[ERROR] ${msg}`);
}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function httpsRequest(method, hostname, urlPath, headers, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname,
            path: urlPath,
            method,
            headers: {
                'User-Agent': 'deploy-script',
                'Accept': 'application/json',
                ...headers,
            },
        };
        if (data) {
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }
        const req = https.request(options, (res) => {
            let respData = '';
            res.on('data', chunk => respData += chunk);
            res.on('end', () => {
                let parsed;
                try { parsed = respData ? JSON.parse(respData) : {}; }
                catch { parsed = { raw: respData }; }
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function ghApi(method, urlPath, body) {
    return httpsRequest(method, 'api.github.com', urlPath, {
        'Authorization': `Bearer ${CONFIG.ghToken}`,
        'Accept': 'application/vnd.github+json',
    }, body);
}

function cfApi(method, urlPath, body) {
    return httpsRequest(method, 'api.cloudflare.com', urlPath, {
        'Authorization': `Bearer ${CONFIG.cfApiToken}`,
    }, body);
}

function run(cmd, opts = {}) {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', cwd: PROJECT_ROOT, ...opts });
}

// ---------- 步骤 1：收集配置 ----------
async function collectConfig() {
    log('检查配置...');
    if (!CONFIG.ghToken) {
        CONFIG.ghToken = await ask('请输入 GitHub Personal Access Token (ghp_xxx): ');
    }
    if (!CONFIG.ghUsername) {
        // 用 token 查当前用户
        const res = await ghApi('GET', '/user');
        if (res.status === 200) {
            CONFIG.ghUsername = res.data.login;
            log(`检测到 GitHub 用户名: ${CONFIG.ghUsername}`);
        } else {
            CONFIG.ghUsername = await ask('请输入你的 GitHub 用户名: ');
        }
    }
    if (!CONFIG.cfApiToken) {
        CONFIG.cfApiToken = await ask('请输入 Cloudflare API Token: ');
    }
    if (!CONFIG.cfAccountId) {
        // 用 token 查 accounts
        const res = await cfApi('GET', '/client/v4/accounts');
        if (res.status === 200 && res.data.result && res.data.result.length > 0) {
            CONFIG.cfAccountId = res.data.result[0].id;
            log(`检测到 Cloudflare Account ID: ${CONFIG.cfAccountId}`);
        } else {
            CONFIG.cfAccountId = await ask('请输入 Cloudflare Account ID: ');
        }
    }

    if (!CONFIG.ghToken || !CONFIG.cfApiToken || !CONFIG.cfAccountId) {
        logErr('缺少必要配置，退出');
        process.exit(1);
    }
    log('配置完成');
}

// ---------- 步骤 2：更新 config.toml ----------
function updateHugoConfig() {
    log('更新 Hugo 配置...');
    const configPath = path.join(PROJECT_ROOT, 'config.toml');
    let content = fs.readFileSync(configPath, 'utf8');
    const repoFull = `${CONFIG.ghUsername}/${CONFIG.repoName}`;
    content = content.replace(/githubRepo = "[^"]*"/, `githubRepo = "${repoFull}"`);
    fs.writeFileSync(configPath, content);
    log(`  githubRepo → ${repoFull}`);

    // 更新菜单里的 GitHub 链接
    const headerPath = path.join(PROJECT_ROOT, 'themes/v2ex/layouts/partials/header.html');
    let header = fs.readFileSync(headerPath, 'utf8');
    header = header.replace(/github\.com\/your-username\/your-blog-repo/g, `github.com/${repoFull}`);
    fs.writeFileSync(headerPath, header);

    // 更新 footer 里的链接
    const footerPath = path.join(PROJECT_ROOT, 'themes/v2ex/layouts/partials/footer.html');
    let footer = fs.readFileSync(footerPath, 'utf8');
    footer = footer.replace(/github\.com\/your-username\/your-blog-repo/g, `github.com/${repoFull}`);
    fs.writeFileSync(footerPath, footer);

    // 更新 README
    const readmePath = path.join(PROJECT_ROOT, 'README.md');
    let readme = fs.readFileSync(readmePath, 'utf8');
    readme = readme.replace(/your-username\/your-blog-repo/g, repoFull);
    fs.writeFileSync(readmePath, readme);
}

// ---------- 步骤 3：创建 GitHub 仓库 ----------
async function createGitHubRepo() {
    log(`检查仓库 ${CONFIG.ghUsername}/${CONFIG.repoName} 是否存在...`);
    const checkRes = await ghApi('GET', `/repos/${CONFIG.ghUsername}/${CONFIG.repoName}`);
    if (checkRes.status === 200) {
        log('  仓库已存在，跳过创建');
        return;
    }
    if (checkRes.status !== 404) {
        logErr(`检查仓库失败: ${JSON.stringify(checkRes.data)}`);
        process.exit(1);
    }

    log('创建新仓库...');
    const createRes = await ghApi('POST', '/user/repos', {
        name: CONFIG.repoName,
        description: CONFIG.repoDesc,
        private: false,
        auto_init: false,
    });
    if (createRes.status === 201) {
        log(`  仓库已创建: ${createRes.data.html_url}`);
    } else {
        logErr(`创建仓库失败: ${JSON.stringify(createRes.data)}`);
        process.exit(1);
    }
}

// ---------- 步骤 4：push 代码 ----------
function pushToGitHub() {
    log('提交配置变更...');
    try {
        run('git add -A');
        run('git -c user.name="deploy-bot" -c user.email="bot@local" commit -m "chore: update config for deployment"');
    } catch (e) {
        log('  无变更需要提交');
    }

    log('push 代码到 GitHub...');
    const remoteUrl = `https://${CONFIG.ghToken}@github.com/${CONFIG.ghUsername}/${CONFIG.repoName}.git`;
    try {
        run(`git remote remove origin`, { stdio: 'ignore' });
    } catch {}
    run(`git remote add origin ${remoteUrl.replace(CONFIG.ghToken, '***')}`);
    // 用带 token 的 URL push，但不留在 git config 里
    run(`git push -u ${remoteUrl} main 2>&1`, { stdio: 'inherit' });
    // 改回不带 token 的 remote（避免 token 留在 .git/config）
    run(`git remote set-url origin https://github.com/${CONFIG.ghUsername}/${CONFIG.repoName}.git`);
    log('  push 完成');
}

// ---------- 步骤 5：创建 Cloudflare Pages 项目 ----------
async function createCloudflareProject() {
    log(`检查 Cloudflare Pages 项目 ${CONFIG.siteName}...`);
    const checkRes = await cfApi('GET', `/client/v4/accounts/${CONFIG.cfAccountId}/pages/projects/${CONFIG.siteName}`);
    if (checkRes.status === 200 && checkRes.data.success) {
        log('  项目已存在，跳过创建');
        return;
    }

    log('创建 Cloudflare Pages 项目...');
    const createRes = await cfApi('POST', `/client/v4/accounts/${CONFIG.cfAccountId}/pages/projects`, {
        name: CONFIG.siteName,
        production_branch: CONFIG.productionBranch,
    });
    if (createRes.status === 200 && createRes.data.success) {
        log('  Pages 项目已创建');
    } else {
        logErr(`创建 Pages 项目失败: ${JSON.stringify(createRes.data)}`);
        process.exit(1);
    }
}

// ---------- 步骤 6：直接部署（用 wrangler pages deploy）----------
async function deployToCloudflare() {
    log('用 Hugo 构建静态文件...');
    const hugoPath = fs.existsSync('/tmp/hugo') ? '/tmp/hugo' : 'hugo';
    try {
        run(`${hugoPath} --minify --gc`, { stdio: 'inherit' });
    } catch (e) {
        logErr(`Hugo 构建失败: ${e.message}`);
        process.exit(1);
    }

    log('部署到 Cloudflare Pages（直接上传，无需连接 Git）...');
    // 设置环境变量给 wrangler
    const env = {
        ...process.env,
        CLOUDFLARE_API_TOKEN: CONFIG.cfApiToken,
        CLOUDFLARE_ACCOUNT_ID: CONFIG.cfAccountId,
    };
    try {
        execSync(
            `npx wrangler pages deploy public --project-name=${CONFIG.siteName} --branch=main`,
            { stdio: 'inherit', cwd: PROJECT_ROOT, env }
        );
    } catch (e) {
        logErr(`部署失败: ${e.message}`);
        process.exit(1);
    }
}

// ---------- 步骤 7：输出结果 ----------
function printResult() {
    const repoUrl = `https://github.com/${CONFIG.ghUsername}/${CONFIG.repoName}`;
    const siteUrl = `https://${CONFIG.siteName}.pages.dev`;
    console.log('\n========================================');
    console.log('✓ 部署完成！');
    console.log('========================================\n');
    console.log(`GitHub 仓库:  ${repoUrl}`);
    console.log(`网站地址:    ${siteUrl}`);
    console.log(`Cloudflare:  https://dash.cloudflare.com → Workers & Pages → ${CONFIG.siteName}\n`);
    console.log('接下来：');
    console.log(`  1. 去 ${repoUrl}/issues 写第一篇文章`);
    console.log('  2. GitHub Actions 会自动同步到网站（首次可能需要去 Actions 页面手动触发一次 sync workflow）');
    console.log('  3. 几分钟后刷新 ' + siteUrl + ' 就能看到\n');
}

// ---------- 主流程 ----------
async function main() {
    console.log(`
╔══════════════════════════════════════════╗
║   V2EX 风格博客 - 一键部署              ║
║   GitHub 仓库 + Cloudflare Pages        ║
╚══════════════════════════════════════════╝
`);

    await collectConfig();
    updateHugoConfig();
    await createGitHubRepo();
    pushToGitHub();
    await createCloudflareProject();
    await deployToCloudflare();
    printResult();
}

main().catch(e => {
    logErr(`致命错误: ${e.message}`);
    console.error(e);
    process.exit(1);
});
