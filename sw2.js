self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

let notificationInterval = null;

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'START_NOTIFICATIONS') {
        const flashcards = event.data.flashcards;
        if (notificationInterval) clearInterval(notificationInterval);

        // Kiểm tra mỗi 30 phút xem có đang trong khung giờ 9h - 22h không
        notificationInterval = setInterval(() => {
            const now = new Date();
            const hour = now.getHours();

            // Khung giờ từ 9h sáng (9) đến 22h (10 giờ tối)
            if (hour >= 9 && hour <= 22 && flashcards && flashcards.length > 0) {
                // 30% xác suất xuất hiện thông báo mỗi lần quét để tạo sự ngẫu nhiên
                if (Math.random() < 0.3) {
                    const randomCard = flashcards[Math.floor(Math.random() * flashcards.length)];
                    const title = "🧠 Thử thách trí nhớ Flashcard!";
                    const options = {
                        body: `Đố cậu, từ "${randomCard.word}" có nghĩa là gì nhỉ?`,
                        icon: 'icon.png',
                        badge: 'icon.png',
                        tag: 'flashcard-reminder'
                    };
                    self.registration.showNotification(title, options);
                }
            }
        }, 30 * 60 * 1000); // Kiểm tra mỗi 30 phút
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
