# Aplikasi Pemesanan Cafe "Catatan Pena"

Aplikasi web pemesanan mandiri (self-order) lengkap untuk sebuah kafe, dibangun dengan Node.js dan Express. Aplikasi ini dirancang untuk kemudahan penggunaan baik bagi pelanggan maupun admin, dengan fitur-fitur modern seperti pembayaran QRIS, kustomisasi menu, dan dasbor admin yang interaktif. Proyek ini dibuat dalam satu file untuk mempermudah proses deployment.

---

## ✨ Fitur Utama

### 👤 Untuk Pelanggan
- **Menu Interaktif**: Tampilan menu yang dikelompokkan per kategori dengan efek hover dan rating produk.
- **Kustomisasi Pesanan**: Opsi untuk menyesuaikan item (misalnya, suhu, tingkat gula, level pedas) dan menambahkan catatan khusus.
- **Keranjang Belanja Dinamis**: Sistem keranjang belanja yang mudah dikelola dengan kalkulasi subtotal, diskon, dan pajak secara real-time.
- **Sistem Voucher**: Pelanggan dapat memasukkan kode voucher untuk mendapatkan diskon.
- **Pembayaran QRIS**: Integrasi dengan payment gateway Duitku untuk pembayaran via QRIS langsung di halaman, dilengkapi dengan countdown 10 menit.
- **Cek Status Pesanan**: Halaman khusus bagi pelanggan untuk melacak status pesanan mereka (Dibayar -> Disiapkan -> Selesai).
- **Halaman Review**: Setelah pesanan selesai, pelanggan dapat memberikan rating dan komentar berdasarkan Order ID. Review akan tampil secara real-time di halaman review.
- **Notifikasi Email**: Pelanggan menerima notifikasi email HTML yang elegan untuk konfirmasi pembayaran dan setiap pembaruan status pesanan.
- **Popup Promo**: Notifikasi popup menarik saat pertama kali mengunjungi situs, yang kontennya dapat diatur oleh admin.

### ⚙️ Untuk Admin
- **Dasbor Komprehensif**: Halaman admin yang dilindungi kata sandi dengan ringkasan penjualan dan manajemen data.
- **Refresh Pesanan Real-time**: Daftar pesanan di dasbor diperbarui secara otomatis setiap 15 detik tanpa me-refresh halaman (menggunakan AJAX).
- **Manajemen Pesanan**: Admin dapat melihat dan memperbarui status pesanan dari 'paid' menjadi 'preparing', lalu 'completed'.
- **Laporan Penjualan**: Laporan penjualan harian dan bulanan dengan rincian pendapatan kotor, bersih, diskon, dan pajak.
- **Ekspor ke CSV**: Fitur untuk mengekspor laporan penjualan harian atau bulanan ke dalam format file CSV.
- **CRUD Menu & Kategori**: Manajemen penuh untuk menambah, mengedit, dan menghapus item menu serta kategori.
- **Upload Gambar**: Kemudahan mengunggah gambar produk langsung dari perangkat, tidak hanya melalui URL.
- **Manajemen Voucher**: Membuat dan menghapus kode voucher diskon.
- **Manajemen Konten Halaman**: Admin dapat dengan mudah mengubah konten halaman statis seperti "Tentang Kami", "Kontak", dan "Lowongan Pekerjaan" melalui editor teks.
- **Manajemen Promo Popup**: Mengaktifkan/menonaktifkan dan mengubah konten popup promosi (judul, pesan, gambar).

---

## 🛠️ 
- **Backend**: Node.js, Express.js
- **Database**: LowDB (database JSON file-based)
- **Frontend**: HTML, Tailwind CSS, JavaScript (Vanilla)
- **Pembayaran**: Duitku Payment Gateway API
- **Notifikasi**: Nodemailer (untuk pengiriman email via SMTP)
- **File Upload**: Multer

---

## 🚀 Instalasi & Konfigurasi
Hubungi saya melalui email support@araii.id

Untuk demo bisa langsung ke cafe.araii.id
username : cpena
password : admin123
---
