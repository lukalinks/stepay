(function () {
    var ACCENT = '#00d4aa';
    var style = document.createElement('style');
    style.textContent =
        '.stepay-pay-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:0;border-radius:999px;background:' +
        ACCENT +
        ';color:#041012;font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 0 24px rgba(0,212,170,.35);transition:transform .15s ease,box-shadow .15s ease}' +
        '.stepay-pay-btn:hover{transform:translateY(-1px);box-shadow:0 0 32px rgba(0,212,170,.5)}' +
        '.stepay-embed-frame{width:100%;max-width:420px;height:520px;border:0;border-radius:16px;background:#0a0f14}';
    document.head.appendChild(style);

    function openCheckout(url) {
        var w = 440;
        var h = 680;
        var left = Math.max(0, (window.screen.width - w) / 2);
        var top = Math.max(0, (window.screen.height - h) / 2);
        window.open(url, 'stepay_checkout', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
    }

    document.querySelectorAll('[data-stepay-checkout]').forEach(function (el) {
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

    document.querySelectorAll('[data-stepay-embed]').forEach(function (el) {
        var url = el.getAttribute('data-stepay-embed');
        if (!url) return;
        var sep = url.indexOf('?') >= 0 ? '&' : '?';
        var iframe = document.createElement('iframe');
        iframe.src = url + sep + 'embed=1';
        iframe.className = 'stepay-embed-frame';
        iframe.title = 'Pay with Stepay';
        el.appendChild(iframe);
    });
})();
