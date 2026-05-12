/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useRef } from 'react';

const HCAPTCHA_SCRIPT_ID = 'hcaptcha-api-script';
const HCAPTCHA_SCRIPT_SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit';

function loadHCaptchaScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('hCaptcha requires a browser runtime'));
  }
  if (window.hcaptcha) {
    return Promise.resolve(window.hcaptcha);
  }
  if (window.__hcaptchaScriptPromise) {
    return window.__hcaptchaScriptPromise;
  }

  window.__hcaptchaScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(HCAPTCHA_SCRIPT_ID);
    const script = existing || document.createElement('script');

    const handleLoad = () => resolve(window.hcaptcha);
    const handleError = () => reject(new Error('Failed to load hCaptcha'));

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.id = HCAPTCHA_SCRIPT_ID;
      script.src = HCAPTCHA_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return window.__hcaptchaScriptPromise;
}

const HCaptchaWidget = ({ sitekey, onVerify, onExpire, onError }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });

  callbacksRef.current = { onVerify, onExpire, onError };

  useEffect(() => {
    if (!sitekey) {
      return undefined;
    }

    let cancelled = false;

    loadHCaptchaScript()
      .then((hcaptcha) => {
        if (cancelled || !containerRef.current || !hcaptcha) {
          return;
        }

        widgetIdRef.current = hcaptcha.render(containerRef.current, {
          sitekey,
          callback: (token) => callbacksRef.current.onVerify?.(token),
          'expired-callback': () => callbacksRef.current.onExpire?.(),
          'error-callback': (error) => callbacksRef.current.onError?.(error),
        });
      })
      .catch((error) => callbacksRef.current.onError?.(error));

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.hcaptcha?.remove) {
        window.hcaptcha.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [sitekey]);

  return <div ref={containerRef} />;
};

export default HCaptchaWidget;
