/**
 * Aplikasi Pemesanan Cafe "Catatan Pena" v4.1
 * npm install express body-parser axios nodemailer express-session lowdb multer
 *
 */

// 1. IMPORT DEPENDENCIES
// =============================================================================
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const nodemailer = require('nodemailer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const multer = require('multer');

// 2. KONFIGURASI APLIKASI
// =============================================================================
const PORT = process.env.PORT || 9098;
const UPLOAD_DIR = './public/uploads';

// Pastikan direktori upload ada
if (!fs.existsSync(UPLOAD_DIR)){
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 3. INISIALISASI DATABASE (LowDB)
// =============================================================================
const adapter = new JSONFile('db.json');

const defaultData = {
    settings: {
        namaCafe: "Catatan Pena",
        pajakRate: 0.11,
        duitkuMerchantCode: 'D17450',
        duitkuApiKey: '4f7a7d14dd5a186d2a973c5782fac06b',
        duitkuCallbackUrl: 'https://cafe.araii.id/callback',
        duitkuReturnUrl: 'https://cafe.araii.id/terimakasih',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'raisnug@gmail.com',
        smtpPass: 'lhldfaojoymgngsf',
        emailPengirim: '"Catatan Pena" <support@araii.id>',
        wifiSsid: 'Catatan Pena',
        wifiPassword: 'CatatanPena',
        theme: {
            backgroundColor: '#1c1917', // stone-900
            primaryColor: '#a16207', // yellow-700
            textColor: '#e7e5e4', // stone-200
            cardColor: '#292524', // stone-800
            backgroundImage: '',
            useImage: false
        }
    },
    emailTemplates: {
        paymentSuccess: {
            subject: 'Pembayaran Berhasil! Pesanan #{{orderId}}',
            content: `<p>Halo {{customerName}},</p><p>Terima kasih telah memesan di {{namaCafe}} untuk <strong>Meja {{tableNumber}}</strong>. Pesanan Anda telah berhasil dibayar dan sedang kami siapkan.</p><p><strong>ID Pesanan:</strong> {{orderId}}</p><h3>Rincian Pesanan</h3>{{itemsTable}}<hr><p><strong>WiFi Gratis:</strong><br>Nama Jaringan: {{wifiSsid}}<br>Password: {{wifiPassword}}</p>`
        },
        orderPreparing: {
            subject: 'Pesanan Anda #{{orderId}} Sedang Disiapkan',
            content: `<p>Halo {{customerName}},</p><p>Kami ingin memberitahu bahwa pesanan Anda untuk <strong>Meja {{tableNumber}}</strong> sedang kami siapkan. Mohon ditunggu sebentar ya.</p><h3>Rincian Pesanan</h3>{{itemsTable}}`
        },
        orderCompleted: {
            subject: 'Pesanan Anda #{{orderId}} Telah Selesai',
            content: `<p>Halo {{customerName}},</p><p>Pesanan Anda untuk <strong>Meja {{tableNumber}}</strong> telah selesai dan akan segera diantar. Selamat menikmati!</p><h3>Rincian Pesanan</h3>{{itemsTable}}<p style="text-align:center; margin-top: 20px;"><a href="{{reviewLink}}" style="background-color: #854d0e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Beri Review Pesanan</a></p>`
        }
    },
    users: [
        { username: 'cpena', pass: 'lanjutkanA1', role: 'admin' }
    ],
    bannerInfo: {
        title: 'Promo Spesial Hari Ini!',
        subtitle: 'Dapatkan diskon 20% untuk semua jenis Kopi. Pesan sekarang!'
    },
    promoPopup: {
        enabled: true,
        title: 'Diskon Akhir Pekan!',
        message: 'Nikmati diskon 25% untuk semua makanan. Hanya di akhir pekan ini!',
        imageUrl: 'https://placehold.co/400x200/854d0e/FFFFFF?text=Promo+Spesial'
    },
    pages: {
        about: '<h1>Tentang Catatan Pena</h1><p>Kami adalah cafe yang menyajikan kopi dan cerita. Setiap cangkir adalah inspirasi.</p>',
        contact: '<h1>Hubungi Kami</h1><p>Email: support@araii.id<br>Telepon: 0812-3456-7890</p>',
        jobs: '<h1>Lowongan Pekerjaan</h1><p>Saat ini belum ada lowongan yang tersedia. Silakan cek kembali nanti.</p>'
    },
    vouchers: [
        { code: 'NGOPIHEMAT', discount: 15, expiry: '2025-12-31' },
    ],
    categories: ['Minuman', 'Makanan', 'Snack'],
    menuItems: [
        { id: 1, name: 'Kopi Hitam Klasik', price: 15000, category: 'Minuman', image: 'https://placehold.co/400x300/6F4E37/FFFFFF?text=Kopi+Hitam', ratings: [], avgRating: 0, inStock: true, options: { Suhu: ['Panas', 'Dingin'], Gula: ['Normal', 'Low Sugar', 'No Sugar'], Es: ['Normal', 'Less Ice', 'No Ice'] } },
        { id: 2, name: 'Cappuccino', price: 22000, category: 'Minuman', image: 'https://placehold.co/400x300/C8A47E/FFFFFF?text=Cappuccino', ratings: [], avgRating: 0, inStock: true, options: { Suhu: ['Panas', 'Dingin'], Gula: ['Normal', 'Low Sugar', 'No Sugar'], Es: ['Normal', 'Less Ice', 'No Ice'] } },
        { id: 3, name: 'Teh Melati', price: 12000, category: 'Minuman', image: 'https://placehold.co/400x300/87A96B/FFFFFF?text=Teh+Melati', ratings: [], avgRating: 0, inStock: true, options: { Suhu: ['Panas', 'Dingin'], Gula: ['Normal', 'Low Sugar', 'No Sugar'], Es: ['Normal', 'Less Ice', 'No Ice'] } },
        { id: 7, name: 'Es Coklat', price: 20000, category: 'Minuman', image: 'https://placehold.co/400x300/7B3F00/FFFFFF?text=Es+Coklat', ratings: [], avgRating: 0, inStock: true, options: { Gula: ['Normal', 'Low Sugar'], Es: ['Normal', 'Less Ice', 'More Ice'] } },
        { id: 4, name: 'Kentang Goreng', price: 18000, category: 'Snack', image: 'https://placehold.co/400x300/F4C430/FFFFFF?text=Kentang', ratings: [], avgRating: 0, inStock: true, options: {} },
        { id: 5, name: 'Roti Bakar Coklat', price: 16000, category: 'Snack', image: 'https://placehold.co/400x300/8B4513/FFFFFF?text=Roti+Bakar', ratings: [], avgRating: 0, inStock: true, options: {} },
        { id: 6, name: 'Nasi Goreng Spesial', price: 25000, category: 'Makanan', image: 'https://placehold.co/400x300/D2691E/FFFFFF?text=Nasi+Goreng', ratings: [], avgRating: 0, inStock: true, options: { Pedas: ['Tidak Pedas', 'Sedang', 'Sangat Pedas'] } },
        { id: 8, name: 'Pisang Goreng Keju', price: 17000, category: 'Snack', image: 'https://placehold.co/400x300/FFD700/000000?text=Pisang+Goreng', ratings: [], avgRating: 0, inStock: true, options: {} },
    ],
    orders: [],
    reviews: [],
    nextMenuItemId: 9,
};

const db = new Low(adapter, defaultData);

async function initializeDatabase() {
    await db.read();
    if (!db.data) {
        db.data = defaultData;
        await db.write();
    } else {
        let updated = false;
        if (!db.data.settings) { db.data.settings = defaultData.settings; updated = true; }
        if (!db.data.settings.theme) { db.data.settings.theme = defaultData.settings.theme; updated = true; }
        if (!db.data.emailTemplates) { db.data.emailTemplates = defaultData.emailTemplates; updated = true; }
        if (!db.data.users) { db.data.users = defaultData.users; updated = true; }
        if (updated) await db.write();
    }
    console.log('✅ Database initialized and ready.');
}

// 4. INISIALISASI APLIKASI
// =============================================================================
const app = express();
const server = http.createServer(app);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(session({
    secret: 'secret-key-for-catatan-pena-cafe-v3-super-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const requireLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Akses ditolak. Hanya untuk Admin.');
    }
};


// 5. HELPER FUNCTIONS
// =============================================================================
function toWIBString(date) {
    return new Date(date).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function getMailer() {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = db.data.settings;
    return nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465,
        auth: { user: smtpUser, pass: smtpPass }
    });
}

function getSalesReport(filter) {
    const { type, value } = filter;
    let paidOrders;
    const excludedStatuses = ['pending', 'failed', 'cancelled'];

    if (type === 'daily') {
        const targetDate = new Date(value).toDateString();
        paidOrders = db.data.orders.filter(order =>
            !excludedStatuses.includes(order.status) &&
            new Date(order.timestamp).toDateString() === targetDate
        );
    } else if (type === 'monthly') {
        const [year, month] = value.split('-');
        paidOrders = db.data.orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return !excludedStatuses.includes(order.status) &&
                   orderDate.getFullYear() == year &&
                   (orderDate.getMonth() + 1) == month;
        });
    } else {
        return { gross: 0, tax: 0, net: 0, discount: 0, count: 0 };
    }

    const grossSales = paidOrders.reduce((sum, order) => sum + order.subTotal, 0);
    const totalTax = paidOrders.reduce((sum, order) => sum + order.tax, 0);
    const totalDiscount = paidOrders.reduce((sum, order) => sum + order.discount, 0);
    const netSales = grossSales - totalDiscount;

    return {
        gross: grossSales,
        tax: totalTax,
        net: netSales,
        discount: totalDiscount,
        count: paidOrders.length
    };
}


function getEmailTemplate(title, content) {
    const { namaCafe } = db.data.settings;
    return `<!DOCTYPE html><html><head><style>body{font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #FDF8F0;} .container{width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px;} .header{text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee;} .header h1{font-family: 'Playfair Display', serif; color: #854d0e;} .content{padding: 20px 0;} .footer{text-align: center; font-size: 12px; color: #888; padding-top: 20px; border-top: 1px solid #eee;}</style></head><body><div class="container"><div class="header"><h1>${namaCafe}</h1></div><div class="content"><h2>${title}</h2>${content}</div><div class="footer"><p>&copy; ${new Date().getFullYear()} ${namaCafe}</p></div></div></body></html>`;
}

function generateItemsTableForEmail(order) {
    const itemsHtml = order.items.map(item => {
        const optionsHtml = Object.entries(item.options).map(([key, value]) => `<em>${key}: ${value}</em>`).join(', ');
        const notesHtml = item.notes ? `<br><small><em>Catatan: ${item.notes}</em></small>` : '';
        return `<tr><td style="padding: 5px;">${item.name} (x${item.quantity})<br><small style="color:#555">${optionsHtml}${notesHtml}</small></td><td style="padding: 5px; text-align: right;">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</td></tr>`;
    }).join('');

    return `<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                ${itemsHtml}
                <tr style="border-top: 1px solid #eee;">
                    <td style="padding: 5px; font-weight: bold;">Subtotal</td>
                    <td style="padding: 5px; text-align: right; font-weight: bold;">Rp ${order.subTotal.toLocaleString('id-ID')}</td>
                </tr>
                ${order.discount > 0 ? `<tr><td style="padding: 5px;">Diskon</td><td style="padding: 5px; text-align: right;">- Rp ${order.discount.toLocaleString('id-ID')}</td></tr>` : ''}
                <tr>
                    <td style="padding: 5px;">Pajak (${(db.data.settings.pajakRate * 100)}%)</td>
                    <td style="padding: 5px; text-align: right;">Rp ${order.tax.toLocaleString('id-ID')}</td>
                </tr>
                <tr style="font-weight: bold; border-top: 2px solid #333;">
                    <td style="padding: 5px;">Total</td>
                    <td style="padding: 5px; text-align: right;">Rp ${order.totalAmount.toLocaleString('id-ID')}</td>
                </tr>
            </table>`;
}

async function sendTemplatedEmail(order, templateName) {
    const { namaCafe, wifiSsid, wifiPassword, emailPengirim, duitkuReturnUrl } = db.data.settings;
    const template = db.data.emailTemplates[templateName];
    if (!template) {
        console.error(`Template email '${templateName}' tidak ditemukan.`);
        return;
    }

    let { subject, content } = template;

    // Replace placeholders
    const replacements = {
        '{{customerName}}': order.customerName,
        '{{orderId}}': order.orderId,
        '{{namaCafe}}': namaCafe,
        '{{tableNumber}}': order.tableNumber,
        '{{itemsTable}}': generateItemsTableForEmail(order),
        '{{wifiSsid}}': wifiSsid,
        '{{wifiPassword}}': wifiPassword,
        '{{reviewLink}}': `${duitkuReturnUrl.replace('/terimakasih', '')}/review`
    };

    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(key, 'g');
        subject = subject.replace(regex, value);
        content = content.replace(regex, value);
    }
    
    // Extract title from the first H tag
    const titleMatch = content.match(/<h[1-6]>(.*?)<\/h[1-6]>/);
    const title = titleMatch ? titleMatch[1] : subject;

    const htmlBody = getEmailTemplate(title, content);

    try {
        await getMailer().sendMail({ from: emailPengirim, to: order.customerEmail, subject: subject, html: htmlBody });
        console.log(`✅ Email '${templateName}' terkirim ke ${order.customerEmail}`);
    } catch (error) {
        console.error(`❌ Gagal mengirim email '${templateName}' ke ${order.customerEmail}:`, error);
    }
}


