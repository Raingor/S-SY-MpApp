// Native rich-text does not provide reliable anchor navigation. Render explicit
// copy actions for HTTPS links supplied by the visitor-guide rich content.
function httpsLink(value) {
  const url = typeof value === 'string' ? value.trim() : '';
  return /^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(url) ? url : '';
}

function decodeEntities(value) {
  return String(value || '').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity) => {
    if (entity[0] !== '#') return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }[entity.toLowerCase()];
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

function getRichLinks(...values) {
  const links = [];
  const seen = new Set();
  const add = (href, label) => {
    const url = httpsLink(href);
    if (!url || seen.has(url)) return;
    seen.add(url);
    links.push({ url, label: String(label || '').replace(/\s+/g, ' ').trim() || url });
  };
  const plainTexts = [];
  const nodeText = (nodes) => (Array.isArray(nodes) ? nodes : []).map((node) => node && (node.text || nodeText(node.children)) || '').join('');
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach((node) => {
        if (!node || typeof node !== 'object') return;
        if (node.name === 'a') {
          add(node.attrs && node.attrs.href, nodeText(node.children));
          return; // Anchor targets win over URL-looking labels.
        }
        if (typeof node.text === 'string') plainTexts.push(node.text);
        visit(node.children);
      });
    } else if (typeof value === 'string') {
      const visibleHtml = value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
      const anchors = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
      let anchor;
      while ((anchor = anchors.exec(visibleHtml))) {
        const href = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(anchor[1]);
        if (href) add(decodeEntities(href[1] || href[2] || href[3]), decodeEntities(anchor[2].replace(/<[^>]*>/g, '')));
      }
      // Legacy guide text is escaped into HTML without becoming an <a>. Inspect
      // visible text only, never image src/style attributes or anchor labels.
      plainTexts.push(decodeEntities(visibleHtml.replace(anchors, ' ').replace(/<[^>]*>/g, ' ')));
    }
  };
  values.forEach(visit);
  plainTexts.forEach((value) => {
    const urls = value.match(/https:\/\/[^\s<>"'`，。；：！？、（）【】「」『』《》“”‘’]+/gi) || [];
    urls.forEach((candidate) => {
      let url = candidate.replace(/[.,;:!?]+$/, '');
      // Drop prose delimiters, but retain balanced URL parentheses / IPv6 brackets.
      const pairs = { ')': '(', ']': '[', '}': '{' };
      while (pairs[url.slice(-1)]) {
        const close = url.slice(-1);
        const open = pairs[close];
        if (url.split(close).length <= url.split(open).length) break;
        url = url.slice(0, -1).replace(/[.,;:!?]+$/, '');
      }
      add(url, url);
    });
  });
  return links;
}

function copyVisitorLink(value, messages) {
  const url = httpsLink(value);
  if (!url) return;
  wx.setClipboardData({
    data: url,
    // Avoid the generic clipboard toast replacing the browser instruction.
    showToast: false,
    success: () => wx.showToast({ title: messages.visitorLinkCopied, icon: 'none', duration: 3000 }),
    fail: () => wx.showToast({ title: messages.visitorLinkCopyFailed, icon: 'none' })
  });
}

module.exports = { httpsLink, getRichLinks, copyVisitorLink };
