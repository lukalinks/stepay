(function () {
    var ACCENT = '#00d4aa';

    function injectStyles() {
        if (document.getElementById('stepay-embed-styles')) return;
        var style = document.createElement('style');
        style.id = 'stepay-embed-styles';
        style.textContent =
            '.stepay-pay-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:0;border-radius:999px;background:' +
            ACCENT +
            ';color:#041012;font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 0 24px rgba(0,212,170,.35);transition:transform .15s ease,box-shadow .15s ease}' +
            '.stepay-pay-btn:hover{transform:translateY(-1px);box-shadow:0 0 32px rgba(0,212,170,.5)}' +
            '.stepay-embed-frame{width:100%;max-width:420px;height:520px;border:0;border-radius:16px;background:#0a0f14}';
        document.head.appendChild(style);
    }

    function openCheckout(url) {
        var w = 440;
        var h = 680;
        var left = Math.max(0, (window.screen.width - w) / 2);
        var top = Math.max(0, (window.screen.height - h) / 2);
        window.open(url, 'stepay_checkout', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
    }

    function embedCheckoutUrl(raw) {
        if (!raw) return '';
        var url = raw.trim();
        if (url.indexOf('embed=1') >= 0) return url;
        var sep = url.indexOf('?') >= 0 ? '&' : '?';
        return url + sep + 'embed=1';
    }

    function initCheckoutButtons() {
        document.querySelectorAll('[data-stepay-checkout]').forEach(function (el) {
            if (el.getAttribute('data-stepay-init') === '1') return;
            el.setAttribute('data-stepay-init', '1');
            var url = el.getAttribute('data-stepay-checkout');
            if (!url) return;
            if (el.tagName === 'A') {
                el.classList.add('stepay-pay-btn');
                el.setAttribute('href', url);
                el.setAttribute('target', '_blank');
                el.setAttribute('rel', 'noopener noreferrer');
                if (!el.textContent || !el.textContent.trim()) el.textContent = 'Pay with Stepay';
                return;
            }
            el.classList.add('stepay-pay-btn');
            if (!el.textContent || !el.textContent.trim()) el.textContent = 'Pay with Stepay';
            el.addEventListener('click', function (e) {
                e.preventDefault();
                openCheckout(url);
            });
        });
    }

    function initEmbedFrames() {
        document.querySelectorAll('[data-stepay-embed]').forEach(function (el) {
            if (el.getAttribute('data-stepay-init') === '1') return;
            var url = el.getAttribute('data-stepay-embed');
            if (!url) return;
            el.setAttribute('data-stepay-init', '1');
            el.innerHTML = '';
            var iframe = document.createElement('iframe');
            iframe.src = embedCheckoutUrl(url);
            iframe.className = 'stepay-embed-frame';
            iframe.title = 'Pay with Stepay';
            iframe.allow = 'payment';
            el.appendChild(iframe);
        });
    }

    function init() {
        injectStyles();
        initCheckoutButtons();
        initEmbedFrames();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.StepayEmbed = { init: init, version: '1.1.0' };
})();
