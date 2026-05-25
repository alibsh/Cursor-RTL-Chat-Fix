(function() {
    if (window.__cursorRtlFixLoaded) return;
    window.__cursorRtlFixLoaded = true;

    var STYLE_ID = 'cursor-rtl-fix-styles';

    var CSS = [
        'html body .markdown-root,',
        'html body .markdown-root.markdown-normalized,',
        'html body .anysphere-markdown-container-root,',
        'html body .markdown-section {',
        '  direction: rtl !important; text-align: right !important; unicode-bidi: isolate !important;',
        '}',
        'html body .markdown-root *:not(pre):not(code):not(.ui-code-block):not(.monaco-editor):not(.markdown-code-outer-container):not(.cursor-code-block-content):not([data-streamdown="code-block"]):not([data-streamdown="code-block-body"]),',
        'html body .anysphere-markdown-container-root *:not(pre):not(code):not(.markdown-code-outer-container),',
        'html body .markdown-section *:not(pre):not(code):not(.markdown-code-outer-container) {',
        '  direction: rtl !important; text-align: right !important; unicode-bidi: isolate !important;',
        '}',
        'html body .markdown-root ul, html body .markdown-root ol,',
        'html body .anysphere-markdown-container-root ul, html body .anysphere-markdown-container-root ol,',
        'html body .markdown-section ul, html body .markdown-section ol {',
        '  padding-right: 20px !important; padding-left: 0 !important; direction: rtl !important;',
        '}',
        'html body .ui-prompt-input, html body .ui-prompt-input .ProseMirror,',
        'html body .aislash-editor-input, html body .aislash-editor-input-readonly,',
        'html body .composer-human-message {',
        '  direction: rtl !important; text-align: right !important;',
        '}',
        'html body .markdown-root pre, html body .markdown-root code,',
        'html body .anysphere-markdown-container-root pre, html body .anysphere-markdown-container-root code,',
        'html body [data-streamdown="code-block"], html body [data-streamdown="code-block-body"],',
        'html body .markdown-code-outer-container, html body .ui-code-block, html body .monaco-editor {',
        '  direction: ltr !important; text-align: left !important; unicode-bidi: plaintext !important;',
        '}',
        'html body .ui-model-picker__trigger, html body .ui-model-picker__trigger *,',
        'html body .ui-model-picker__item-content, html body .ui-model-picker__item-content *,',
        'html body .ui-dropdown-menu, html body .ui-dropdown-menu *,',
        'html body .monaco-menu, html body .monaco-menu * {',
        '  direction: ltr !important; text-align: left !important; unicode-bidi: normal !important;',
        '}'
    ].join('\n');

    var ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    var MARKDOWN_SEL = '.markdown-root,.anysphere-markdown-container-root,.markdown-section';
    var CODE = 'pre,code,.ui-code-block,.monaco-editor,.markdown-code-outer-container,.cursor-code-block-content,[data-streamdown="code-block"],[data-streamdown="code-block-body"]';
    var SKIP = '.ui-model-picker__trigger,.ui-dropdown-menu,.monaco-menu,.ui-user-message-box';

    function injectCss() {
        var style = document.getElementById(STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            document.head.appendChild(style);
        }
        style.textContent = CSS;
    }

    function isCode(el) {
        return el.matches && (el.matches(CODE) || !!el.closest(CODE));
    }

    function isExcluded(el) {
        return el.closest && !!el.closest(SKIP);
    }

    function isChatMarkdown(el) {
        if (!el || el.nodeType !== 1 || isExcluded(el)) return false;
        if (el.matches(MARKDOWN_SEL)) return true;
        return !!el.closest('.ui-conversation-viewer,.ui-turn-view,.ui-agent-tray,.composer-ai-message,.composer-pane,[class*="composer-"]');
    }

    function applyRtl(el) {
        if (!el || el.nodeType !== 1 || isCode(el) || isExcluded(el)) return;
        el.setAttribute('dir', 'rtl');
        el.style.setProperty('direction', 'rtl', 'important');
        el.style.setProperty('text-align', 'right', 'important');
        el.style.setProperty('unicode-bidi', 'isolate', 'important');
    }

    function fixTree(root) {
        if (!root || root.nodeType !== 1) return;
        if (root.matches && root.matches(MARKDOWN_SEL) && isChatMarkdown(root)) {
            applyRtl(root);
            root.querySelectorAll('*').forEach(function(el) {
                if (!isCode(el)) applyRtl(el);
            });
        }
        if (root.shadowRoot) fixTree(root.shadowRoot);
        root.querySelectorAll('*').forEach(function(el) {
            if (el.shadowRoot) fixTree(el.shadowRoot);
        });
    }

    function fixArabicInChat() {
        document.querySelectorAll('.ui-conversation-viewer,.anysphere-markdown-container-root,.markdown-root,.composer-pane,[class*="composer-"]').forEach(function(area) {
            if (isExcluded(area)) return;
            try {
                var walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT, null);
                var node;
                while ((node = walker.nextNode())) {
                    if (!ARABIC.test(node.textContent || '')) continue;
                    var el = node.parentElement;
                    for (var depth = 0; el && el !== area && depth < 12; depth++) {
                        if (isCode(el) || isExcluded(el)) break;
                        applyRtl(el);
                        el = el.parentElement;
                    }
                }
            } catch (e) {}
        });
    }

    var observed = new WeakSet();

    function observeRoot(root) {
        if (!root || observed.has(root)) return;
        observed.add(root);
        fixTree(root);
        new MutationObserver(function() {
            fixTree(root);
            fixArabicInChat();
        }).observe(root, { childList: true, subtree: true, characterData: true });
    }

    function scan() {
        document.querySelectorAll(MARKDOWN_SEL).forEach(function(root) {
            if (isChatMarkdown(root)) observeRoot(root);
        });
        fixArabicInChat();
    }

    function boot() {
        injectCss();
        scan();
        if (!document.body) return;

        new MutationObserver(function(mutations) {
            var dirty = false;
            mutations.forEach(function(m) {
                m.addedNodes.forEach(function(node) {
                    if (node.nodeType !== 1) return;
                    if (node.matches && node.matches(MARKDOWN_SEL)) dirty = true;
                    if (node.querySelectorAll && node.querySelector(MARKDOWN_SEL)) dirty = true;
                });
            });
            if (dirty) scan();
            else fixArabicInChat();
        }).observe(document.body, { childList: true, subtree: true });

        var ticks = 0;
        var interval = setInterval(function() {
            scan();
            if (++ticks >= 120) clearInterval(interval);
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
