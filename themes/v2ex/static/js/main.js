// ============================================================
// V2EX 风格主题 - 主脚本
// ============================================================

(function () {
    'use strict';

    // 给所有外链添加 target="_blank"
    document.querySelectorAll('.post-content a[href^="http"]').forEach(function (link) {
        if (link.hostname !== window.location.hostname) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    });

    // 给图片添加点击放大效果（简易版）
    document.querySelectorAll('.post-content img').forEach(function (img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function () {
            window.open(img.src, '_blank');
        });
    });

    // 平滑滚动到锚点
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // 控制台彩蛋
    console.log('%c 欢迎来到我的时间轴 ', 'background:#778087;color:#fff;padding:4px 8px;border-radius:3px;');
    console.log('%c Powered by Hugo + Cloudflare Pages + GitHub Issues ', 'color:#999;font-size:12px;');
})();
