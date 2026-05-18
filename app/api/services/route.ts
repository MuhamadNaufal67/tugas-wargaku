const services = [
  {
    id: 1,
    title: "Ajukan Surat",
    description:
      "Warga dapat mengajukan surat pengantar atau dokumen administrasi RT secara online melalui formulir yang terstruktur.",
    detail:
      "Alur pengajuan dibuat sederhana agar warga bisa mengirim data dengan cepat, sementara pengurus lebih mudah memeriksa kelengkapan berkas.",
  },
  {
    id: 2,
    title: "Status Pengajuan",
    description:
      "Setiap permohonan surat memiliki status yang dapat dipantau secara realtime sehingga warga mengetahui progres layanannya.",
    detail:
      "Fitur ini membantu transparansi proses layanan dan mengurangi pertanyaan berulang karena perkembangan pengajuan selalu tersedia.",
  },
  {
    id: 3,
    title: "Pengumuman RT",
    description:
      "Informasi penting seperti jadwal rapat, kegiatan warga, dan pengumuman lingkungan ditampilkan dalam satu pusat informasi.",
    detail:
      "Pengurus dapat menyampaikan informasi dengan cepat, sementara warga menerima kabar terbaru tanpa harus menunggu pemberitahuan manual.",
  },
];

export async function GET() {
  return Response.json(services);
}
