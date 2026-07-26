const CACHE_NAME = 'ai-flashcards-v4'; // Đổi số version này mỗi khi muốn "dọn sạch" cache cũ hoàn toàn
const ASSETS = ['index.html', 'manifest.json', 'icon.png'];

self.addEventListener('install', (e) => {
    // Áp dụng Service Worker mới ngay lập tức, không đợi đóng hết các tab/app đang mở
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            // Dọn sạch mọi cache cũ không khớp version hiện tại
            caches.keys().then((keys) => Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }))),
            // Chiếm quyền điều khiển tất cả các tab/app đang mở ngay lập tức, không cần load lại thủ công
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', (e) => {
    // CHIẾN LƯỢC "MẠNG TRƯỚC" (Network First):
    // Luôn cố lấy bản MỚI NHẤT từ server trước. Chỉ khi mất mạng/lỗi mạng mới dùng bản cache cũ làm dự phòng.
    // Đây là điểm khác biệt cốt lõi so với bản cũ (cache-first) — đảm bảo app luôn cập nhật ngay khi có bản deploy mới.
    e.respondWith(
        fetch(e.request)
            .then((networkResponse) => {
                // Lấy được từ mạng thành công -> cập nhật lại cache để dùng làm dự phòng cho lần sau (khi offline)
                const resClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
                return networkResponse;
            })
            .catch(() => {
                // Mất mạng / lỗi mạng -> mới rơi về dùng bản cache đã lưu trước đó
                return caches.match(e.request);
            })
    );
});