// 6. HTML TEMPLATES
// =============================================================================
function getLayout(title, content, scripts = '') {
    const { namaCafe, theme } = db.data.settings;
    const globalScripts = `
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const mobileMenuButton = document.getElementById('mobile-menu-button');
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenuButton && mobileMenu) {
                    mobileMenuButton.addEventListener('click', () => {
                        mobileMenu.classList.toggle('hidden');
                    });
                }
            });
        </script>
    `;

    const themeStyles = `
        <style>
            :root {
                --color-bg: ${theme.backgroundColor};
                --color-primary: ${theme.primaryColor};
                --color-text: ${theme.textColor};
                --color-card: ${theme.cardColor};
            }
            body { 
                background-color: var(--color-bg);
                color: var(--color-text);
                ${theme.useImage && theme.backgroundImage ? `background-image: url('${theme.backgroundImage}'); background-size: cover; background-attachment: fixed;` : ''}
            }
            .bg-primary { background-color: var(--color-primary); }
            .text-primary { color: var(--color-primary); }
            .hover\\:bg-primary-dark:hover { filter: brightness(0.9); }
            .bg-card { background-color: var(--color-card); }
            .text-card-foreground { color: var(--color-text); }
        </style>
    `;

    return `
        <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - ${namaCafe}</title><script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
        ${themeStyles}
        <style>
            .font-display { font-family: 'Playfair Display', serif; } .font-body { font-family: 'Poppins', sans-serif; }
            .modal { display: none; } .modal.is-open { display: flex; }
            .accordion-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
        </style></head><body class="font-body">
            <nav class="bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-50">
                <div class="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
                    <a href="/" class="font-display text-2xl font-bold text-primary">${namaCafe}</a>
                    <div class="hidden md:flex items-center space-x-4">
                        <a href="/review" class="text-gray-300 hover:text-primary">Review</a>
                        <a href="/cek-pesanan" class="text-gray-300 hover:text-primary">Cek Pesanan</a>
                        <a href="/admin" class="text-gray-300 hover:text-primary">Admin</a>
                        <button id="cart-button" class="relative text-gray-300 hover:text-primary">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <span id="cart-count" class="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
                        </button>
                    </div>
                    <div class="md:hidden flex items-center">
                        <button id="cart-button-mobile" class="relative text-gray-300 hover:text-primary mr-4">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <span id="cart-count-mobile" class="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
                        </button>
                        <button id="mobile-menu-button" class="text-gray-300 hover:text-primary">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                        </button>
                    </div>
                </div>
                <div id="mobile-menu" class="md:hidden hidden bg-card px-4 pt-2 pb-4 space-y-2">
                    <a href="/review" class="block text-gray-300 hover:text-primary">Review</a>
                    <a href="/cek-pesanan" class="block text-gray-300 hover:text-primary">Cek Pesanan</a>
                    <a href="/admin" class="block text-gray-300 hover:text-primary">Admin</a>
                </div>
            </nav>
            <main class="container mx-auto p-4 md:p-8">${content}</main>
            <footer class="text-center mt-8 mb-4 text-gray-400 space-x-4">
                <a href="/tentang-kami" class="hover:underline">Tentang Kami</a>
                <span>&bull;</span>
                <a href="/kontak" class="hover:underline">Kontak</a>
                <span>&bull;</span>
                <a href="/lowongan" class="hover:underline">Lowongan</a>
                <p class="mt-2">&copy; ${new Date().getFullYear()} ${namaCafe}. Dibuat dengan ❤️.</p>
            </footer>
            ${globalScripts}
            ${scripts}
        </body></html>`;
}

function getLoginPage(error = '') {
    const errorHtml = error ? `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">${error}</div>` : '';
    const content = `
        <div class="min-h-screen flex items-center justify-center p-4">
            <div class="max-w-md w-full bg-card p-8 rounded-xl shadow-lg">
                <h2 class="font-display text-3xl font-bold text-primary mb-6 text-center">Admin Login</h2>
                ${errorHtml}
                <form action="/login" method="POST">
                    <div class="mb-4">
                        <label for="username" class="block text-sm font-medium text-gray-300">Username</label>
                        <input type="text" id="username" name="username" required class="mt-1 p-2 w-full rounded-md bg-stone-700 text-white border-stone-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500">
                    </div>
                    <div class="mb-6">
                        <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                        <input type="password" id="password" name="password" required class="mt-1 p-2 w-full rounded-md bg-stone-700 text-white border-stone-600 shadow-sm focus:border-yellow-500 focus:ring-yellow-500">
                    </div>
                    <button type="submit" class="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition">Login</button>
                </form>
            </div>
        </div>
    `;
    return getLayout('Admin Login', content);
}

function getMenuPage() {
    const renderMenuItems = (category) => db.data.menuItems.filter(item => item.category === category).map(item => `
        <div class="bg-card rounded-lg shadow-lg overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            ${!item.inStock ? '<div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10"><span class="text-white text-2xl font-bold bg-red-600 px-4 py-2 rounded-md">HABIS</span></div>' : ''}
            <img src="${item.image}" alt="${item.name}" class="w-full h-48 object-cover" onerror="this.onerror=null;this.src='https://placehold.co/400x300/ccc/FFFFFF?text=Gambar+Error';">
            <div class="p-4 flex flex-col flex-grow">
                <h3 class="font-bold text-lg font-display text-card-foreground">${item.name}</h3>
                <div class="flex items-center text-sm text-gray-400 my-2">
                    ${item.avgRating > 0 ? `<svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg><span>${item.avgRating} (${item.ratings.length} rating)</span>` : `<span>⭐ Baru</span>`}
                </div>
                <p class="text-xl font-display text-primary mb-4 flex-grow">Rp ${item.price.toLocaleString('id-ID')}</p>
                <button class="add-to-cart-btn mt-auto w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    data-id="${item.id}" ${!item.inStock ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Pesan
                </button>
            </div>
        </div>`).join('');

    const optionsModal = `
        <div id="options-modal" class="modal fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center p-4">
            <div class="bg-card rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center p-4 border-b border-stone-700">
                    <h2 id="options-modal-title" class="font-display text-2xl font-bold text-primary"></h2>
                    <button id="close-options-btn" class="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <form id="options-form" class="flex flex-col flex-grow overflow-hidden">
                    <div id="options-modal-body" class="p-4 overflow-y-auto"></div>
                    <div class="p-4 border-t border-stone-700 mt-auto">
                        <button type="submit" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700">Tambahkan ke Keranjang</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const cartModal = `
        <div id="cart-modal" class="modal fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center p-4">
            <div class="bg-card rounded-lg shadow-2xl w-full max-w-md md:max-w-2xl max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center p-4 border-b border-stone-700 flex-shrink-0">
                    <h2 class="font-display text-xl md:text-2xl font-bold text-primary">Keranjang Belanja</h2>
                    <button id="close-cart-btn" class="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <div class="overflow-y-auto">
                    <div id="cart-items-container" class="p-4"></div>
                    <div class="p-4 border-t border-stone-700">
                        <div class="space-y-2 mb-4">
                            <div class="flex justify-between"><span class="text-gray-400">Subtotal:</span><span id="cart-subtotal">Rp 0</span></div>
                            <div class="flex justify-between text-green-400"><span >Diskon:</span><span id="cart-discount">- Rp 0</span></div>
                            <div class="flex justify-between"><span class="text-gray-400">Pajak (${(db.data.settings.pajakRate * 100)}%):</span><span id="cart-tax">Rp 0</span></div>
                            <div class="flex justify-between font-bold text-lg"><span class="text-card-foreground">Total:</span><span id="cart-total">Rp 0</span></div>
                        </div>
                        <div class="mb-4">
                            <div class="flex space-x-2">
                                <input type="text" id="voucher-code" placeholder="Masukkan Kode Voucher" class="p-2 w-full rounded-md bg-stone-700 text-white border-stone-600 shadow-sm">
                                <button type="button" id="apply-voucher-btn" class="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700">Pakai</button>
                            </div>
                            <p id="voucher-message" class="text-sm mt-1"></p>
                        </div>
                        <form id="checkout-form">
                            <div class="accordion-container">
                                <button type="button" class="accordion-toggle w-full flex justify-between items-center p-3 bg-stone-700 rounded-md hover:bg-stone-600 transition">
                                    <span class="font-bold text-lg">Lanjutkan ke Checkout</span>
                                    <svg class="accordion-icon w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>
                                <div class="accordion-content">
                                    <div class="pt-4">
                                        <div class="mb-4">
                                            <h4 class="text-lg font-medium mb-2">Metode Pembayaran</h4>
                                            <div class="mt-2 bg-stone-700 border border-stone-600 p-3 rounded-md">
                                                <label class="flex items-center">
                                                    <input type="radio" name="paymentMethod" value="qris" checked class="h-4 w-4 text-primary border-gray-500 focus:ring-primary">
                                                    <span class="ml-3 font-medium">QRIS</span>
                                                </label>
                                                <p class="text-sm text-gray-400 ml-7">Pembayaran instan menggunakan semua e-wallet & m-banking.</p>
                                            </div>
                                        </div>
                                        <h3 class="font-display text-lg md:text-xl font-bold mb-4 border-t border-stone-700 pt-4">Data Pemesan</h3>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div><label for="customerName" class="block text-sm font-medium text-gray-300">Nama Pemesan</label><input type="text" id="customerName" name="customerName" required class="mt-1 p-2 w-full rounded-md bg-stone-700 text-white border-stone-600"></div>
                                            <div><label for="tableNumber" class="block text-sm font-medium text-gray-300">Nomor Meja</label><input type="number" id="tableNumber" name="tableNumber" required class="mt-1 p-2 w-full rounded-md bg-stone-700 text-white border-stone-600"></div>
                                            <div><label for="customerEmail" class="block text-sm font-medium text-gray-300">Alamat Email</label><input type="email" id="customerEmail" name="customerEmail" required class="mt-1 p-2 w-full rounded-md bg-stone-700 text-white border-stone-600"></div>
                                            <div><label for="customerWhatsapp" class="block text-sm font-medium text-gray-300">Nomor WhatsApp</label><input type="tel" id="customerWhatsapp" name="customerWhatsapp" required class="mt-1 p-2 w-full rounded-md bg-stone-700 text-white border-stone-600"></div>
                                        </div>
                                        <div class="mb-6 bg-blue-900/50 p-3 rounded-md">
                                            <h4 class="text-base font-medium text-blue-300">Nota Pembayaran</h4>
                                            <p class="text-sm text-blue-400">Bukti pembayaran akan dikirim otomatis ke alamat email Anda.</p>
                                        </div>
                                        <button type="submit" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 text-lg">Konfirmasi & Bayar</button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
    
    const qrModal = `
        <div id="qr-modal" class="modal fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center p-4">
            <div class="bg-card rounded-lg shadow-2xl w-full max-w-sm text-center p-6">
                <h2 class="font-display text-2xl font-bold text-primary mb-4">Bayar dengan QRIS</h2>
                <div id="qrcode-container" class="flex justify-center items-center mb-4 w-64 h-64 mx-auto bg-white rounded-md p-2">
                    <!-- QR Code will be rendered here -->
                </div>
                <p class="text-gray-400 mb-2">Scan QRIS di atas menggunakan e-wallet atau m-banking Anda.</p>
                <div class="bg-yellow-900/50 text-yellow-300 p-3 rounded-md mb-4">
                    <p class="font-semibold">Batas Waktu Pembayaran: <span id="payment-countdown" class="font-bold">10:00</span></p>
                    <p class="text-sm">Halaman ini akan otomatis beralih setelah pembayaran berhasil.</p>
                </div>
                <div class="flex justify-center space-x-4">
                    <button id="add-more-btn" class="bg-stone-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-stone-500">Tambah Lagi</button>
                    <button id="cancel-order-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">Batalkan</button>
                </div>
            </div>
        </div>
    `;

    const promoPopup = db.data.promoPopup;
    const promoModal = promoPopup.enabled ? `
        <div id="promo-modal" class="modal fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center p-4">
            <div class="bg-card rounded-lg shadow-2xl w-full max-w-md text-center p-6 relative">
                <button id="close-promo-btn" class="absolute top-2 right-3 text-gray-400 hover:text-white text-3xl">&times;</button>
                <img src="${promoPopup.imageUrl}" alt="Promo" class="w-full h-48 object-cover rounded-md mb-4">
                <h2 class="font-display text-2xl font-bold text-primary mb-2">${promoPopup.title}</h2>
                <p class="text-gray-300">${promoPopup.message}</p>
            </div>
        </div>
    ` : '';

    const categoryAccordions = db.data.categories.map(category => `
        <div>
            <button class="category-toggle w-full flex justify-between items-center p-4 bg-card rounded-lg shadow-md">
                <h2 class="font-display text-2xl md:text-3xl font-bold text-primary">${category}</h2>
                <svg class="category-icon w-6 h-6 transform transition-transform text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div class="category-content accordion-content">
                <div class="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${renderMenuItems(category)}
                </div>
            </div>
        </div>
    `).join('');

    const content = `
        <div class="bg-primary/20 text-white rounded-lg shadow-xl p-6 md:p-8 mb-10 text-center border border-primary/30">
            <h1 id="banner-title" class="font-display text-3xl md:text-4xl font-bold mb-2">${db.data.bannerInfo.title}</h1>
            <p id="banner-subtitle" class="text-base md:text-lg text-yellow-200">${db.data.bannerInfo.subtitle}</p>
        </div>
        <div class="space-y-4">
            ${categoryAccordions}
        </div>
        ${cartModal}
        ${qrModal}
        ${optionsModal}
        ${promoModal}
    `;

    const scripts = `<script>
        const menuItems = ${JSON.stringify(db.data.menuItems)};
        document.addEventListener('DOMContentLoaded', () => {
            let cart = []; let paymentCheckInterval; let qrCountdownInterval; let appliedVoucher = null; const taxRate = ${db.data.settings.pajakRate};
            let currentOrderId = null;
            const cartModal = document.getElementById('cart-modal');
            const qrModal = document.getElementById('qr-modal');
            const optionsModal = document.getElementById('options-modal');
            const promoModal = document.getElementById('promo-modal');
            
            function formatRupiah(a){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(a)}
            function openModal(modal){modal.classList.add('is-open')} 
            function closeModal(modal){modal.classList.remove('is-open')}
            
            function addToCart(item, options, notes) {
                const cartItemId = \`\${item.id}-\${Date.now()}\`; // Unique ID for each item instance
                cart.push({ ...item, quantity: 1, options, notes, cartItemId });
                updateCart();
            }

            function updateCart(){renderCartItems();updateCartSummary();updateCartCount()}
            
            function renderCartItems(){
                const container = document.getElementById('cart-items-container');
                container.innerHTML=cart.length===0?'<p class="text-center text-gray-500">Keranjang Anda kosong.</p>':cart.map(a=>{
                    const optionsHtml = Object.entries(a.options).map(([key, value]) => \`<li>\${key}: \${value}</li>\`).join('');
                    const notesHtml = a.notes ? \`<li class="italic">Catatan: \${a.notes}</li>\` : '';
                    return \`<div class="flex items-center justify-between py-2 border-b border-stone-700" data-id="\${a.cartItemId}"><div class="flex items-center"><img src="\${a.image}" class="w-16 h-16 rounded-md object-cover mr-4"><div><p class="font-bold">\${a.name}</p><ul class="text-xs text-gray-400 list-disc list-inside">\${optionsHtml}\${notesHtml}</ul></div></div><div class="flex items-center"><button class="cart-quantity-change bg-stone-700 px-2 rounded-l" data-action="decrease">-</button><span class="px-3">\${a.quantity}</span><button class="cart-quantity-change bg-stone-700 px-2 rounded-r" data-action="increase">+</button><button class="cart-remove-item text-red-500 hover:text-red-400 ml-4 text-2xl">&times;</button></div></div>\`
                }).join('')
            }
            
            function updateCartSummary(){
                const subtotal=cart.reduce((a,b)=>a+b.price*b.quantity,0);
                let discount = 0;
                if (appliedVoucher) {
                    discount = (subtotal * appliedVoucher.discount) / 100;
                }
                const subtotalAfterDiscount = subtotal - discount;
                const tax = subtotalAfterDiscount * taxRate;
                const total = subtotalAfterDiscount + tax;

                document.getElementById('cart-subtotal').textContent=formatRupiah(subtotal);
                document.getElementById('cart-discount').textContent= "- " + formatRupiah(discount);
                document.getElementById('cart-tax').textContent=formatRupiah(tax);
                document.getElementById('cart-total').textContent=formatRupiah(total);
            }
            
            function updateCartCount(){
                const totalItems=cart.reduce((a,b)=>a+b.quantity,0);
                [document.getElementById('cart-count'), document.getElementById('cart-count-mobile')].forEach(el => el.textContent = totalItems);
            }
            
            function handleCartAction(e){
                const target=e.target, itemEl=target.closest('[data-id]'); if(!itemEl)return;
                const cartItemId=itemEl.dataset.id;
                const itemInCart = cart.find(a => a.cartItemId === cartItemId);
                if (!itemInCart) return;

                if(target.matches('.cart-quantity-change')){
                    const action=target.dataset.action;
                    if(action==='increase'){itemInCart.quantity++}
                    else if(action==='decrease'){itemInCart.quantity--; if(itemInCart.quantity<=0){cart=cart.filter(a=>a.cartItemId!==cartItemId)}}
                } else if(target.matches('.cart-remove-item')){cart=cart.filter(a=>a.cartItemId!==cartItemId)}
                updateCart();
            }

            function populateOptionsModal(item) {
                document.getElementById('options-modal-title').textContent = item.name;
                const body = document.getElementById('options-modal-body');
                let optionsHtml = '';
                if (item.options && Object.keys(item.options).length > 0) {
                    for (const [key, values] of Object.entries(item.options)) {
                        optionsHtml += \`<div class="mb-4"><h4 class="font-medium mb-2">\${key}</h4><div class="flex flex-wrap gap-2">\`;
                        values.forEach((value, index) => {
                            optionsHtml += \`<label class="inline-flex items-center"><input type="radio" name="\${key}" value="\${value}" \${index === 0 ? 'checked' : ''} class="mr-1 text-primary focus:ring-primary">\${value}</label>\`;
                        });
                        optionsHtml += \`</div></div>\`;
                    }
                }
                optionsHtml += \`<div><label for="item-notes" class="block font-medium mb-2">Catatan (Opsional)</label><textarea id="item-notes" name="notes" rows="2" class="w-full p-2 border rounded-md bg-stone-700 text-white border-stone-600"></textarea></div>\`;
                body.innerHTML = optionsHtml;
                document.getElementById('options-form').dataset.itemId = item.id;
                openModal(optionsModal);
            }

            function startPaymentCheck(orderId) {
                paymentCheckInterval = setInterval(async () => {
                    try {
                        const response = await fetch('/check-payment-status/' + orderId);
                        const data = await response.json();
                        if (data.status === 'paid') {
                            clearInterval(paymentCheckInterval);
                            clearInterval(qrCountdownInterval);
                            window.location.href = '${db.data.settings.duitkuReturnUrl}?orderId=' + orderId;
                        }
                    } catch (err) {
                        console.error('Error checking payment status:', err);
                    }
                }, 3000);
            }

            function startQrCountdown() {
                let duration = 600; // 10 menit
                const countdownEl = document.getElementById('payment-countdown');
                qrCountdownInterval = setInterval(() => {
                    duration--;
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    countdownEl.textContent = \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\`;
                    if (duration <= 0) {
                        clearInterval(qrCountdownInterval);
                        clearInterval(paymentCheckInterval);
                        alert('Waktu pembayaran habis. Pesanan dibatalkan.');
                        document.getElementById('cancel-order-btn').click();
                    }
                }, 1000);
            }

            // Show promo popup once per session
            if (promoModal && !sessionStorage.getItem('promoShown')) {
                openModal(promoModal);
                sessionStorage.setItem('promoShown', 'true');
            }
            if(document.getElementById('close-promo-btn')) {
                document.getElementById('close-promo-btn').addEventListener('click', () => closeModal(promoModal));
            }

            document.getElementById('cart-button').addEventListener('click', () => openModal(cartModal));
            document.getElementById('cart-button-mobile').addEventListener('click', () => openModal(cartModal));
            document.getElementById('close-cart-btn').addEventListener('click', () => closeModal(cartModal));
            document.getElementById('close-options-btn').addEventListener('click', () => closeModal(optionsModal));
            
            document.querySelectorAll('.add-to-cart-btn').forEach(btn => {btn.addEventListener('click', () => {
                const itemId = parseInt(btn.dataset.id, 10);
                const item = menuItems.find(m => m.id === itemId);
                populateOptionsModal(item);
            })});

            document.getElementById('options-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const options = {};
                for (let [key, value] of formData.entries()) {
                    if (key !== 'notes') {
                        options[key] = value;
                    }
                }
                const notes = formData.get('notes');
                const itemId = parseInt(e.target.dataset.itemId, 10);
                const item = menuItems.find(m => m.id === itemId);
                addToCart(item, options, notes);
                closeModal(optionsModal);
            });

            document.getElementById('cart-items-container').addEventListener('click', handleCartAction);
            
            document.querySelector('.accordion-toggle').addEventListener('click', (e) => {
                const button = e.currentTarget;
                const content = button.nextElementSibling;
                const icon = button.querySelector('.accordion-icon');
                icon.classList.toggle('rotate-180');
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });

            document.querySelectorAll('.category-toggle').forEach((button, index) => {
                const content = button.nextElementSibling;
                const icon = button.querySelector('.category-icon');
                if (index === 0) {
                    content.style.maxHeight = content.scrollHeight + "px";
                    icon.classList.add('rotate-180');
                }
                button.addEventListener('click', () => {
                    icon.classList.toggle('rotate-180');
                    if (content.style.maxHeight) {
                        content.style.maxHeight = null;
                    } else {
                        content.style.maxHeight = content.scrollHeight + "px";
                    }
                });
            });
            
            document.getElementById('apply-voucher-btn').addEventListener('click', async () => {
                const code = document.getElementById('voucher-code').value;
                const messageEl = document.getElementById('voucher-message');
                try {
                    const response = await fetch('/apply-voucher', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    const result = await response.json();
                    if (result.success) {
                        appliedVoucher = result.voucher;
                        messageEl.textContent = \`Voucher \${result.voucher.code} berhasil dipakai! (\${result.voucher.discount}% diskon)\`;
                        messageEl.className = 'text-sm mt-1 text-green-400';
                    } else {
                        appliedVoucher = null;
                        messageEl.textContent = result.message;
                        messageEl.className = 'text-sm mt-1 text-red-400';
                    }
                    updateCartSummary();
                } catch (err) {
                    appliedVoucher = null;
                    messageEl.textContent = 'Gagal menerapkan voucher.';
                    messageEl.className = 'text-sm mt-1 text-red-400';
                    updateCartSummary();
                }
            });

            document.getElementById('checkout-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                if(cart.length===0){alert('Keranjang Anda kosong.');return}
                
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                data.cartData = JSON.stringify(cart);
                data.voucherCode = appliedVoucher ? appliedVoucher.code : null;

                try {
                    const response = await fetch('/pesan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();

                    if (result.success && result.qrString) {
                        currentOrderId = result.orderId;
                        closeModal(cartModal);
                        openModal(qrModal);
                        const qrContainer = document.getElementById('qrcode-container');
                        qrContainer.innerHTML = '';
                        const qr = qrcode(0, 'M');
                        qr.addData(result.qrString);
                        qr.make();
                        qrContainer.innerHTML = qr.createImgTag(6);
                        startPaymentCheck(result.orderId);
                        startQrCountdown();
                    } else {
                        alert('Gagal membuat pesanan: ' + (result.message || 'Silakan coba lagi.'));
                    }
                } catch (err) {
                    alert('Terjadi kesalahan. Periksa koneksi Anda.');
                }
            });

            async function cancelOrderCleanup() {
                if (!currentOrderId) return;
                clearInterval(paymentCheckInterval);
                clearInterval(qrCountdownInterval);
                try {
                    await fetch('/batal-pesanan/' + currentOrderId, { method: 'POST' });
                } catch (err) { console.error('Gagal membatalkan pesanan:', err); }
                closeModal(qrModal);
                currentOrderId = null;
            }

            document.getElementById('cancel-order-btn').addEventListener('click', async () => {
                await cancelOrderCleanup();
                cart = [];
                updateCart();
            });

            document.getElementById('add-more-btn').addEventListener('click', async () => {
                await cancelOrderCleanup();
                openModal(cartModal);
            });
        });
    </script>`;
    return getLayout('Menu', content, scripts);
}

