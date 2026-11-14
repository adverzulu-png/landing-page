document.addEventListener('DOMContentLoaded', function () {
  console.log('leadform.js fixed loaded');

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfyPPRyfeTx93IYrLmA-PuuzQyrpDtusKSN38c2LeSP37FdMQzSrViCGZhg7SQsaYn/exec";

  const forms = document.querySelectorAll('form#contactForm');
  if (!forms.length) {
    console.warn('Forms with id="contactForm" not found');
    return;
  }

  function showResponse(form, html) {
    const container = form.closest('#form-container');
    const responseDiv = container ? container.querySelector('#response') : null;
    if (responseDiv) {
      responseDiv.innerHTML = html;
    } else {
      alert(html.replace(/<[^>]*>/g, ''));
    }
  }

  function toggleLoading(form, isLoading) {
    const container = form.closest('#form-container');
    const responseDiv = container ? container.querySelector('#response') : null;
    if (!responseDiv) return;
    if (isLoading) {
      responseDiv.innerHTML = `
        <div class="spinner-container">
          <div class="spinner"></div>
          <span>Sending…</span>
        </div>
      `;
    } else {
      responseDiv.innerHTML = '';
    }
  }

  function waitForGAClientId(timeoutMs = 2000) {
    return new Promise((resolve) => {
      if (window.GA_CLIENT_ID) return resolve(window.GA_CLIENT_ID);

      const start = Date.now();
      const t = setInterval(() => {
        if (window.GA_CLIENT_ID) {
          clearInterval(t);
          return resolve(window.GA_CLIENT_ID);
        }
        if (Date.now() - start >= timeoutMs) {
          clearInterval(t);
          try {
            const m = document.cookie.match(/_ga=([^;]+)/);
            if (m && m[1]) {
              const parts = m[1].split('.');
              if (parts.length >= 4) {
                return resolve(parts.slice(-2).join('.'));
              }
            }
          } catch (e) {}
          return resolve('');
        }
      }, 100);
    });
  }

  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      toggleLoading(form, true);

      (async () => {
        try {
          const name = form.querySelector('[name="name"]')?.value || '';
          const email = form.querySelector('[name="email"]')?.value || '';
          const message = form.querySelector('[name="message"]')?.value || '';
          const agreeEl = form.querySelector('[name="agree"]');
          const agree = agreeEl ? (agreeEl.checked ? 'yes' : 'no') : '';
          
          const pagePath = window.location.href;

          const rawClientId = await waitForGAClientId(2000);
          const clientId = rawClientId || '';

          const payload = { name, email, message, agree, pagePath, clientId };
          console.log('payload ->', payload);

          await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          toggleLoading(form, false);
          showResponse(
            form,
            '<span class="form_text_sub">Thank you! Your request has been sent.<br>We have received your message and will contact you shortly.</span>'
          );
          form.reset();
        } catch (err) {
          console.error('Error sending', err);
          toggleLoading(form, false);
          showResponse(form, '<span class="form_text_sub">Error sending. Please try again later.</span>');
        }
      })();
    });
  });
});
