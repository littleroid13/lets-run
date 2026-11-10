import * as XLSX from 'xlsx';

/**
 * Normalisasi nilai 'benar' menjadi index 0, 1, 2, atau 3.
 */
function normalizeCorrectIndex(rawVal, options) {
  if (rawVal === undefined || rawVal === null || rawVal === '') return null;

  const str = String(rawVal).trim().toUpperCase();

  // Huruf A, B, C, D
  if (str === 'A') return 0;
  if (str === 'B') return 1;
  if (str === 'C') return 2;
  if (str === 'D') return 3;

  // Angka 0, 1, 2, 3
  if (str === '0') return 0;
  if (str === '1') return 0; // Jika 1-based [1..4] vs 0-based [0..3], evaluasi context:
  if (str === '2') return 1;
  if (str === '3') return 2;
  if (str === '4') return 3;

  // Cek apakah string kunci sama dengan teks salah satu opsi pilihan
  if (options && Array.isArray(options)) {
    const matchIdx = options.findIndex(opt => String(opt).trim().toLowerCase() === String(rawVal).trim().toLowerCase());
    if (matchIdx !== -1) return matchIdx;
  }

  return null;
}

/**
 * Validasi dan parse file JSON bank soal
 */
export async function parseQuestionsJSON(file) {
  try {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        success: false,
        errors: [`Format JSON tidak valid atau rusak: ${e.message}`]
      };
    }

    let rawList = [];
    let title = 'Bank Soal Kustom';

    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && typeof data === 'object') {
      if (data.judul) title = data.judul;
      if (Array.isArray(data.soal)) {
        rawList = data.soal;
      } else if (Array.isArray(data.questions)) {
        rawList = data.questions;
      } else {
        return {
          success: false,
          errors: ["File JSON harus berisi array soal atau objek dengan properti 'soal': [...]"]
        };
      }
    } else {
      return {
        success: false,
        errors: ['Format file JSON tidak dikenali.']
      };
    }

    return validateAndNormalizeQuestions(rawList, title);
  } catch (err) {
    return {
      success: false,
      errors: [`Gagal membaca file JSON: ${err.message}`]
    };
  }
}

/**
 * Validasi dan parse file XLS / XLSX bank soal
 */
export async function parseQuestionsExcel(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    let workbook;
    try {
      workbook = XLSX.read(arrayBuffer, { type: 'array' });
    } catch (e) {
      return {
        success: false,
        errors: [`Gagal membaca spreadsheet Excel: ${e.message}`]
      };
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        errors: ['File Excel tidak memiliki lembar kerja (worksheet).']
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return {
        success: false,
        errors: ['Lembar kerja Excel kosong, tidak ditemukan baris data soal.']
      };
    }

    return validateAndNormalizeQuestions(rawRows, file.name.replace(/\.[^/.]+$/, ''));
  } catch (err) {
    return {
      success: false,
      errors: [`Terjadi kesalahan saat memproses file Excel: ${err.message}`]
    };
  }
}

/**
 * Normalisasi dan validasi mendalam tiap baris soal
 */
