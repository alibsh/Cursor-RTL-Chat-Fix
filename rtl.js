(function () {
'use strict';

if (window.__cursorRtlFixLoaded) return;
window.__cursorRtlFixLoaded = true;

/*
 * Persian / Arabic / Hebrew Unicode ranges.
 *
 * Persian characters such as:
 * پ چ ژ گ
 *
 * are included in the Arabic Unicode blocks.
 */
var RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/*
 * These are actual Cursor chat / composer areas.
 *
 * We intentionally do NOT touch the whole DOM.
 */
var CHAT_ROOTS = [
    '.ui-conversation-viewer',
    '.ui-turn-view',
    '.ui-agent-tray',
    '.composer-ai-message',
    '.composer-human-message',
    '.composer-pane',
    '.markdown-root',
    '.anysphere-markdown-container-root',
    '.markdown-section',
    '.ui-prompt-input',
    '.ui-prompt-input .ProseMirror',
    '.aislash-editor-input',
    '.aislash-editor-input-readonly'
].join(',');

/*
 * Code and editor elements must remain LTR.
 */
var CODE_SELECTOR = [
    'pre',
    'code',
    '.ui-code-block',
    '.monaco-editor',
    '.markdown-code-outer-container',
    '.cursor-code-block-content',
    '[data-streamdown="code-block"]',
    '[data-streamdown="code-block-body"]'
].join(',');

/*
 * UI areas which should never be touched.
 */
var EXCLUDED_SELECTOR = [
    '.ui-model-picker__trigger',
    '.ui-model-picker__item-content',
    '.ui-dropdown-menu',
    '.monaco-menu'
].join(',');

function isElement(el) {
    return el && el.nodeType === 1;
}

function isCode(el) {
    if (!isElement(el)) return false;

    return (
        el.matches(CODE_SELECTOR) ||
        !!el.closest(CODE_SELECTOR)
    );
}

function isExcluded(el) {
    if (!isElement(el)) return false;

    return !!el.closest(EXCLUDED_SELECTOR);
}

/*
 * Returns text while ignoring code blocks.
 *
 * This prevents a Persian/Arabic comment inside a code block
 * from making the whole surrounding message RTL.
 */
function getVisibleText(el) {
    if (!isElement(el)) return '';

    var walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                var parent = node.parentElement;

                if (!parent) {
                    return NodeFilter.FILTER_REJECT;
                }

                if (
                    parent.closest(CODE_SELECTOR) ||
                    parent.closest(EXCLUDED_SELECTOR)
                ) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    var text = '';
    var node;

    while ((node = walker.nextNode())) {
        text += ' ' + (node.textContent || '');
    }

    return text.trim();
}

function containsRTL(text) {
    return RTL_CHAR.test(text || '');
}

/*
 * Apply direction to one logical piece of text.
 */
function applyDirection(el) {
    if (!isElement(el)) return;
    if (isCode(el)) return;
    if (isExcluded(el)) return;

    var text = getVisibleText(el);

    if (!text) return;

    var rtl = containsRTL(text);

    el.setAttribute('dir', rtl ? 'rtl' : 'ltr');

    el.style.setProperty(
        'direction',
        rtl ? 'rtl' : 'ltr',
        'important'
    );

    el.style.setProperty(
        'text-align',
        rtl ? 'right' : 'left',
        'important'
    );

    el.style.setProperty(
        'unicode-bidi',
        'isolate',
        'important'
    );
}

/*
 * These are the logical blocks inside an AI response.
 *
 * We deliberately work on paragraphs/headings/list items/etc.
 * instead of forcing the direction on the entire markdown root.
 */
var TEXT_BLOCK_SELECTOR = [
    'p',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'dt',
    'dd'
].join(',');

function processMarkdown(root) {
    if (!isElement(root)) return;
    if (isCode(root) || isExcluded(root)) return;

    var blocks = root.querySelectorAll(TEXT_BLOCK_SELECTOR);

    /*
     * If there are no normal Markdown blocks, the root itself
     * may contain plain text.
     */
    if (blocks.length === 0) {
        applyDirection(root);
        return;
    }

    blocks.forEach(function (block) {
        if (!isCode(block) && !isExcluded(block)) {
            applyDirection(block);
        }
    });
}

/*
 * Process a rendered user message.
 */
function processHumanMessage(el) {
    if (!isElement(el)) return;
    if (isCode(el) || isExcluded(el)) return;

    applyDirection(el);
}

/*
 * Process a composer/input.
 */
function processComposer(el) {
    if (!isElement(el)) return;

    if (
        el.matches(
            '.ui-prompt-input, ' +
            '.ui-prompt-input .ProseMirror, ' +
            '.aislash-editor-input, ' +
            '.aislash-editor-input-readonly'
        )
    ) {
        applyDirection(el);
    }
}

function processChatArea(root) {
    if (!isElement(root)) return;
    if (isExcluded(root)) return;

    /*
     * User message
     */
    if (root.matches('.composer-human-message')) {
        processHumanMessage(root);
    }

    /*
     * AI / Markdown response
     */
    if (
        root.matches(
            '.markdown-root, ' +
            '.anysphere-markdown-container-root, ' +
            '.markdown-section'
        )
    ) {
        processMarkdown(root);
    }

    /*
     * Composer
     */
    processComposer(root);

    /*
     * Nested Markdown containers
     */
    root.querySelectorAll(
        '.markdown-root, ' +
        '.anysphere-markdown-container-root, ' +
        '.markdown-section'
    ).forEach(function (el) {
        processMarkdown(el);
    });

    /*
     * Nested human messages.
     */
    root.querySelectorAll(
        '.composer-human-message'
    ).forEach(function (el) {
        processHumanMessage(el);
    });

    /*
     * Nested composers.
     */
    root.querySelectorAll(
        '.ui-prompt-input, ' +
        '.ui-prompt-input .ProseMirror, ' +
        '.aislash-editor-input, ' +
        '.aislash-editor-input-readonly'
    ).forEach(function (el) {
        processComposer(el);
    });
}

function scan() {
    document.querySelectorAll(CHAT_ROOTS).forEach(function (root) {
        processChatArea(root);
    });
}

/*
 * Cursor streams AI responses and creates/changes DOM nodes
 * continuously, so we need to watch the chat area.
 */
var observer = new MutationObserver(function (mutations) {
    var shouldScan = false;

    mutations.forEach(function (mutation) {
        if (mutation.type === 'characterData') {
            shouldScan = true;
            return;
        }

        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    shouldScan = true;
                }
            });
        }
    });

    if (shouldScan) {
        scan();
    }
});

function boot() {
    if (!document.body) return;

    scan();

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    /*
     * Cursor can finish constructing the chat UI after initial load.
     * Periodically scan for a short time after startup.
     */
    var ticks = 0;

    var interval = setInterval(function () {
        scan();

        ticks++;

        if (ticks >= 120) {
            clearInterval(interval);
        }
    }, 500);
}

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        boot,
        { once: true }
    );
} else {
    boot();
}


})();