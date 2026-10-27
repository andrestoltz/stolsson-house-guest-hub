(() => {
  const targets = new Set([
    'assets/wedding.jpg',
    'assets/kitchen.jpg',
    'assets/hero.jpg',
    'assets/view.jpg'
  ]);

  const cache = new Map();

  function cleanSource(src) {
    if (cache.has(src)) return cache.get(src);

    const promise = new Promise((resolve) => {
      const im = new Image();

      im.onload = () => {
        try {
          const w = im.naturalWidth;
          const h = im.naturalHeight;

          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;

          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(im, 0, 0);

          const data = ctx.getImageData(0, 0, w, h).data;

          const dark = (x, y) => {
            const i = (y * w + x) * 4;
            return data[i] < 32 &&
                   data[i + 1] < 32 &&
                   data[i + 2] < 32;
          };

          const rowIsCanvas = (y, l, r) => {
            const step = Math.max(1, Math.floor((r - l + 1) / 240));
            let n = 0;
            let d = 0;

            for (let x = l; x <= r; x += step) {
              n++;
              if (dark(x, y)) d++;
            }

            return n && d / n > 0.985;
          };

          const colIsCanvas = (x, t, b) => {
            const step = Math.max(1, Math.floor((b - t + 1) / 240));
            let n = 0;
            let d = 0;

            for (let y = t; y <= b; y += step) {
              n++;
              if (dark(x, y)) d++;
            }

            return n && d / n > 0.985;
          };

          let top = 0;
          let bottom = h - 1;
          let left = 0;
          let right = w - 1;

          while (top < bottom && rowIsCanvas(top, left, right)) top++;
          while (bottom > top && rowIsCanvas(bottom, left, right)) bottom--;
          while (left < right && colIsCanvas(left, top, bottom)) left++;
          while (right > left && colIsCanvas(right, top, bottom)) right--;

          const cw = right - left + 1;
          const ch = bottom - top + 1;

          if (
            cw < w * 0.35 ||
            ch < h * 0.25 ||
            (cw === w && ch === h)
          ) {
            resolve(src);
            return;
          }

          const out = document.createElement('canvas');
          out.width = cw;
          out.height = ch;

          out.getContext('2d').drawImage(
            im,
            left, top, cw, ch,
            0, 0, cw, ch
          );

          resolve(out.toDataURL('image/jpeg', 0.94));
        } catch (_) {
          resolve(src);
        }
      };

      im.onerror = () => resolve(src);
      im.src = src;
    });

    cache.set(src, promise);
    return promise;
  }

  async function repairVisibleImages() {
    document.querySelectorAll('img').forEach(async (img) => {
      const raw = img.getAttribute('src');

      if (!raw || !targets.has(raw) || img.dataset.canvasFixed) return;

      img.dataset.canvasFixed = '1';
      img.src = await cleanSource(raw);
    });

    const hero = document.querySelector('.photo-hero');

    if (hero && !hero.dataset.canvasFixed) {
      hero.dataset.canvasFixed = '1';

      const clean = await cleanSource('assets/hero.jpg');

      hero.style.backgroundImage =
        `linear-gradient(rgba(20,35,29,.12),rgba(20,35,29,.35)),url("${clean}")`;
    }
  }

  const app = document.getElementById('app');

  if (app) {
    new MutationObserver(repairVisibleImages).observe(app, {
      childList: true,
      subtree: true
    });
  }

  window.addEventListener('load', repairVisibleImages);
  repairVisibleImages();
})();
