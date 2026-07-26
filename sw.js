const CACHE_NAME = 'ai-flashcards-v5'; // Đổi số version này mỗi khi muốn "dọn sạch" cache cũ hoàn toàn
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
            // Chiếm quyền điều khiển tất cả các tab/app đang mở ngay lập tức
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', (e) => {
    // CHIẾN LƯỢC "MẠNG TRƯỚC" (Network First): luôn cố lấy bản MỚI NHẤT từ server trước.
    // Chỉ khi mất mạng mới rơi về dùng bản cache cũ làm dự phòng.
    e.respondWith(
        fetch(e.request)
            .then((networkResponse) => {
                const resClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
                return networkResponse;
            })
            .catch(() => caches.match(e.request))
    );
});

// ================= THÔNG BÁO NGẪU NHIÊN NHẮC HỌC TỪ =================
// LƯU Ý QUAN TRỌNG: Service Worker KHÔNG chạy nền vô hạn 24/7 — trình duyệt/hệ điều hành
// sẽ tự tắt (terminate) SW sau một thời gian ngắn không hoạt động để tiết kiệm pin/RAM.
// setInterval() ở đây chỉ hoạt động "best-effort": có tác dụng trong lúc app/tab đang mở
// hoặc vừa được mở gần đây, KHÔNG đảm bảo bắn thông báo đúng hẹn khi app đã đóng lâu.
// Đây là giới hạn kỹ thuật chung của Service Worker, không có cách nào khắc phục triệt để
// nếu không dùng Push Notification thật sự từ server (cần thêm backend riêng để trigger).
let notificationInterval = null;

// Khoảng cách TỐI THIỂU giữa 2 lần thông báo (giống các app nhắc học thông thường: vài tiếng/lần,
// không dồn dập). Đổi số giờ ở đây nếu muốn thưa/dày hơn.
const MIN_HOURS_BETWEEN_NOTIFICATIONS = 3;
let lastNotificationTime = 0;

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'START_NOTIFICATIONS') {
        const flashcards = event.data.flashcards;
        if (notificationInterval) clearInterval(notificationInterval);

        // Quét mỗi 15 phút để phản ứng nhanh khi SW còn "sống", nhưng CHỈ bắn thông báo
        // khi đã cách lần trước tối thiểu MIN_HOURS_BETWEEN_NOTIFICATIONS tiếng — giống cách
        // các app nhắc học/nhắc việc thông thường giãn cách, tránh dồn dập gây khó chịu.
        notificationInterval = setInterval(() => {
            const now = new Date();
            const hour = now.getHours();
            const msSinceLast = now.getTime() - lastNotificationTime;
            const enoughTimePassed = msSinceLast >= MIN_HOURS_BETWEEN_NOTIFICATIONS * 60 * 60 * 1000;

            // Khung giờ từ 9h sáng đến 22h tối, và phải đã đủ giãn cách kể từ lần thông báo trước
            if (hour >= 9 && hour <= 22 && enoughTimePassed && flashcards && flashcards.length > 0) {
                const randomCard = flashcards[Math.floor(Math.random() * flashcards.length)];
                const title = "🧠 Thử thách trí nhớ Flashcard!";
                const options = {
                    body: `Đố cậu, từ "${randomCard.word}" có nghĩa là gì nhỉ?`,
                    icon: 'icon.png',
                    badge: 'icon.png',
                    tag: 'flashcard-reminder'
                };
                self.registration.showNotification(title, options);
                lastNotificationTime = now.getTime();
            }
        }, 15 * 60 * 1000); // Quét mỗi 15 phút (chỉ chạy khi SW còn "sống")
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});
