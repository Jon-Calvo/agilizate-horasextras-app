static call(action, params = {}) {
  return new Promise((resolve, reject) => {

    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const payload = { action, token, ...params };

    const cbName = 'cb_' + Date.now();

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[cbName];
      const script = document.getElementById(cbName);
      if (script) script.remove();
    }

    window[cbName] = function (data) {
      cleanup();
      resolve(data);
    };

    const url = CONFIG.API_URL
      + '?callback=' + cbName
      + '&payload=' + encodeURIComponent(JSON.stringify(payload));

    const script = document.createElement('script');
    script.id = cbName;
    script.src = url;

    script.onerror = () => {
      cleanup();
      reject(new Error('Error de red'));
    };

    document.head.appendChild(script);
  });
}
