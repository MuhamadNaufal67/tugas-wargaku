const services = [
  {
    id: 1,
    title: "Ajukan Surat",
    description:
      "Isi formulir untuk surat domisili, keterangan usaha, keterangan tidak mampu, pengantar RT, atau keterangan umum.",
    detail:
      "Nama, NIK, dan alamat terisi otomatis dari akun Anda. Periksa kembali, pilih jenis surat, lalu kirim.",
  },
  {
    id: 2,
    title: "Status Pengajuan",
    description:
      "Lihat posisi setiap pengajuan: menunggu, diproses, selesai, atau ditolak.",
    detail:
      "Jika ditolak, catatan dari pengurus ditampilkan dan Anda bisa mengajukan ulang tanpa mengetik data dari awal.",
  },
  {
    id: 3,
    title: "Pengumuman RT",
    description:
      "Baca informasi dari pengurus, seperti jadwal kerja bakti, rapat warga, atau pemberitahuan penting.",
    detail:
      "Setiap pengumuman baru juga dikirim sebagai notifikasi ke akun Anda.",
  },
];

export async function GET() {
  return Response.json(services);
}
