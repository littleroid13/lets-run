# Lari Rintangan Kuis - Spesifikasi

## Tujuan
Game kuis lari 3D untuk 3-4 siswa di satu layar sentuh besar (TV PID / interactive whiteboard). Dipakai guru lewat github.io, tanpa backend dan tanpa login.

## Teknologi
- Vite + JavaScript (tanpa framework UI), Three.js, GLTFLoader
- Tanpa backend. Semua data soal dari /data/questions.json (atau impor CSV)
- Hasil build harus berjalan di GitHub Pages (base path relatif './')

## Aturan Kode
- Pisahkan modul: main.js, game/, lanes/, gates/, ui/, audio/, data/
- Jangan duplikasi komponen; pakai ulang yang sudah ada
- Jangan mengubah atau menghapus file di /public/assets
- Setiap fase harus bisa dijalankan sebelum lanjut ke fase berikutnya
- Komentar singkat berbahasa Indonesia

## Gameplay
- Layar dibagi 4 kolom (split-screen), satu jalur per pemain
- Karakter lari otomatis. Di tiap gerbang soal muncul pertanyaan dan 4 pintu A/B/C/D
- Pemain menyentuh pintu di kolomnya (Pointer Events, multi-touch)
- Benar = speed boost; salah = melambat. Ada timer per soal
- Pemenang = tercepat sampai finis (kecepatan dipengaruhi ketepatan jawaban)

## Layar Besar
- Tombol dan pintu jawaban besar, teks soal besar dan kontras tinggi
- Jarak antar zona pemain lebar

## Format Soal (questions.json)
{ "judul": "...", "soal": [ { "tanya": "...", "pilihan": ["A","B","C","D"], "benar": 0 } ] }