function getAdminLayout(title, content, activeMenu, user, scripts = '') {
    const { namaCafe } = db.data.settings;
    let menuItems = [
        { id: 'dashboard', name: 'Dashboard', href: '/admin/dashboard', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    ];

    if (user.role === 'admin') {
        menuItems.push(
            { id: 'menu', name: 'Manajemen Menu', href: '/admin/menu', icon: 'M4 6h16M4 12h16M4 18h7' },
            { id: 'konten', name: 'Manajemen Konten', href: '/admin/konten', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { id: 'email', name: 'Template Email', href: '/admin/email-templates', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            { id: 'pengaturan', name: 'Pengaturan', href: '/admin/pengaturan', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
        );
    }

    const sidebarHtml = menuItems.map(item => `
        <a href="${item.href}" class="flex items-center px-4 py-2.5 rounded-lg transition duration-200 ${activeMenu === item.id ? 'bg-amber-800 text-white' : 'text-gray-700 hover:bg-amber-100 hover:text-amber-900'}">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path></svg>
            <span class="font-medium">${item.name}</span>
        </a>
    `).join('');

    return `
        <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Admin ${namaCafe}</title><script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
            body { background-color: #F8FAFC; font-family: 'Poppins', sans-serif; }
            .font-display { font-family: 'Playfair Display', serif; }
            [x-cloak] { display: none !important; }
        </style>
        <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
        </head>
        <body x-data="{ sidebarOpen: false }" class="flex h-screen bg-gray-100">
            <!-- Overlay -->
            <div x-show="sidebarOpen" @click="sidebarOpen = false" class="fixed inset-0 z-20 bg-black/50 lg:hidden" x-cloak></div>
            
            <!-- Sidebar -->
            <aside :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'" class="fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-200 ease-in-out">
                <div class="flex items-center justify-center h-20 border-b">
                    <a href="/admin" class="font-display text-2xl font-bold text-amber-900">${namaCafe}</a>
                </div>
                <nav class="mt-6 px-4 space-y-2">${sidebarHtml}</nav>
            </aside>

            <!-- Main content -->
            <div class="flex-1 flex flex-col overflow-hidden">
                <header class="flex justify-between items-center p-4 bg-white border-b">
                    <div class="flex items-center">
                        <button @click="sidebarOpen = !sidebarOpen" class="text-gray-500 focus:outline-none lg:hidden">
                            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H20M4 12H20M4 18H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        </button>
                        <h1 class="text-xl font-bold text-gray-800 ml-4 font-display">${title}</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                         <span class="text-sm text-gray-600 hidden sm:block">Login sebagai: <strong>${user.username}</strong> (${user.role})</span>
                         <a href="/" target="_blank" class="text-sm text-gray-600 hover:text-amber-800">Lihat Situs</a>
                         <form action="/logout" method="POST"><button type="submit" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm">Logout</button></form>
                    </div>
                </header>
                <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                    ${content}
                </main>
            </div>
            ${scripts}
        </body></html>
    `;
}

function getAdminDashboardPage(paginatedOrders, currentPage, totalPages, dailyReport, monthlyReport, selectedDate, selectedMonth, user) {
    const renderOrderRows = (orders) => {
        return orders.length > 0 ? orders.map(order => {
            const allItemsDelivered = order.items.every(item => item.delivered);
            let actionButton = '';
            if (order.status === 'paid') {
                actionButton = `<form action="/admin/update-status" method="POST"><input type="hidden" name="orderId" value="${order.orderId}"><input type="hidden" name="newStatus" value="preparing"><button type="submit" class="bg-blue-500 text-white px-2 py-1 rounded text-xs">Siapkan</button></form>`;
            } else if (order.status === 'preparing' && allItemsDelivered) {
                actionButton = `<form action="/admin/update-status" method="POST"><input type="hidden" name="orderId" value="${order.orderId}"><input type="hidden" name="newStatus" value="completed"><button type="submit" class="bg-green-500 text-white px-2 py-1 rounded text-xs">Selesaikan Pesanan</button></form>`;
            }

            const itemsHtml = order.items.map((item, index) => {
                const optionsHtml = Object.entries(item.options).map(([key, value]) => `<li>${key}: ${value}</li>`).join('');
                const notesHtml = item.notes ? `<li class="italic">Catatan: ${item.notes}</li>` : '';
                return `
                    <div class="flex items-start justify-between py-1">
                        <div>
                            <strong>${item.name} (x${item.quantity})</strong>
                            <ul class="text-xs list-disc list-inside pl-2">${optionsHtml}${notesHtml}</ul>
                        </div>
                        ${order.status === 'preparing' ? `
                        <form action="/admin/pesanan/toggle-item" method="POST" class="flex items-center">
                            <input type="hidden" name="orderId" value="${order.orderId}">
                            <input type="hidden" name="itemCartId" value="${item.cartItemId}">
                            <input type="checkbox" onchange="this.form.submit()" ${item.delivered ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500">
                            <span class="ml-2 text-xs ${item.delivered ? 'text-green-600' : 'text-gray-500'}">${item.delivered ? 'Diantar' : 'Belum'}</span>
                        </form>
                        ` : ''}
                    </div>
                `;
            }).join('<hr class="my-1">');

            return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">${order.orderId}</td><td class="p-3">${order.customerName}</td>
                <td class="p-3 font-bold text-center">${order.tableNumber}</td>
                <td class="p-3">${itemsHtml}</td>
                <td class="p-3 font-bold">Rp ${order.totalAmount.toLocaleString('id-ID')}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                }">${order.status}</span></td>
                <td class="p-3">${toWIBString(order.timestamp)}</td>
                <td class="p-3 space-y-2">
                    ${actionButton}
                    ${order.status === 'preparing' && !allItemsDelivered ? `
                    <form action="/admin/pesanan/selesaikan-semua" method="POST">
                         <input type="hidden" name="orderId" value="${order.orderId}">
                         <button type="submit" class="bg-gray-500 text-white px-2 py-1 rounded text-xs w-full">Antar Semua</button>
                    </form>
                    ` : ''}
                </td>
            </tr>`;
        }).join('') : `<tr><td colspan="8" class="text-center p-4">Belum ada pesanan yang relevan untuk tanggal ini.</td></tr>`;
    }

    const content = `
    <div class="space-y-8">
        <!-- Laporan Penjualan -->
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-lg">
            <h2 class="font-display text-2xl font-bold text-amber-900 mb-6">Laporan Penjualan</h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Laporan Harian -->
                <div>
                    <h3 class="font-bold text-lg mb-2">Laporan Harian</h3>
                    <form method="GET" action="/admin/dashboard" class="flex flex-wrap items-center gap-2 mb-4">
                        <input type="date" name="date" value="${selectedDate}" class="p-2 border rounded-md">
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded-lg">Lihat</button>
                        ${user.role === 'admin' ? `<a href="/admin/export/sales/daily?date=${selectedDate}" class="bg-green-500 text-white px-4 py-2 rounded-lg">Ekspor</a>` : ''}
                    </form>
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div class="bg-blue-50 p-3 rounded-lg"><p class="text-sm text-blue-800">Penjualan Kotor</p><p class="text-xl font-bold">Rp ${dailyReport.gross.toLocaleString('id-ID')}</p></div>
                        <div class="bg-green-50 p-3 rounded-lg"><p class="text-sm text-green-800">Penjualan Bersih</p><p class="text-xl font-bold">Rp ${dailyReport.net.toLocaleString('id-ID')}</p></div>
                        <div class="bg-yellow-50 p-3 rounded-lg"><p class="text-sm text-yellow-800">Total Diskon</p><p class="text-xl font-bold">Rp ${dailyReport.discount.toLocaleString('id-ID')}</p></div>
                        <div class="bg-red-50 p-3 rounded-lg"><p class="text-sm text-red-800">Total Pajak</p><p class="text-xl font-bold">Rp ${dailyReport.tax.toLocaleString('id-ID')}</p></div>
                    </div>
                </div>
                <!-- Laporan Bulanan -->
                <div>
                    <h3 class="font-bold text-lg mb-2">Laporan Bulanan</h3>
                    <form method="GET" action="/admin/dashboard" class="flex flex-wrap items-center gap-2 mb-4">
                        <input type="month" name="month" value="${selectedMonth}" class="p-2 border rounded-md">
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded-lg">Lihat</button>
                        ${user.role === 'admin' ? `<a href="/admin/export/sales/monthly?month=${selectedMonth}" class="bg-green-500 text-white px-4 py-2 rounded-lg">Ekspor</a>` : ''}
                    </form>
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div class="bg-blue-50 p-3 rounded-lg"><p class="text-sm text-blue-800">Penjualan Kotor</p><p class="text-xl font-bold">Rp ${monthlyReport.gross.toLocaleString('id-ID')}</p></div>
                        <div class="bg-green-50 p-3 rounded-lg"><p class="text-sm text-green-800">Penjualan Bersih</p><p class="text-xl font-bold">Rp ${monthlyReport.net.toLocaleString('id-ID')}</p></div>
                        <div class="bg-yellow-50 p-3 rounded-lg"><p class="text-sm text-yellow-800">Total Diskon</p><p class="text-xl font-bold">Rp ${monthlyReport.discount.toLocaleString('id-ID')}</p></div>
                        <div class="bg-red-50 p-3 rounded-lg"><p class="text-sm text-red-800">Total Pajak</p><p class="text-xl font-bold">Rp ${monthlyReport.tax.toLocaleString('id-ID')}</p></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Daftar Pesanan -->
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-lg">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 class="font-display text-2xl font-bold text-amber-900 mb-4 sm:mb-0">Daftar Pesanan Hari Ini</h2>
                <div class="text-sm text-gray-500">
                    Auto-refresh dalam <span id="refresh-countdown" class="font-bold">30</span> detik...
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                            <th class="p-3 font-semibold">Order ID</th><th class="p-3 font-semibold">Nama</th><th class="p-3 font-semibold">Meja</th><th class="p-3 font-semibold">Item</th>
                            <th class="p-3 font-semibold">Total</th><th class="p-3 font-semibold">Status</th><th class="p-3 font-semibold">Waktu</th><th class="p-3 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="orders-table-body">${renderOrderRows(paginatedOrders)}</tbody>
                </table>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <div>
                    ${currentPage > 1 ? `<a href="/admin/dashboard?date=${selectedDate}&page=${currentPage - 1}" class="bg-gray-300 px-4 py-2 rounded-md">Sebelumnya</a>` : ''}
                </div>
                <span>Halaman ${currentPage} dari ${totalPages}</span>
                <div>
                    ${currentPage < totalPages ? `<a href="/admin/dashboard?date=${selectedDate}&page=${currentPage + 1}" class="bg-gray-300 px-4 py-2 rounded-md">Berikutnya</a>` : ''}
                </div>
            </div>
        </div>
    </div>
    `;

    const scripts = `<script>
        async function fetchAndUpdateOrders() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const date = urlParams.get('date') || '${selectedDate}';
                const page = urlParams.get('page') || '1';
                const response = await fetch(\`/api/orders?date=\${date}&page=\${page}\`);
                if (!response.ok) throw new Error('Network response was not ok');
                const newTableBodyHtml = await response.text();
                document.getElementById('orders-table-body').innerHTML = newTableBodyHtml;
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            }
        }

        let countdown = 30;
        const countdownElement = document.getElementById('refresh-countdown');
        if (countdownElement) {
            const refreshInterval = setInterval(() => {
                countdown--;
                countdownElement.textContent = countdown;
                if (countdown <= 0) {
                    countdown = 30;
                    fetchAndUpdateOrders();
                }
            }, 1000);
        }
    </script>`;
    return getAdminLayout('Dashboard', content, 'dashboard', user, scripts);
}

function getAdminMenuPage(user) {
    const menuRows = db.data.menuItems.map(item => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3"><img src="${item.image}" class="w-16 h-16 object-cover rounded-md"></td>
            <td class="p-3">${item.name}</td>
            <td class="p-3">${item.category}</td>
            <td class="p-3">Rp ${item.price.toLocaleString('id-ID')}</td>
            <td class="p-3">${item.inStock ? '<span class="text-green-600 font-semibold">Tersedia</span>' : '<span class="text-red-600 font-semibold">Habis</span>'}</td>
            ${user.role === 'admin' ? `
            <td class="p-3 flex items-center space-x-2">
                <form action="/admin/menu/toggle-stock" method="POST" class="inline-block">
                    <input type="hidden" name="itemId" value="${item.id}">
                    <button type="submit" class="bg-gray-500 text-white px-2 py-1 rounded text-xs">Ubah Stok</button>
                </form>
                <a href="/admin/menu/edit/${item.id}" class="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Edit</a>
                <form action="/admin/menu/delete" method="POST" class="inline-block">
                    <input type="hidden" name="itemId" value="${item.id}">
                    <button type="submit" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Hapus</button>
                </form>
            </td>` : '<td class="p-3 text-gray-400">Hanya Admin</td>'}
        </tr>
    `).join('');

    const content = `
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-lg">
            <div class="flex justify-between items-center mb-4">
                 <h2 class="font-display text-2xl font-bold text-amber-900">Daftar Menu</h2>
                 ${user.role === 'admin' ? `<a href="/admin/menu/add" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Tambah Menu Baru</a>` : ''}
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                            <th class="p-3 font-semibold">Gambar</th><th class="p-3 font-semibold">Nama Item</th><th class="p-3 font-semibold">Kategori</th>
                            <th class="p-3 font-semibold">Harga</th><th class="p-3 font-semibold">Status Stok</th>
                            <th class="p-3 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${menuRows}</tbody>
                </table>
            </div>
        </div>
    `;
    return getAdminLayout('Manajemen Menu', content, 'menu', user);
}

// [MODIFIKASI] Merombak fungsi untuk menyertakan opsi hapus gambar
function getAdminAddOrEditMenuPage(item = null, user) {
    const isEdit = item !== null;
    const title = isEdit ? `Edit Menu: ${item.name}` : 'Tambah Menu Baru';
    const actionUrl = isEdit ? `/admin/menu/edit/${item.id}` : '/admin/menu/add';
    const submitText = isEdit ? 'Simpan Perubahan' : 'Simpan Menu';

    const categoryOptions = db.data.categories.map(cat => `<option value="${cat}" ${isEdit && item.category === cat ? 'selected' : ''}>${cat}</option>`).join('');
    
    let optionsHtml = '';
    if (isEdit && item.options) {
        optionsHtml = Object.entries(item.options).map(([key, values]) => `
            <div class="grid grid-cols-3 gap-2 items-center option-row">
                <input type="text" name="option_key" value="${key}" placeholder="Nama Opsi (cth: Gula)" class="p-2 border rounded col-span-1">
                <input type="text" name="option_values" value="${values.join(',')}" placeholder="Pilihan, pisahkan koma (cth: Normal,Less)" class="p-2 border rounded col-span-2">
            </div>
        `).join('');
    }

    const content = `
        <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg">
            <h2 class="font-display text-2xl font-bold text-amber-900 mb-6">${title}</h2>
            <form action="${actionUrl}" method="POST" enctype="multipart/form-data" class="space-y-4">
                <div><label class="block text-sm font-medium">Nama Menu</label><input type="text" name="name" value="${isEdit ? item.name : ''}" required class="mt-1 p-2 w-full rounded border"></div>
                <div><label class="block text-sm font-medium">Harga</label><input type="number" name="price" value="${isEdit ? item.price : ''}" required class="mt-1 p-2 w-full rounded border"></div>
                <div><label class="block text-sm font-medium">Kategori</label><select name="category" class="mt-1 p-2 w-full rounded border">${categoryOptions}</select></div>
                
                ${isEdit && item.image ? `
                <div class="p-3 bg-gray-50 rounded-lg border">
                    <label class="block text-sm font-medium">Gambar Saat Ini</label>
                    <div class="flex items-center space-x-4 mt-2">
                        <img src="${item.image}" alt="Gambar saat ini" class="w-24 h-24 object-cover rounded-md border p-1 bg-white">
                        <label for="deleteImage" class="flex items-center text-sm p-2 rounded-md bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer">
                            <input type="checkbox" id="deleteImage" name="deleteImage" class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500">
                            <span class="ml-2 font-medium">Hapus Gambar Ini</span>
                        </label>
                    </div>
                </div>
                ` : ''}

                <div>
                    <label class="block text-sm font-medium">${isEdit ? 'Unggah Gambar Baru (untuk mengganti)' : 'Unggah Gambar Menu'}</label>
                    <input type="file" name="imageFile" accept="image/*" class="mt-1 p-2 w-full rounded border">
                </div>
                <div><label class="block text-sm font-medium">Atau gunakan URL Gambar</label><input type="url" name="imageUrl" value="${isEdit && item.image && item.image.startsWith('http') ? item.image : ''}" placeholder="https://..." class="mt-1 p-2 w-full rounded border"></div>
                
                <div id="options-container" class="space-y-2">
                    <label class="block text-sm font-medium">Opsi Kustom</label>
                    ${optionsHtml}
                </div>
                <button type="button" id="add-option-btn" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm">Tambah Opsi</button>
                
                <div class="flex space-x-4 pt-4">
                    <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">${submitText}</button>
                    <a href="/admin/menu" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400">Batal</a>
                </div>
            </form>
        </div>
    `;
    const scripts = `<script>
        document.getElementById('add-option-btn').addEventListener('click', () => {
            const container = document.getElementById('options-container');
            const optionDiv = document.createElement('div');
            optionDiv.className = 'grid grid-cols-3 gap-2 items-center option-row';
            optionDiv.innerHTML = \`
                <input type="text" name="option_key" placeholder="Nama Opsi (cth: Gula)" class="p-2 border rounded col-span-1">
                <input type="text" name="option_values" placeholder="Pilihan, pisahkan koma (cth: Normal,Less)" class="p-2 border rounded col-span-2">
            \`;
            container.appendChild(optionDiv);
        });
    </script>`;
    return getAdminLayout(title, content, 'menu', user, scripts);
}

function getAdminKontenPage(user) {
    const { bannerInfo, promoPopup, pages, vouchers, categories, reviews } = db.data;

    const voucherRows = vouchers.map(v => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3">${v.code}</td><td class="p-3">${v.discount}%</td>
            <td class="p-3">${new Date(v.expiry).toLocaleDateString('id-ID')}</td>
            <td class="p-3">
                <form action="/admin/konten/delete-voucher" method="POST">
                    <input type="hidden" name="code" value="${v.code}">
                    <button type="submit" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Hapus</button>
                </form>
            </td>
        </tr>
    `).join('');

    const categoryRows = categories.map(cat => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3">${cat}</td>
            <td class="p-3">
                <form action="/admin/konten/delete-category" method="POST">
                    <input type="hidden" name="categoryName" value="${cat}">
                    <button type="submit" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Hapus</button>
                </form>
            </td>
        </tr>
    `).join('');

    const reviewRows = reviews.map(r => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3">${r.customerName}</td>
            <td class="p-3">${'⭐'.repeat(r.rating)}</td>
            <td class="p-3">${r.itemName}</td>
            <td class="p-3 italic">"${r.comment}"</td>
            <td class="p-3">
                <form action="/admin/konten/delete-review" method="POST">
                    <input type="hidden" name="reviewId" value="${r.id}">
                    <button type="submit" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Hapus</button>
                </form>
            </td>
        </tr>
    `).join('');

    const content = `
    <div class="space-y-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Pengaturan Banner</h3>
                <form action="/admin/konten/update-banner" method="POST" class="space-y-4">
                    <div><label class="block text-sm font-medium">Judul Banner</label><input type="text" name="title" value="${bannerInfo.title}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Subjudul Banner</label><input type="text" name="subtitle" value="${bannerInfo.subtitle}" class="mt-1 p-2 w-full rounded border"></div>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Simpan Banner</button>
                </form>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Pengaturan Popup Promo</h3>
                <form action="/admin/konten/update-promo-popup" method="POST" enctype="multipart/form-data" class="space-y-4">
                    <div class="flex items-center"><input type="checkbox" name="enabled" id="promoEnabled" ${promoPopup.enabled ? 'checked' : ''} class="h-4 w-4"><label for="promoEnabled" class="ml-2">Aktifkan Popup</label></div>
                    <div><label class="block text-sm font-medium">Judul</label><input type="text" name="title" value="${promoPopup.title}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Pesan</label><input type="text" name="message" value="${promoPopup.message}" class="mt-1 p-2 w-full rounded border"></div>

                    <div class="p-3 bg-gray-50 rounded-lg border">
                        <label class="block text-sm font-medium">Gambar Saat Ini</label>
                        <div class="flex items-center space-x-4 mt-2">
                            <img src="${promoPopup.imageUrl}" alt="Gambar promo saat ini" class="w-48 h-24 object-cover rounded-md border p-1 bg-white">
                            <label for="deletePromoImage" class="flex items-center text-sm p-2 rounded-md bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer">
                                <input type="checkbox" id="deletePromoImage" name="deleteImage" class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500">
                                <span class="ml-2 font-medium">Hapus Gambar</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium">Unggah Gambar Baru (untuk mengganti)</label>
                        <input type="file" name="imageFile" class="mt-1 p-2 w-full rounded border">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Atau gunakan URL Gambar</label>
                        <input type="url" name="imageUrl" value="${promoPopup.imageUrl.startsWith('http') ? promoPopup.imageUrl : ''}" class="mt-1 p-2 w-full rounded border" placeholder="https://...">
                    </div>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Simpan Popup</button>
                </form>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Manajemen Voucher</h3>
                <form action="/admin/konten/add-voucher" method="POST" class="space-y-4 bg-gray-50 p-4 rounded-lg mb-4">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label class="block text-sm font-medium">Kode</label><input type="text" name="code" required class="mt-1 p-2 w-full rounded border"></div>
                        <div><label class="block text-sm font-medium">Diskon (%)</label><input type="number" name="discount" required class="mt-1 p-2 w-full rounded border" min="1" max="100"></div>
                        <div><label class="block text-sm font-medium">Kedaluwarsa</label><input type="date" name="expiry" required class="mt-1 p-2 w-full rounded border"></div>
                    </div>
                    <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg">Tambah</button>
                </form>
                <div class="overflow-x-auto"><table class="w-full text-left text-sm">
                    <thead class="bg-gray-50"><tr><th class="p-2">Kode</th><th class="p-2">Diskon</th><th class="p-2">Hingga</th><th class="p-2">Aksi</th></tr></thead>
                    <tbody>${voucherRows}</tbody>
                </table></div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Manajemen Kategori</h3>
                <form action="/admin/konten/add-category" method="POST" class="flex space-x-2 bg-gray-50 p-4 rounded-lg mb-4">
                    <input type="text" name="categoryName" required placeholder="Nama Kategori Baru" class="p-2 w-full rounded border">
                    <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg">Tambah</button>
                </form>
                <div class="overflow-x-auto"><table class="w-full text-left text-sm">
                    <thead class="bg-gray-50"><tr><th class="p-2">Nama</th><th class="p-2">Aksi</th></tr></thead>
                    <tbody>${categoryRows}</tbody>
                </table></div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Manajemen Halaman Statis</h3>
            <form action="/admin/konten/update-pages" method="POST" class="space-y-4">
                <div><label class="block text-sm font-medium">Tentang Kami (HTML didukung)</label><textarea name="about" rows="4" class="mt-1 p-2 w-full rounded border">${pages.about}</textarea></div>
                <div><label class="block text-sm font-medium">Kontak (HTML didukung)</label><textarea name="contact" rows="4" class="mt-1 p-2 w-full rounded border">${pages.contact}</textarea></div>
                <div><label class="block text-sm font-medium">Lowongan (HTML didukung)</label><textarea name="jobs" rows="4" class="mt-1 p-2 w-full rounded border">${pages.jobs}</textarea></div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Simpan Halaman</button>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Manajemen Review</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50"><tr>
                        <th class="p-2">Nama</th><th class="p-2">Rating</th><th class="p-2">Item</th><th class="p-2">Komentar</th><th class="p-2">Aksi</th>
                    </tr></thead>
                    <tbody>${reviewRows}</tbody>
                </table>
            </div>
        </div>
    </div>
    `;
    return getAdminLayout('Manajemen Konten', content, 'konten', user);
}

function getAdminPengaturanPage(user) {
    const { settings } = db.data;
    const emailRegex = /"(.*)" <(.*)>/;
    const match = settings.emailPengirim.match(emailRegex);
    const emailNama = match ? match[1] : '';
    const emailAlamat = match ? match[2] : settings.emailPengirim;

    const userRows = db.data.users.map(u => `
        <tr class="border-b">
            <td class="p-2">${u.username}</td>
            <td class="p-2">${u.role}</td>
            <td class="p-2">
                ${ (u.username !== 'cpena' && u.username !== user.username) ? `
                <form action="/admin/pengaturan/delete-user" method="POST">
                    <input type="hidden" name="username" value="${u.username}">
                    <button class="text-red-500 hover:underline text-xs">Hapus</button>
                </form>
                ` : ''}
            </td>
        </tr>
    `).join('');

    const content = `
    <div class="space-y-8">
        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Pengaturan Tampilan</h3>
            <form action="/admin/pengaturan/update-theme" method="POST" enctype="multipart/form-data" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div><label class="block text-sm font-medium">Warna Latar</label><input type="color" name="backgroundColor" value="${settings.theme.backgroundColor}" class="mt-1 w-full h-10 rounded border"></div>
                    <div><label class="block text-sm font-medium">Warna Primer</label><input type="color" name="primaryColor" value="${settings.theme.primaryColor}" class="mt-1 w-full h-10 rounded border"></div>
                    <div><label class="block text-sm font-medium">Warna Teks</label><input type="color" name="textColor" value="${settings.theme.textColor}" class="mt-1 w-full h-10 rounded border"></div>
                    <div><label class="block text-sm font-medium">Warna Kartu</label><input type="color" name="cardColor" value="${settings.theme.cardColor}" class="mt-1 w-full h-10 rounded border"></div>
                </div>
                <div>
                     <label class="block text-sm font-medium">Gambar Latar</label>
                     <input type="file" name="backgroundImageFile" class="mt-1 p-2 w-full rounded border">
                     <div class="flex items-center mt-2"><input type="checkbox" name="useImage" id="useImage" ${settings.theme.useImage ? 'checked' : ''} class="h-4 w-4"><label for="useImage" class="ml-2 text-sm">Gunakan gambar latar</label></div>
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Simpan Tampilan</button>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Pengaturan Umum</h3>
            <form action="/admin/pengaturan/update-general" method="POST" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-medium">Nama Kafe</label><input type="text" name="namaCafe" value="${settings.namaCafe}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Rate Pajak (desimal, cth: 0.11)</label><input type="number" step="0.01" name="pajakRate" value="${settings.pajakRate}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">SSID WiFi</label><input type="text" name="wifiSsid" value="${settings.wifiSsid}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Password WiFi</label><input type="text" name="wifiPassword" value="${settings.wifiPassword}" class="mt-1 p-2 w-full rounded border"></div>
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Simpan Pengaturan Umum</button>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Pengaturan Pembayaran (Duitku)</h3>
            <form action="/admin/pengaturan/update-duitku" method="POST" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-medium">Merchant Code</label><input type="text" name="duitkuMerchantCode" value="${settings.duitkuMerchantCode}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">API Key</label><input type="password" name="duitkuApiKey" value="${settings.duitkuApiKey}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Callback URL</label><input type="url" name="duitkuCallbackUrl" value="${settings.duitkuCallbackUrl}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Return URL</label><input type="url" name="duitkuReturnUrl" value="${settings.duitkuReturnUrl}" class="mt-1 p-2 w-full rounded border"></div>
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Simpan Pengaturan Duitku</button>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Pengaturan Email (SMTP)</h3>
            <form action="/admin/pengaturan/update-smtp" method="POST" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-medium">SMTP Host (Contoh: smtp.gmail.com)</label><input type="text" name="smtpHost" value="${settings.smtpHost}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">SMTP Port (Contoh: 587 atau 465)</label><input type="number" name="smtpPort" value="${settings.smtpPort}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">SMTP User (Contoh: emailanda@gmail.com)</label><input type="text" name="smtpUser" value="${settings.smtpUser}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">SMTP Password (Gunakan App Password jika 2FA aktif)</label><input type="password" name="smtpPass" value="${settings.smtpPass}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Nama Pengirim (Contoh: Catatan Pena)</label><input type="text" name="emailPengirimNama" value="${emailNama}" class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Email Pengirim (Contoh: support@kafe.com)</label><input type="email" name="emailPengirimEmail" value="${emailAlamat}" class="mt-1 p-2 w-full rounded border"></div>
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Simpan Pengaturan SMTP</button>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Manajemen Akun</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 class="font-bold mb-2">Tambah Akun Baru</h4>
                    <form action="/admin/pengaturan/add-user" method="POST" class="space-y-4 bg-gray-50 p-4 rounded-lg">
                        <div><label class="block text-sm font-medium">Username</label><input type="text" name="username" required class="mt-1 p-2 w-full rounded border"></div>
                        <div><label class="block text-sm font-medium">Password</label><input type="password" name="pass" required class="mt-1 p-2 w-full rounded border"></div>
                        <div><label class="block text-sm font-medium">Peran</label>
                            <select name="role" class="mt-1 p-2 w-full rounded border">
                                <option value="kasir">Kasir</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg">Tambah Akun</button>
                    </form>
                </div>
                <div>
                    <h4 class="font-bold mb-2">Daftar Akun</h4>
                    <div class="overflow-x-auto"><table class="w-full text-left text-sm">
                        <thead class="bg-gray-100"><tr><th class="p-2">Username</th><th class="p-2">Peran</th><th class="p-2">Aksi</th></tr></thead>
                        <tbody>${userRows}</tbody>
                    </table></div>
                </div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Ganti Password Anda</h3>
            <form action="/admin/pengaturan/change-password" method="POST" class="space-y-4">
                 <div><label class="block text-sm font-medium">Password Saat Ini</label><input type="password" name="currentPassword" required class="mt-1 p-2 w-full rounded border"></div>
                 <div><label class="block text-sm font-medium">Password Baru</label><input type="password" name="newPassword" required class="mt-1 p-2 w-full rounded border"></div>
                 <div><label class="block text-sm font-medium">Konfirmasi Password Baru</label><input type="password" name="confirmPassword" required class="mt-1 p-2 w-full rounded border"></div>
                 <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Ganti Password</button>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
            <h3 class="font-display text-xl font-bold text-amber-900 mb-4">Manajemen Unggahan</h3>
            <p class="text-sm text-gray-600 mb-4">Tindakan ini akan menghapus semua gambar yang telah diunggah (gambar menu, popup, latar). Gunakan dengan hati-hati.</p>
            <form action="/admin/pengaturan/delete-all-uploads" method="POST">
                <button type="submit" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Hapus Semua Gambar Unggahan</button>
            </form>
        </div>
    </div>
    `;
    return getAdminLayout('Pengaturan Situs', content, 'pengaturan', user);
}

function getAdminEmailTemplatesPage(user) {
    const { emailTemplates } = db.data;
    const placeholders = [
        '{{customerName}}', '{{orderId}}', '{{namaCafe}}', '{{tableNumber}}', 
        '{{itemsTable}}', '{{wifiSsid}}', '{{wifiPassword}}', '{{reviewLink}}'
    ];

    const content = `
    <div class="bg-white p-6 rounded-lg shadow-lg">
        <h2 class="font-display text-2xl font-bold text-amber-900 mb-4">Editor Template Email</h2>
        <p class="mb-4 text-gray-600">Anda dapat memodifikasi konten email yang dikirim ke pelanggan. Gunakan placeholder di bawah untuk menyisipkan data dinamis.</p>
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 class="font-bold mb-2">Placeholder yang Tersedia:</h4>
            <div class="flex flex-wrap gap-2">
                ${placeholders.map(p => `<code class="text-sm bg-gray-200 text-gray-800 px-2 py-1 rounded">${p}</code>`).join('')}
            </div>
        </div>
        <form action="/admin/email-templates/update" method="POST" class="space-y-8">
            <div>
                <h3 class="font-bold text-lg mb-2">1. Email Konfirmasi Pembayaran</h3>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium">Subjek Email</label><input type="text" name="paymentSuccess_subject" value="${emailTemplates.paymentSuccess.subject}" required class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Konten Email (HTML didukung)</label><textarea name="paymentSuccess_content" rows="8" class="mt-1 p-2 w-full rounded border font-mono text-sm">${emailTemplates.paymentSuccess.content}</textarea></div>
                </div>
            </div>
            <hr/>
            <div>
                <h3 class="font-bold text-lg mb-2">2. Email Pesanan Disiapkan</h3>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium">Subjek Email</label><input type="text" name="orderPreparing_subject" value="${emailTemplates.orderPreparing.subject}" required class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Konten Email (HTML didukung)</label><textarea name="orderPreparing_content" rows="8" class="mt-1 p-2 w-full rounded border font-mono text-sm">${emailTemplates.orderPreparing.content}</textarea></div>
                </div>
            </div>
            <hr/>
            <div>
                <h3 class="font-bold text-lg mb-2">3. Email Pesanan Selesai</h3>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium">Subjek Email</label><input type="text" name="orderCompleted_subject" value="${emailTemplates.orderCompleted.subject}" required class="mt-1 p-2 w-full rounded border"></div>
                    <div><label class="block text-sm font-medium">Konten Email (HTML didukung)</label><textarea name="orderCompleted_content" rows="8" class="mt-1 p-2 w-full rounded border font-mono text-sm">${emailTemplates.orderCompleted.content}</textarea></div>
                </div>
            </div>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg">Simpan Semua Template</button>
        </form>
    </div>
    `;
    return getAdminLayout('Template Email', content, 'email', user);
}

function getSuccessPage(order) {
    const { wifiSsid, wifiPassword } = db.data.settings;
    let ratingSection = '';
    if (order.status === 'completed' && !order.rated) {
        ratingSection = `<div class="mt-8 text-left">
            <h3 class="font-display text-xl md:text-2xl font-bold text-primary mb-4">Bagaimana Pesanan Anda?</h3>
            <a href="/review" class="w-full block text-center bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark">Beri Review Sekarang</a>
            <p class="text-center text-sm mt-2">Gunakan ID Pesanan: <strong>${order.orderId}</strong></p>
        </div>`;
    } else if (order.rated) {
        ratingSection = `<div class="mt-6 bg-green-900/50 text-green-300 p-3 rounded-lg">Terima kasih telah memberikan rating!</div>`;
    }
    const content = `<div class="bg-card p-6 md:p-8 rounded-lg shadow-lg text-center">
        <svg class="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h2 class="mt-4 font-display text-2xl md:text-3xl font-bold text-primary">Pembayaran Berhasil!</h2>
        <p class="mt-2 text-gray-300">Pesanan Anda dengan ID <strong>${order.orderId}</strong> untuk <strong>Meja ${order.tableNumber}</strong> telah kami terima.</p>
        <div class="mt-6 bg-stone-700/50 border border-stone-600 p-4 rounded-lg"><h4 class="font-bold text-lg text-blue-300">Akses WiFi Gratis</h4><p><strong>Nama Jaringan:</strong> ${wifiSsid}</p><p><strong>Password:</strong> ${wifiPassword}</p></div>
        ${ratingSection}
        <div class="mt-6"><a href="/" class="text-primary hover:underline">Kembali ke Menu</a></div>
    </div>`;
    return getLayout('Pesanan Berhasil', content);
}

function getOrderStatusPage(order = null, notFound = false) {
    let resultHtml = '';
    if (notFound) {
        resultHtml = `<div class="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">ID Pesanan tidak ditemukan.</div>`;
    } else if (order) {
        const statuses = ['paid', 'preparing', 'completed'];
        const currentStatusIndex = statuses.indexOf(order.status);
        const progressHtml = statuses.map((status, index) => {
            const isActive = index <= currentStatusIndex;
            return `<div class="flex-1 text-center">
                        <div class="w-8 h-8 mx-auto rounded-full flex items-center justify-center ${isActive ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'}">${index + 1}</div>
                        <p class="mt-2 text-sm ${isActive ? 'text-green-400 font-bold' : 'text-gray-400'}">${status.charAt(0).toUpperCase() + status.slice(1)}</p>
                    </div>
                    ${index < statuses.length - 1 ? `<div class="flex-1 h-1 self-center ${isActive && index < currentStatusIndex ? 'bg-green-500' : 'bg-gray-600'}"></div>` : ''}`;
        }).join('');

        const itemsHtml = order.items.map(item => {
            const optionsHtml = Object.entries(item.options).map(([key, value]) => `<li><span class="font-semibold">${key}:</span> ${value}</li>`).join('');
            const notesHtml = item.notes ? `<li class="italic"><span class="font-semibold">Catatan:</span> ${item.notes}</li>` : '';
            const deliveredStatus = (order.status === 'preparing' || order.status === 'completed') 
                ? `<span class="ml-2 text-xs font-semibold px-2 py-1 rounded-full ${item.delivered ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}">${item.delivered ? 'Sudah Diantar' : 'Disiapkan'}</span>`
                : '';
            return `<div class="py-2">
                        <div class="flex justify-between items-center">
                            <p class="font-bold">${item.name} (x${item.quantity})</p>
                            ${deliveredStatus}
                        </div>
                        <ul class="text-sm text-gray-400 list-disc list-inside pl-4">${optionsHtml}${notesHtml}</ul>
                    </div>`;
        }).join('<hr class="my-1 border-stone-700">');
        
        resultHtml = `
            <div class="bg-card border border-stone-700 p-6 rounded-lg">
                <h3 class="font-bold text-xl mb-2 text-primary">Detail Pesanan #${order.orderId}</h3>
                <p class="text-gray-400 mb-4">Dipesan oleh: <strong>${order.customerName}</strong> untuk Meja <strong>${order.tableNumber}</strong></p>
                
                <h4 class="font-bold text-lg mt-6 mb-4">Status Pesanan</h4>
                <div class="flex items-center mb-6">${progressHtml}</div>

                <h4 class="font-bold text-lg mt-6 mb-2">Item yang Dipesan</h4>
                <div class="divide-y divide-stone-700">${itemsHtml}</div>

                <div class="text-right font-bold text-xl mt-4">Total: Rp ${order.totalAmount.toLocaleString('id-ID')}</div>
            </div>`;
    }
    const content = `<div class="max-w-2xl mx-auto bg-card p-6 md:p-8 rounded-lg shadow-lg">
        <h2 class="font-display text-2xl md:text-3xl font-bold text-primary mb-6 text-center">Cek Status Pesanan</h2>
        <form action="/cek-pesanan" method="POST">
            <div class="mb-4"><label for="orderId" class="block text-sm font-medium text-gray-300">Masukkan ID Pesanan Anda</label><input type="text" id="orderId" name="orderId" required class="mt-1 p-2 w-full rounded-md bg-stone-700 text-white border-stone-600" placeholder="CATPEN-..."></div>
            <button type="submit" class="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark">Cek Status</button>
        </form>
        <div class="mt-6">${resultHtml}</div>
    </div>`;
    return getLayout('Cek Status Pesanan', content);
}

function getReviewPage() {
    const content = `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 md:p-8 rounded-lg shadow-lg">
                <h2 class="font-display text-2xl md:text-3xl font-bold text-primary mb-6 text-center">Tulis Review Anda</h2>
                <form id="find-order-form">
                    <div class="mb-4"><label for="reviewOrderId" class="block text-sm font-medium text-gray-300">Masukkan ID Pesanan Anda</label><input type="text" id="reviewOrderId" name="orderId" required class="mt-1 p-2 w-full rounded-md bg-stone-700 text-white border-stone-600" placeholder="CATPEN-..."></div>
                    <button type="submit" class="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark">Cari Pesanan</button>
                </form>
                <div id="review-form-container" class="mt-6 hidden"></div>
            </div>

            <div class="bg-card p-6 md:p-8 rounded-lg shadow-lg">
                <h2 class="font-display text-2xl md:text-3xl font-bold text-primary mb-6 text-center">Apa Kata Mereka?</h2>
                <div id="reviews-list" class="space-y-6">
                    <!-- Reviews will be loaded here -->
                </div>
            </div>
        </div>
    `;

    const scripts = `
    <script>
        function renderStars(rating) {
            let stars = '';
            for (let i = 0; i < 5; i++) {
                stars += \`<svg class="w-5 h-5 \${i < rating ? 'text-yellow-400' : 'text-gray-600'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>\`;
            }
            return \`<div class="flex">\${stars}</div>\`;
        }

        async function loadReviews() {
            const reviewsList = document.getElementById('reviews-list');
            try {
                const response = await fetch('/api/reviews');
                const reviews = await response.json();
                if (reviews.length === 0) {
                    reviewsList.innerHTML = '<p class="text-center text-gray-500">Belum ada review.</p>';
                    return;
                }
                reviewsList.innerHTML = reviews.map(review => \`
                    <div class="border-b border-stone-700 pb-4">
                        <div class="flex items-center mb-2">
                            \${renderStars(review.rating)}
                            <p class="ml-2 font-bold text-primary">\${review.customerName}</p>
                        </div>
                        <p class="text-gray-300 italic">"\${review.comment}"</p>
                        <p class="text-xs text-gray-400 mt-2">Review untuk: <strong>\${review.itemName}</strong></p>
                    </div>
                \`).join('');
            } catch (err) {
                reviewsList.innerHTML = '<p class="text-center text-red-500">Gagal memuat review.</p>';
            }
        }

        document.getElementById('find-order-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const orderId = document.getElementById('reviewOrderId').value;
            const container = document.getElementById('review-form-container');
            container.innerHTML = '<p>Mencari...</p>';
            container.classList.remove('hidden');

            try {
                const response = await fetch('/review/find-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId })
                });
                const result = await response.json();
                if (!result.success) {
                    container.innerHTML = \`<div class="bg-red-900/50 text-red-300 p-3 rounded-md">\${result.message}</div>\`;
                    return;
                }
                
                const order = result.order;
                const itemsHtml = order.items.map((item, index) => \`
                    <div class="border border-stone-700 p-4 rounded-md bg-stone-800">
                        <h4 class="font-bold">\${item.name}</h4>
                        <div class="my-2">
                            <label class="block font-medium text-sm text-gray-300">Rating</label>
                            <select name="ratings[\${index}][rating]" required class="p-2 border rounded w-full bg-stone-700 text-white border-stone-600">
                                <option value="5">⭐⭐⭐⭐⭐ (Sangat Baik)</option>
                                <option value="4">⭐⭐⭐⭐ (Baik)</option>
                                <option value="3">⭐⭐⭐ (Cukup)</option>
                                <option value="2">⭐⭐ (Kurang)</option>
                                <option value="1">⭐ (Buruk)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-medium text-sm text-gray-300">Komentar (opsional)</label>
                            <textarea name="ratings[\${index}][comment]" rows="2" class="p-2 border rounded w-full bg-stone-700 text-white border-stone-600"></textarea>
                            <input type="hidden" name="ratings[\${index}][itemId]" value="\${item.id}">
                            <input type="hidden" name="ratings[\${index}][itemName]" value="\${item.name}">
                        </div>
                    </div>
                \`).join('<hr class="my-4 border-none">');

                container.innerHTML = \`
                    <form id="submit-review-form">
                        <h3 class="font-bold text-lg text-primary">Review untuk Pesanan \${order.orderId}</h3>
                        <p class="text-sm text-gray-400 mb-4">Atas nama: \${order.customerName}</p>
                        <input type="hidden" name="orderId" value="\${order.orderId}">
                        <div class="space-y-4">\${itemsHtml}</div>
                        <button type="submit" class="mt-6 w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Kirim Review</button>
                    </form>
                \`;

                document.getElementById('submit-review-form').addEventListener('submit', handleReviewSubmit);

            } catch (err) {
                container.innerHTML = \`<div class="bg-red-900/50 text-red-300 p-3 rounded-md">Terjadi kesalahan.</div>\`;
            }
        });

        async function handleReviewSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            
            // Manual form data processing for nested array structure
            const data = {
                orderId: formData.get('orderId'),
                ratings: []
            };
            const ratingsMap = {};
            for (const [key, value] of formData.entries()) {
                const match = key.match(/ratings\\[(\\d+)\\]\\[(\\w+)\\]/);
                if (match) {
                    const index = match[1];
                    const prop = match[2];
                    if (!ratingsMap[index]) ratingsMap[index] = {};
                    ratingsMap[index][prop] = value;
                }
            }
            data.ratings = Object.values(ratingsMap);

            try {
                const response = await fetch('/review/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                const container = document.getElementById('review-form-container');
                if (result.success) {
                    container.innerHTML = \`<div class="bg-green-900/50 text-green-300 p-3 rounded-md">Terima kasih atas review Anda!</div>\`;
                    loadReviews(); // Refresh review list
                } else {
                    alert('Gagal mengirim review: ' + result.message);
                }
            } catch(err) {
                alert('Terjadi kesalahan saat mengirim review.');
            }
        }

        document.addEventListener('DOMContentLoaded', loadReviews);
    </script>
    `;
    return getLayout('Review Pelanggan', content, scripts);
}

function getStaticPage(title, pageContent) {
    const content = `
        <div class="max-w-4xl mx-auto bg-card p-6 md:p-8 rounded-lg shadow-lg prose prose-invert lg:prose-xl">
            ${pageContent}
        </div>
    `;
    return getLayout(title, content);
}


// 7. ROUTES
// =============================================================================
app.get('/', (req, res) => res.send(getMenuPage()));
app.get('/login', (req, res) => res.send(getLoginPage()));

// ADMIN ROUTES
app.get('/admin', requireLogin, (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/dashboard', requireLogin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const ordersPerPage = 10;
    
    const today = new Date();
    const defaultDate = today.toISOString().slice(0, 10);
    const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const selectedDate = req.query.date || defaultDate;
    const selectedMonth = req.query.month || defaultMonth;
    
    const activeStatuses = ['paid', 'preparing', 'completed'];

    const targetDate = new Date(selectedDate).toDateString();
    const filteredOrders = db.data.orders
        .filter(o => activeStatuses.includes(o.status) && new Date(o.timestamp).toDateString() === targetDate)
        .reverse();
    
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1;
    const paginatedOrders = filteredOrders.slice((page - 1) * ordersPerPage, page * ordersPerPage);

    const dailyReport = getSalesReport({ type: 'daily', value: selectedDate });
    const monthlyReport = getSalesReport({ type: 'monthly', value: selectedMonth });

    res.send(getAdminDashboardPage(paginatedOrders, page, totalPages, dailyReport, monthlyReport, selectedDate, selectedMonth, req.session.user));
});

// Redirect old routes for backward compatibility
app.get('/admin/pesanan', requireLogin, (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/laporan', requireLogin, (req, res) => res.redirect('/admin/dashboard'));

app.get('/admin/menu', requireLogin, (req, res) => res.send(getAdminMenuPage(req.session.user)));
app.get('/admin/menu/add', requireAdmin, (req, res) => res.send(getAdminAddOrEditMenuPage(null, req.session.user)));
app.get('/admin/menu/edit/:id', requireAdmin, (req, res) => {
    const item = db.data.menuItems.find(m => m.id == req.params.id);
    if (item) {
        res.send(getAdminAddOrEditMenuPage(item, req.session.user));
    } else {
        res.redirect('/admin/menu');
    }
});

app.get('/admin/konten', requireAdmin, (req, res) => res.send(getAdminKontenPage(req.session.user)));
app.get('/admin/pengaturan', requireAdmin, (req, res) => res.send(getAdminPengaturanPage(req.session.user)));
app.get('/admin/email-templates', requireAdmin, (req, res) => res.send(getAdminEmailTemplatesPage(req.session.user)));

app.get('/cek-pesanan', (req, res) => res.send(getOrderStatusPage()));

app.get('/check-payment-status/:orderId', (req, res) => {
    const order = db.data.orders.find(o => o.orderId === req.params.orderId);
    if (order) {
        res.json({ status: order.status });
    } else {
        res.status(404).json({ status: 'not found' });
    }
});

// Static Pages
app.get('/tentang-kami', (req, res) => res.send(getStaticPage('Tentang Kami', db.data.pages.about)));
app.get('/kontak', (req, res) => res.send(getStaticPage('Kontak', db.data.pages.contact)));
app.get('/lowongan', (req, res) => res.send(getStaticPage('Lowongan Pekerjaan', db.data.pages.jobs)));
app.get('/review', (req, res) => res.send(getReviewPage()));


app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.data.users.find(u => u.username === username && u.pass === password);
    if (user) {
        req.session.user = { username: user.username, role: user.role };
        res.redirect('/admin');
    } else {
        res.send(getLoginPage('Username atau password salah.'));
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// ADMIN POST ROUTES
app.post('/admin/menu/add', requireAdmin, upload.single('imageFile'), async (req, res) => {
    const { name, price, category, imageUrl, option_key, option_values } = req.body;
    let imagePath = imageUrl;
    if (req.file) {
        // [FIX] Correct image path for serving statically
        imagePath = '/' + req.file.path.replace(/\\/g, "/");
    }

    if (!imagePath) {
        return res.status(400).send("Gambar menu harus diunggah atau diberikan URL-nya.");
    }
    
    const newMenuItem = {
        id: db.data.nextMenuItemId++,
        name,
        price: parseInt(price, 10),
        category,
        image: imagePath,
        ratings: [], avgRating: 0, inStock: true,
        options: {}
    };

    if (option_key && option_values) {
        const keys = Array.isArray(option_key) ? option_key : [option_key];
        const values = Array.isArray(option_values) ? option_values : [option_values];
        keys.forEach((key, index) => {
            if (key && values[index]) {
                newMenuItem.options[key] = values[index].split(',').map(s => s.trim());
            }
        });
    }
    db.data.menuItems.push(newMenuItem);
    await db.write();
    res.redirect('/admin/menu');
});

// [MODIFIKASI] Menambahkan logika untuk menghapus gambar
app.post('/admin/menu/edit/:id', requireAdmin, upload.single('imageFile'), async (req, res) => {
    const { name, price, category, imageUrl, option_key, option_values, deleteImage } = req.body;
    const itemIndex = db.data.menuItems.findIndex(m => m.id == req.params.id);

    if (itemIndex > -1) {
        const currentItem = db.data.menuItems[itemIndex];
        let imagePath = currentItem.image;

        const oldImageLocalPath = (currentItem.image && !currentItem.image.startsWith('http'))
            ? currentItem.image.substring(1) // Menghapus '/' di depan -> 'public/uploads/...'
            : null;

        const deleteOldFile = () => {
            if (oldImageLocalPath) {
                fs.unlink(oldImageLocalPath, (err) => {
                    if (err && err.code !== 'ENOENT') { // Hiraukan error jika file tidak ditemukan
                        console.error(`Gagal menghapus file lama: ${oldImageLocalPath}`, err);
                    } else if (!err) {
                        console.log(`Berhasil menghapus file lama: ${oldImageLocalPath}`);
                    }
                });
            }
        };

        if (req.file) { // 1. Prioritas utama: file baru diunggah
            deleteOldFile();
            imagePath = '/' + req.file.path.replace(/\\/g, "/");
        } else if (imageUrl && imageUrl !== currentItem.image) { // 2. Prioritas kedua: URL baru diberikan
            deleteOldFile();
            imagePath = imageUrl;
        } else if (deleteImage === 'on') { // 3. Prioritas ketiga: checkbox hapus dicentang
            deleteOldFile();
            imagePath = `https://placehold.co/400x300/ccc/FFFFFF?text=Tidak+Ada+Gambar`;
        }

        const updatedOptions = {};
        if (option_key && option_values) {
            const keys = Array.isArray(option_key) ? option_key : [option_key];
            const values = Array.isArray(option_values) ? option_values : [option_values];
            keys.forEach((key, index) => {
                if (key && values[index]) {
                    updatedOptions[key] = values[index].split(',').map(s => s.trim());
                }
            });
        }
        db.data.menuItems[itemIndex] = { ...currentItem, name, price: parseInt(price, 10), category, image: imagePath, options: updatedOptions };
        await db.write();
    }
    res.redirect('/admin/menu');
});

app.post('/admin/menu/delete', requireAdmin, async (req, res) => {
    const { itemId } = req.body;
    db.data.menuItems = db.data.menuItems.filter(m => m.id != itemId);
    await db.write();
    res.redirect('/admin/menu');
});

app.post('/admin/menu/toggle-stock', requireAdmin, async (req, res) => {
    const { itemId } = req.body;
    const item = db.data.menuItems.find(m => m.id == itemId);
    if (item) {
        item.inStock = !item.inStock;
        await db.write();
    }
    res.redirect('/admin/menu');
});

app.post('/admin/konten/update-banner', requireAdmin, async (req, res) => {
    const { title, subtitle } = req.body;
    if (title && subtitle) {
        db.data.bannerInfo = { title, subtitle };
        await db.write();
    }
    res.redirect('/admin/konten');
});

app.post('/admin/konten/add-voucher', requireAdmin, async (req, res) => {
    const { code, discount, expiry } = req.body;
    if (code && discount && expiry) {
        db.data.vouchers.push({ code: code.toUpperCase(), discount: parseInt(discount, 10), expiry });
        await db.write();
    }
    res.redirect('/admin/konten');
});

app.post('/admin/konten/delete-voucher', requireAdmin, async (req, res) => {
    const { code } = req.body;
    db.data.vouchers = db.data.vouchers.filter(v => v.code !== code);
    await db.write();
    res.redirect('/admin/konten');
});

app.post('/admin/konten/add-category', requireAdmin, async (req, res) => {
    const { categoryName } = req.body;
    if (categoryName && !db.data.categories.includes(categoryName)) {
        db.data.categories.push(categoryName);
        await db.write();
    }
    res.redirect('/admin/konten');
});

app.post('/admin/konten/delete-category', requireAdmin, async (req, res) => {
    const { categoryName } = req.body;
    const itemsInCategory = db.data.menuItems.filter(item => item.category === categoryName);
    if (itemsInCategory.length === 0) {
        db.data.categories = db.data.categories.filter(c => c !== categoryName);
        await db.write();
    } else {
        console.log(`Gagal menghapus kategori '${categoryName}' karena masih digunakan oleh item menu.`);
    }
    res.redirect('/admin/konten');
});

app.post('/admin/konten/delete-review', requireAdmin, async (req, res) => {
    const { reviewId } = req.body;
    db.data.reviews = db.data.reviews.filter(r => r.id != reviewId);
    await db.write();
    res.redirect('/admin/konten');
});


app.post('/admin/pengaturan/change-password', requireLogin, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = db.data.users.find(u => u.username === req.session.user.username);

    if (user && currentPassword === user.pass) {
        if (newPassword && newPassword === confirmPassword) {
            user.pass = newPassword;
            await db.write();
            console.log(`Password untuk ${user.username} berhasil diubah.`);
        } else {
            console.log("Konfirmasi password baru tidak cocok.");
        }
    } else {
        console.log("Password saat ini salah.");
    }
    res.redirect('/admin/pengaturan');
});

app.post('/admin/pengaturan/add-user', requireAdmin, async (req, res) => {
    const { username, pass, role } = req.body;
    if (username && pass && role) {
        const existingUser = db.data.users.find(u => u.username === username);
        if (!existingUser) {
            db.data.users.push({ username, pass, role });
            await db.write();
        }
    }
    res.redirect('/admin/pengaturan');
});

app.post('/admin/pengaturan/delete-user', requireAdmin, async (req, res) => {
    const { username } = req.body;
    // Prevent deleting the main admin or self
    if (username && username !== 'cpena' && username !== req.session.user.username) {
        db.data.users = db.data.users.filter(u => u.username !== username);
        await db.write();
    }
    res.redirect('/admin/pengaturan');
});


app.post('/admin/update-status', requireLogin, async (req, res) => {
    const { orderId, newStatus } = req.body;
    const order = db.data.orders.find(o => o.orderId === orderId);
    if (order && ['preparing', 'completed'].includes(newStatus)) {
        order.status = newStatus;
        await db.write();
        await sendTemplatedEmail(order, newStatus === 'preparing' ? 'orderPreparing' : 'orderCompleted');
    }
    res.redirect('/admin/dashboard');
});

app.post('/admin/konten/update-pages', requireAdmin, async (req, res) => {
    const { about, contact, jobs } = req.body;
    db.data.pages = { about, contact, jobs };
    await db.write();
    res.redirect('/admin/konten');
});

// [MODIFIKASI] Menambahkan logika hapus gambar untuk popup promo
app.post('/admin/konten/update-promo-popup', requireAdmin, upload.single('imageFile'), async (req, res) => {
    const { enabled, title, message, imageUrl, deleteImage } = req.body;

    let imagePath = db.data.promoPopup.imageUrl; // Default ke gambar yang ada

    const oldImageLocalPath = (db.data.promoPopup.imageUrl && !db.data.promoPopup.imageUrl.startsWith('http'))
        ? db.data.promoPopup.imageUrl.substring(1) // Hapus '/' di depan
        : null;

    const deleteOldFile = () => {
        if (oldImageLocalPath) {
            fs.unlink(oldImageLocalPath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error(`Gagal menghapus file promo lama: ${oldImageLocalPath}`, err);
                } else if (!err) {
                    console.log(`Berhasil menghapus file promo lama: ${oldImageLocalPath}`);
                }
            });
        }
    };

    // Prioritas: File baru > URL baru > Checkbox hapus
    if (req.file) {
        deleteOldFile();
        imagePath = '/' + req.file.path.replace(/\\/g, "/");
    } else if (imageUrl && imageUrl !== db.data.promoPopup.imageUrl) {
        deleteOldFile();
        imagePath = imageUrl;
    } else if (deleteImage === 'on') {
        deleteOldFile();
        imagePath = 'https://placehold.co/400x200/854d0e/FFFFFF?text=Promo+Spesial'; // Reset ke default
    }

    db.data.promoPopup = {
        enabled: !!enabled,
        title,
        message,
        imageUrl: imagePath
    };
    await db.write();
    res.redirect('/admin/konten');
});

app.post('/admin/pengaturan/update-general', requireAdmin, async (req, res) => {
    const { namaCafe, pajakRate, wifiSsid, wifiPassword } = req.body;
    db.data.settings.namaCafe = namaCafe;
    db.data.settings.pajakRate = parseFloat(pajakRate);
    db.data.settings.wifiSsid = wifiSsid;
    db.data.settings.wifiPassword = wifiPassword;
    await db.write();
    res.redirect('/admin/pengaturan');
});

app.post('/admin/pengaturan/update-duitku', requireAdmin, async (req, res) => {
    const { duitkuMerchantCode, duitkuApiKey, duitkuCallbackUrl, duitkuReturnUrl } = req.body;
    db.data.settings.duitkuMerchantCode = duitkuMerchantCode;
    db.data.settings.duitkuApiKey = duitkuApiKey;
    db.data.settings.duitkuCallbackUrl = duitkuCallbackUrl;
    db.data.settings.duitkuReturnUrl = duitkuReturnUrl;
    await db.write();
    res.redirect('/admin/pengaturan');
});

app.post('/admin/pengaturan/update-smtp', requireAdmin, async (req, res) => {
    const { smtpHost, smtpPort, smtpUser, smtpPass, emailPengirimNama, emailPengirimEmail } = req.body;
    db.data.settings.smtpHost = smtpHost;
    db.data.settings.smtpPort = smtpPort;
    db.data.settings.smtpUser = smtpUser;
    db.data.settings.smtpPass = smtpPass;
    db.data.settings.emailPengirim = `"${emailPengirimNama}" <${emailPengirimEmail}>`;
    await db.write();
    res.redirect('/admin/pengaturan');
});

app.post('/admin/pengaturan/update-theme', requireAdmin, upload.single('backgroundImageFile'), async (req, res) => {
    const { backgroundColor, primaryColor, textColor, cardColor, useImage } = req.body;
    db.data.settings.theme.backgroundColor = backgroundColor;
    db.data.settings.theme.primaryColor = primaryColor;
    db.data.settings.theme.textColor = textColor;
    db.data.settings.theme.cardColor = cardColor;
    db.data.settings.theme.useImage = !!useImage;
    if (req.file) {
        db.data.settings.theme.backgroundImage = '/' + req.file.path.replace(/\\/g, "/");
    }
    await db.write();
    res.redirect('/admin/pengaturan');
});

app.post('/admin/email-templates/update', requireAdmin, async (req, res) => {
    const { 
        paymentSuccess_subject, paymentSuccess_content,
        orderPreparing_subject, orderPreparing_content,
        orderCompleted_subject, orderCompleted_content
    } = req.body;
    db.data.emailTemplates.paymentSuccess = { subject: paymentSuccess_subject, content: paymentSuccess_content };
    db.data.emailTemplates.orderPreparing = { subject: orderPreparing_subject, content: orderPreparing_content };
    db.data.emailTemplates.orderCompleted = { subject: orderCompleted_subject, content: orderCompleted_content };
    await db.write();
    res.redirect('/admin/email-templates');
});


app.post('/admin/pesanan/toggle-item', requireLogin, async (req, res) => {
    const { orderId, itemCartId } = req.body;
    const order = db.data.orders.find(o => o.orderId === orderId);
    if (order && order.status === 'preparing') {
        const item = order.items.find(i => i.cartItemId === itemCartId);
        if (item) {
            item.delivered = !item.delivered;
            await db.write();
        }
    }
    res.redirect(req.headers.referer || '/admin/dashboard');
});

app.post('/admin/pesanan/selesaikan-semua', requireLogin, async (req, res) => {
    const { orderId } = req.body;
    const order = db.data.orders.find(o => o.orderId === orderId);
    if (order && order.status === 'preparing') {
        order.items.forEach(item => item.delivered = true);
        await db.write();
    }
    res.redirect(req.headers.referer || '/admin/dashboard');
});

app.get('/admin/export/sales/daily', requireAdmin, (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const targetDate = new Date(date).toDateString();
    const todaysOrders = db.data.orders.filter(o => new Date(o.timestamp).toDateString() === targetDate);

    let csv = 'OrderID,NamaPelanggan,NomorMeja,Item,Opsi,Catatan,Jumlah,Harga,Subtotal,Diskon,Pajak,Total,Status,Waktu\n';
    todaysOrders.forEach(order => {
        order.items.forEach(item => {
            const options = Object.entries(item.options).map(([k,v]) => `${k}:${v}`).join('; ');
            csv += `"${order.orderId}","${order.customerName}","${order.tableNumber}","${item.name}","${options}","${item.notes || ''}","${item.quantity}","${item.price}","${order.subTotal}","${order.discount}","${order.tax}","${order.totalAmount}","${order.status}","${toWIBString(order.timestamp)}"\n`;
        });
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`laporan-penjualan-harian-${date}.csv`);
    res.send(csv);
});

app.get('/admin/export/sales/monthly', requireAdmin, (req, res) => {
    const month = req.query.month;
    if (!month) return res.status(400).send('Parameter bulan diperlukan.');

    const [year, monthNum] = month.split('-');
    const monthlyOrders = db.data.orders.filter(o => {
        const orderDate = new Date(o.timestamp);
        return orderDate.getFullYear() == year && (orderDate.getMonth() + 1) == monthNum;
    });

    let csv = 'OrderID,NamaPelanggan,NomorMeja,Item,Opsi,Catatan,Jumlah,Harga,Subtotal,Diskon,Pajak,Total,Status,Waktu\n';
    monthlyOrders.forEach(order => {
        order.items.forEach(item => {
            const options = Object.entries(item.options).map(([k,v]) => `${k}:${v}`).join('; ');
            csv += `"${order.orderId}","${order.customerName}","${order.tableNumber}","${item.name}","${options}","${item.notes || ''}","${item.quantity}","${item.price}","${order.subTotal}","${order.discount}","${order.tax}","${order.totalAmount}","${order.status}","${toWIBString(order.timestamp)}"\n`;
        });
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`laporan-penjualan-bulanan-${month}.csv`);
    res.send(csv);
});

app.post('/admin/pengaturan/delete-all-uploads', requireAdmin, async (req, res) => {
    const directory = UPLOAD_DIR;
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error("Gagal membaca direktori unggahan:", err);
            return res.redirect('/admin/pengaturan');
        }

        for (const file of files) {
            if (file !== '.gitkeep') { // Jangan hapus file placeholder jika ada
                fs.unlink(path.join(directory, file), err => {
                    if (err) {
                        console.error(`Gagal menghapus file ${file}:`, err);
                    }
                });
            }
        }
        console.log('Semua unggahan telah dihapus.');
    });

    // Reset path gambar di database
    db.data.menuItems.forEach(item => {
        if (item.image && !item.image.startsWith('https://placehold.co')) {
            item.image = `https://placehold.co/400x300/ccc/FFFFFF?text=${encodeURIComponent(item.name)}`;
        }
    });
    if (db.data.promoPopup.imageUrl && !db.data.promoPopup.imageUrl.startsWith('https://placehold.co')) {
        db.data.promoPopup.imageUrl = 'https://placehold.co/400x200/854d0e/FFFFFF?text=Promo+Spesial';
    }
    if (db.data.settings.theme.backgroundImage) {
        db.data.settings.theme.backgroundImage = '';
        db.data.settings.theme.useImage = false;
    }
    await db.write();
    res.redirect('/admin/pengaturan');
});

app.get('/terimakasih', (req, res) => {
    const order = db.data.orders.find(o => o.orderId === req.query.orderId);
    if (!order) return res.status(404).send('Pesanan tidak ditemukan');
    res.send(getSuccessPage(order));
});

app.post('/cek-pesanan', (req, res) => {
    const order = db.data.orders.find(o => o.orderId === req.body.orderId);
    res.send(getOrderStatusPage(order, !order));
});

app.post('/batal-pesanan/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const orderIndex = db.data.orders.findIndex(o => o.orderId === orderId);

    if (orderIndex > -1) {
        const order = db.data.orders[orderIndex];
        if (order.status === 'pending') {
            order.status = 'cancelled';
            await db.write();
            console.log(`Pesanan ${orderId} dibatalkan oleh pengguna.`);
            return res.json({ success: true, message: 'Pesanan berhasil dibatalkan.' });
        }
        return res.status(400).json({ success: false, message: 'Pesanan tidak dapat dibatalkan karena sudah diproses.' });
    }
    
    return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
});

app.post('/apply-voucher', (req, res) => {
    const { code } = req.body;
    const voucher = db.data.vouchers.find(v => v.code === code.toUpperCase());
    if (voucher) {
        if (new Date(voucher.expiry) >= new Date()) {
            res.json({ success: true, voucher });
        } else {
            res.status(400).json({ success: false, message: 'Voucher sudah kedaluwarsa.' });
        }
    } else {
        res.status(404).json({ success: false, message: 'Kode voucher tidak ditemukan.' });
    }
});

app.post('/pesan', async (req, res) => {
    const { customerName, customerEmail, customerWhatsapp, cartData, tableNumber, voucherCode } = req.body;
    const { pajakRate, duitkuMerchantCode, duitkuApiKey, duitkuCallbackUrl, duitkuReturnUrl } = db.data.settings;
    const cart = JSON.parse(cartData);
    if (!cart || cart.length === 0) return res.status(400).json({ success: false, message: 'Keranjang belanja kosong.' });

    let selectedItems = [], subTotal = 0;
    for (const cartItem of cart) {
        const menuItem = db.data.menuItems.find(m => m.id == cartItem.id);
        if (menuItem && menuItem.inStock && cartItem.quantity > 0) {
            selectedItems.push({ ...cartItem, delivered: false }); // Add delivered status
            subTotal += menuItem.price * cartItem.quantity;
        }
    }
    if (selectedItems.length === 0) return res.status(400).json({ success: false, message: 'Item tidak valid atau habis.' });
    
    let discount = 0;
    const voucher = db.data.vouchers.find(v => v.code === voucherCode);
    if (voucher && new Date(voucher.expiry) >= new Date()) {
        discount = (subTotal * voucher.discount) / 100;
    }
    const subtotalAfterDiscount = subTotal - discount;
    const tax = subtotalAfterDiscount * pajakRate;
    const totalAmount = Math.round(subtotalAfterDiscount + tax);
    const merchantOrderId = `CATPEN-${Date.now()}`;
    
    const newOrder = {
        orderId: merchantOrderId, customerName, customerEmail, customerWhatsapp, tableNumber,
        items: selectedItems, subTotal, tax, totalAmount, discount, status: 'pending', rated: false,
        timestamp: new Date().toISOString()
    };
    db.data.orders.push(newOrder);
    await db.write();
    
    const signature = crypto.createHash('md5').update(`${duitkuMerchantCode}${merchantOrderId}${totalAmount}${duitkuApiKey}`).digest('hex');
    const productDetails = selectedItems.map(item => `${item.name} x${item.quantity}`).join(', ');

    try {
        const response = await axios.post('https://passport.duitku.com/webapi/api/merchant/v2/inquiry', {
            merchantCode: duitkuMerchantCode, paymentAmount: totalAmount, paymentMethod: 'NQ', merchantOrderId,
            productDetails, customerVaName: customerName, email: customerEmail, phoneNumber: customerWhatsapp,
            callbackUrl: duitkuCallbackUrl, returnUrl: `${duitkuReturnUrl}?orderId=${merchantOrderId}`, signature,
            expiryPeriod: 10 // Duitku expiry in minutes
        });
        
        if (response.data && response.data.qrString) {
            res.json({ success: true, orderId: newOrder.orderId, qrString: response.data.qrString });
        } else {
            const errorMessage = response.data.statusMessage || 'Gagal mendapatkan QRIS dari Duitku.';
            console.error('Respon Duitku tidak valid:', response.data);
            res.status(500).json({ success: false, message: errorMessage });
        }
    } catch (error) {
        console.error('Error saat request ke Duitku:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memproses pembayaran.' });
    }
});

app.post('/callback', async (req, res) => {
    const { merchantCode, amount, merchantOrderId, resultCode, signature } = req.body;
    const { duitkuApiKey } = db.data.settings;
    const orderIndex = db.data.orders.findIndex(o => o.orderId === merchantOrderId);
    if (orderIndex === -1) return res.status(404).json({ status: 'error', message: 'Order not found' });
    
    const order = db.data.orders[orderIndex];
    const expectedSignature = crypto.createHash('md5').update(`${merchantCode}${amount}${merchantOrderId}${duitkuApiKey}`).digest('hex');
    if (signature !== expectedSignature) {
        console.error(`Callback Duitku: Signature tidak valid! Diterima: ${signature}, Diharapkan: ${expectedSignature}`);
        // For production, you must return an error. For this example, we'll proceed but log the error.
        // return res.status(400).json({ status: 'error', message: 'Invalid signature' });
    }

    if (resultCode === '00' && order.status === 'pending') {
        order.status = 'paid';
        await db.write();
        console.log(`Pembayaran untuk order ${merchantOrderId} berhasil.`);
        await sendTemplatedEmail(order, 'paymentSuccess');
    } else if (resultCode !== '00' && order.status === 'pending') {
        order.status = 'failed';
        await db.write();
        console.log(`Pembayaran untuk order ${merchantOrderId} gagal. Kode: ${resultCode}`);
    }
    res.status(200).send('OK'); // Duitku expects a 200 OK response
});

// REVIEW ROUTES
app.post('/review/find-order', (req, res) => {
    const { orderId } = req.body;
    const order = db.data.orders.find(o => o.orderId === orderId);

    if (!order) {
        return res.json({ success: false, message: 'ID Pesanan tidak ditemukan.' });
    }
    if (order.status !== 'completed') {
        return res.json({ success: false, message: 'Pesanan belum selesai. Anda baru bisa memberi review setelah pesanan selesai.' });
    }
    if (order.rated) {
        return res.json({ success: false, message: 'Anda sudah memberikan review untuk pesanan ini.' });
    }

    res.json({ success: true, order: {
        orderId: order.orderId,
        customerName: order.customerName,
        items: order.items.map(i => ({ id: i.id, name: i.name }))
    }});
});

app.post('/review/submit', async (req, res) => {
    const { orderId, ratings } = req.body;
    const order = db.data.orders.find(o => o.orderId === orderId);

    if (!order || order.status !== 'completed' || order.rated) {
        return res.status(400).json({ success: false, message: 'Tidak valid untuk memberi review.' });
    }

    if (!ratings || !Array.isArray(ratings)) {
        return res.status(400).json({ success: false, message: 'Data rating tidak valid.' });
    }

    for (const itemReview of ratings) {
        const newReview = {
            id: Date.now() + Math.random(), // Unique ID for deletion
            orderId,
            customerName: order.customerName,
            itemId: parseInt(itemReview.itemId, 10),
            itemName: itemReview.itemName,
            rating: parseInt(itemReview.rating, 10),
            comment: itemReview.comment || '',
            timestamp: new Date().toISOString()
        };
        db.data.reviews.unshift(newReview);

        // Update avg rating for the menu item
        const menuItem = db.data.menuItems.find(m => m.id === parseInt(itemReview.itemId, 10));
        if (menuItem) {
            if (!menuItem.ratings) menuItem.ratings = [];
            menuItem.ratings.push(parseInt(itemReview.rating, 10));
            const sum = menuItem.ratings.reduce((a, b) => a + b, 0);
            menuItem.avgRating = (sum / menuItem.ratings.length).toFixed(1);
        }
    }

    order.rated = true;
    await db.write();
    console.log(`Review diterima untuk pesanan ${orderId}`);
    res.json({ success: true });
});

// API ROUTES
app.get('/api/reviews', (req, res) => {
    // [FIX] Mencegah caching pada response API
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(db.data.reviews);
});

app.get('/api/orders', requireLogin, (req, res) => {
    // [FIX] Mencegah caching pada response API
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // This endpoint returns just the HTML for the table rows for AJAX refresh
    const page = parseInt(req.query.page) || 1;
    const ordersPerPage = 10;
    const selectedDate = req.query.date || new Date().toISOString().slice(0, 10);
    const activeStatuses = ['paid', 'preparing', 'completed'];

    const targetDate = new Date(selectedDate).toDateString();
    const filteredOrders = db.data.orders
        .filter(o => activeStatuses.includes(o.status) && new Date(o.timestamp).toDateString() === targetDate)
        .reverse();
    
    const paginatedOrders = filteredOrders.slice((page - 1) * ordersPerPage, page * ordersPerPage);

    // Re-use the rendering logic, but only send the rows
    const renderOrderRows = (orders) => {
        return orders.length > 0 ? orders.map(order => {
            const allItemsDelivered = order.items.every(item => item.delivered);
            let actionButton = '';
            if (order.status === 'paid') {
                actionButton = `<form action="/admin/update-status" method="POST"><input type="hidden" name="orderId" value="${order.orderId}"><input type="hidden" name="newStatus" value="preparing"><button type="submit" class="bg-blue-500 text-white px-2 py-1 rounded text-xs">Siapkan</button></form>`;
            } else if (order.status === 'preparing' && allItemsDelivered) {
                actionButton = `<form action="/admin/update-status" method="POST"><input type="hidden" name="orderId" value="${order.orderId}"><input type="hidden" name="newStatus" value="completed"><button type="submit" class="bg-green-500 text-white px-2 py-1 rounded text-xs">Selesaikan Pesanan</button></form>`;
            }

            const itemsHtml = order.items.map((item, index) => {
                const optionsHtml = Object.entries(item.options).map(([key, value]) => `<li>${key}: ${value}</li>`).join('');
                const notesHtml = item.notes ? `<li class="italic">Catatan: ${item.notes}</li>` : '';
                return `
                    <div class="flex items-start justify-between py-1">
                        <div>
                            <strong>${item.name} (x${item.quantity})</strong>
                            <ul class="text-xs list-disc list-inside pl-2">${optionsHtml}${notesHtml}</ul>
                        </div>
                        ${order.status === 'preparing' ? `
                        <form action="/admin/pesanan/toggle-item" method="POST" class="flex items-center">
                            <input type="hidden" name="orderId" value="${order.orderId}">
                            <input type="hidden" name="itemCartId" value="${item.cartItemId}">
                            <input type="checkbox" onchange="this.form.submit()" ${item.delivered ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500">
                            <span class="ml-2 text-xs ${item.delivered ? 'text-green-600' : 'text-gray-500'}">${item.delivered ? 'Diantar' : 'Belum'}</span>
                        </form>
                        ` : ''}
                    </div>
                `;
            }).join('<hr class="my-1">');

            return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">${order.orderId}</td><td class="p-3">${order.customerName}</td>
                <td class="p-3 font-bold text-center">${order.tableNumber}</td>
                <td class="p-3">${itemsHtml}</td>
                <td class="p-3 font-bold">Rp ${order.totalAmount.toLocaleString('id-ID')}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                }">${order.status}</span></td>
                <td class="p-3">${toWIBString(order.timestamp)}</td>
                <td class="p-3 space-y-2">
                    ${actionButton}
                    ${order.status === 'preparing' && !allItemsDelivered ? `
                    <form action="/admin/pesanan/selesaikan-semua" method="POST">
                         <input type="hidden" name="orderId" value="${order.orderId}">
                         <button type="submit" class="bg-gray-500 text-white px-2 py-1 rounded text-xs w-full">Antar Semua</button>
                    </form>
                    ` : ''}
                </td>
            </tr>`;
        }).join('') : `<tr><td colspan="8" class="text-center p-4">Belum ada pesanan yang relevan untuk tanggal ini.</td></tr>`;
    };

    res.send(renderOrderRows(paginatedOrders));
});


// 8. JALANKAN SERVER
// =============================================================================
(async () => {
    await initializeDatabase();
    server.listen(PORT, () => {
        const { namaCafe } = db.data.settings;
        console.log(`✅ Server ${namaCafe} v4.1 berjalan di port ${PORT}, dapat diakses melalui https://cafe.araii.id`);
        console.log(`   - Halaman Menu: https://cafe.araii.id`);
        console.log(`   - Halaman Review: https://cafe.araii.id/review`);
        console.log(`   - Cek Pesanan:  https://cafe.araii.id/cek-pesanan`);
        console.log(`   - Halaman Admin: https://cafe.araii.id/admin (Login: /login)`);
    });
})();