# 🏃 LET'S RUN! - Kuis Lari Rintangan Interaktif

**LET'S RUN!** adalah media belajar dan kuis interaktif 4 pemain (*split-screen*) berbasis web 3D. Siswa berlomba lari di 4 jalur mandiri sambil menjawab pertanyaan pilihan ganda dengan menembus pintu gerbang rintangan A, B, C, atau D.

---

## 🔑 Kode Akses Game
Saat pertama kali membuka game, masukkan kode akses berikut:
```text
MRLIT105
```
> **Kontak Pengembang untuk Akses / Informasi:**
> - **Instagram:** [@littleroid13](https://www.instagram.com/littleroid13/)
> - **TikTok:** [@littleoid13](https://www.tiktok.com/@littleoid13)
> - **WhatsApp:** [+62 887-0591-7045](https://wa.me/6288705917045)

---

## 👨‍🏫 Panduan Penggunaan untuk Guru

### 1. Masuk & Membuka Lobi
1. Buka tautan game di browser (Chrome / Edge / Firefox).
2. Masukkan kode akses `MRLIT105` pada form login, lalu klik **"MASUK KE GAME ➔"**.
3. Di layar lobi, 1 hingga 4 pemain dapat memilih karakter favorit menggunakan tombol panah **◀** dan **▶**.
4. Setiap pemain menekan tombol **"SENTUH! 👆"** hingga statusnya berubah menjadi **"SIAP! ✓"**.
5. Tombol besar **"MULAI BALAPAN ➔"** akan aktif saat minimal 1 pemain telah siap.

### 2. Panel Pengaturan Guru (Tombol Roda Gigi ⚙️)
Di pojok kiri atas lobi, klik tombol roda gigi **⚙️** untuk membuka panel guru:
- **Jumlah Soal:** Tentukan berapa butir soal yang diujikan dalam 1 sesi balapan.
- **Waktu per Soal:** Atur batas waktu menjawab tiap soal (dalam detik).
- **Tema Lintasan:** Pilih suasana lintasan 3D (Siang Cerah, Sore Senja, atau Malam Lampu).
- **Suara / Audio:** Nyalakan atau matikan musik pengiring (BGM) dan efek suara (SFX).
- **Unggah Soal Sendiri (Excel / JSON):**
  - Klik **"Unduh Template XLS"** untuk mendapatkan format Excel resmi.
  - Format kolom Excel: `tanya`, `A`, `B`, `C`, `D`, `benar` (isi kunci jawaban dengan huruf `A`, `B`, `C`, atau `D`).
  - Klik tombol **"Pilih File Soal"** untuk mengunggah file `.xlsx`, `.xls`, atau `.json`.
  - Soal yang diunggah akan divalidasi otomatis dan disimpan di memori browser (*localStorage*).

### 3. Jalannya Balapan & Menjawab Soal
- Layar terbagi menjadi 4 jalur kamera independen.
- Menjelang gerbang rintangan, pertanyaan akan muncul beserta 4 pintu (A, B, C, D).
- Pemain memilih jawaban dengan menyentuh tombol A/B/C/D di bawah viewport jalur mereka (atau tombol keyboard).
- **Jawaban Benar:** Pintu terbuka lebar dengan kilauan cahaya, karakter melesat kencang dengan efek dorongan turbo!
- **Jawaban Salah / Waktu Habis:** Karakter menabrak pintu rintangan hingga hancur berkeping-keping dan mengalami penalti melambat sejenak. Pintu yang benar akan menyala hijau untuk edukasi siswa.

### 4. Podium Juara & Unduh Rekap Nilai Excel
- Setelah semua pemain melintasi garis finis, layar **Podium Peringkat** akan tampil otomatis.
- Menampilkan juara 1, 2, 3, dan 4 beserta rincian skor, waktu finis, dan persentase jawaban benar.
- Klik tombol **"Unduh Laporan Excel (XLSX)"** untuk mengunduh rekap nilai seluruh pemain secara rapi untuk arsip guru.

---

## 🚀 Cara Mengaktifkan GitHub Pages di Repositori

Proyek ini telah dikonfigurasi dengan build relatif (`base: './'`) dan dilengkapi alur kerja otomatis **GitHub Actions** (`.github/workflows/deploy.yml`).

Ikuti langkah mudah berikut untuk menerbitkan game ke GitHub Pages:

1. **Push Proyek ke GitHub**:
   Pastikan seluruh kode telah di-*push* ke branch `main` repositori GitHub Anda:
   ```bash
   git add .
   git commit -m "Siapkan rilis game untuk GitHub Pages"
   git push origin main
   ```

2. **Aktifkan GitHub Pages melalui GitHub Actions**:
   - Buka halaman repositori Anda di situs **GitHub**.
   - Klik tab menu **Settings** (Pengaturan repositori).
   - Pada panel navigasi di sebelah kiri, klik menu **Pages**.
   - Di bagian **Build and deployment**:
     - Pada pilihan dropdown **Source**, pilih **"GitHub Actions"** (jangan pilih *Deploy from a branch*).

3. **Deployment Otomatis Selesai**:
   - Klik tab **Actions** di bagian atas repositori untuk melihat proses build & deploy berjalan.
   - Setelah proses selesai (bercentang hijau), tautan website game Anda akan muncul di bagian atas halaman **Settings > Pages** (misalnya: `https://<username>.github.io/<nama-repo>/`).
   - Tautan tersebut siap dibagikan kepada siswa atau dibuka di proyektor kelas!

---

## 💻 Menjalankan Game Secara Lokal (Development)

Jika Anda ingin menjalankan atau menguji game ini di komputer lokal:

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan server lokal
npm run dev

# 3. Buka browser di http://localhost:5173/
```

Untuk menguji build produksi lokal:
```bash
npm run build
npm run preview
```

---

## 📜 Hak Cipta
LET'S RUN! &copy; 2026 &bull; Dibuat dan dikembangkan oleh **littleroid13**.
