/**
 * 无障碍(a11y)辅助模块
 */

function generateSkipLink(targetId = 'main-content') {
  return `<a href="#${targetId}" class="skip-link">跳转到主要内容</a>`;
}

function generateA11yWrapper(content) {
  return `<main id="main-content" role="main">\n${content}\n</main>`;
}

function getSkipLinkCSS() {
  return `.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  z-index: 9999;
  padding: 8px 16px;
  background: var(--primary, #2D9D5C);
  color: #fff;
  text-decoration: none;
  border-radius: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}
.skip-link:focus {
  top: 0;
}`;
}

module.exports = { generateSkipLink, generateA11yWrapper, getSkipLinkCSS };