export function validateAndNormalizeQuestions(rawList, title = 'Bank Soal Kustom') {
  if (!rawList || rawList.length === 0) {
    return {
      success: false,
      errors: ['Daftar soal kosong. Minimal harus ada 1 soal.']
    };
  }

  const errors = [];
  const normalized = [];

  rawList.forEach((row, index) => {
    const rowNum = index + 1; // Baris ke-N (human readable)

    // Deteksi pertanyaan
    const tanya = (
      row.tanya ?? row.Tanya ?? row.soal ?? row.Soal ?? row.pertanyaan ?? row.Pertanyaan ?? ''
    ).toString().trim();

    if (!tanya) {
      errors.push(`Baris ${rowNum}: Kolom pertanyaan ('tanya') tidak boleh kosong.`);
      return;
    }

    // Deteksi pilihan A, B, C, D
    let optA = '', optB = '', optC = '', optD = '';
    if (Array.isArray(row.pilihan) && row.pilihan.length >= 4) {
      optA = String(row.pilihan[0] ?? '').trim();
      optB = String(row.pilihan[1] ?? '').trim();
      optC = String(row.pilihan[2] ?? '').trim();
      optD = String(row.pilihan[3] ?? '').trim();
    } else {
      optA = String(row.a ?? row.A ?? row['pilihan A'] ?? row['Pilihan A'] ?? row['Pilihan_A'] ?? '').trim();
      optB = String(row.b ?? row.B ?? row['pilihan B'] ?? row['Pilihan B'] ?? row['Pilihan_B'] ?? '').trim();
      optC = String(row.c ?? row.C ?? row['pilihan C'] ?? row['Pilihan C'] ?? row['Pilihan_C'] ?? '').trim();
      optD = String(row.d ?? row.D ?? row['pilihan D'] ?? row['Pilihan D'] ?? row['Pilihan_D'] ?? '').trim();
    }

    if (!optA || !optB || !optC || !optD) {
      errors.push(`Baris ${rowNum}: Pilihan jawaban A, B, C, dan D harus terisi semua.`);
      return;
    }

    const options = [optA, optB, optC, optD];

    // Deteksi kunci jawaban
    const rawBenar = row.benar ?? row.Benar ?? row.kunci ?? row.Kunci ?? row.jawaban ?? row.Jawaban;
    const correctIdx = normalizeCorrectIndex(rawBenar, options);

    if (correctIdx === null || correctIdx < 0 || correctIdx > 3) {
      errors.push(
        `Baris ${rowNum}: Kunci jawaban '${rawBenar || '(kosong)'}' tidak valid. Gunakan huruf A, B, C, atau D.`
      );
      return;
    }

    normalized.push({
      tanya,
      pilihan: options,
      benar: correctIdx
    });
  });

  if (errors.length > 0) {
    return {
      success: false,
      errors: errors.slice(0, 8), // Batasi agar UI tidak kepenuhan jika error banyak
      totalErrors: errors.length
    };
  }

  if (normalized.length === 0) {
    return {
      success: false,
      errors: ['Tidak ada soal yang valid untuk dimuat.']
    };
  }

  return {
    success: true,
    title,
    count: normalized.length,
    questions: normalized
  };
}

/**
 * Buat dan unduh file template XLS/XLSX contoh soal
 */
export function downloadExcelTemplate() {
  const rows = [
    ['tanya', 'A', 'B', 'C', 'D', 'benar'],
    ['Hewan pemakan tumbuhan disebut...', 'Karnivora', 'Herbivora', 'Omnivora', 'Insektivora', 'B'],
    ['Ibu kota negara Indonesia adalah...', 'Surabaya', 'Bandung', 'Nusantara (IKN)', 'Medan', 'C'],
    ['Hasil dari 15 x 6 adalah...', '70', '80', '90', '100', 'C'],
    ['Bagian tumbuhan yang berfungsi menyerap air dari tanah adalah...', 'Akar', 'Batang', 'Daun', 'Bunga', 'A'],
    ['Matahari terbit dari sebelah...', 'Barat', 'Utara', 'Selatan', 'Timur', 'D'],
    ['Zat cair yang membeku akan berubah menjadi...', 'Gas', 'Padat', 'Uap', 'Plasma', 'B'],
    ['Pancasila sila ke-3 berbunyi...', 'Keadilan Sosial', 'Persatuan Indonesia', 'Kemanusiaan yang Adil', 'Ketuhanan Yang Maha Esa', 'B']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set lebar kolom agar rapi dan nyaman dibaca di Excel
  ws['!cols'] = [
    { wch: 48 }, // tanya
    { wch: 18 }, // A
    { wch: 18 }, // B
    { wch: 18 }, // C
    { wch: 18 }, // D
    { wch: 10 }  // benar
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Soal');
  XLSX.writeFile(wb, 'template_soal_lets_run.xlsx');
}
