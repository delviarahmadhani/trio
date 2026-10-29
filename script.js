
"use strict";

const form = document.getElementById("queueForm");
const tanggalInput = document.getElementById("tanggal");
const queueRows = document.getElementById("queueRows");
const emptyState = document.getElementById("emptyState");
const formMessage = document.getElementById("formMessage");

const STORAGE_KEY = "sehatKitaAntreanV2";

function tanggalLokal() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function ambilData() {
  try {
    const data = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Gagal membaca data:", error);
    return [];
  }
}

function simpanData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan data:", error);
    formMessage.textContent = "Data gagal disimpan di browser.";
    return false;
  }
}

function kodePoli(poli) {
  const kode = {
    "Poli Umum": "A",
    "Poli Gigi": "B",
    "Poli KIA": "C",
    "Poli Anak": "D",
    "Imunisasi": "E"
  };

  return kode[poli] || "X";
}

function buatNomor(data, tanggal, poli) {
  const prefix = kodePoli(poli);

  const nomorTerakhir = data.reduce((terbesar, pasien) => {
    if (pasien.tanggal !== tanggal || pasien.poli !== poli) {
      return terbesar;
    }

    const cocok = String(pasien.nomor || "").match(
      new RegExp(`^${prefix}(\\d+)$`)
    );

    return cocok
      ? Math.max(terbesar, Number(cocok[1]))
      : terbesar;
  }, 0);

  return prefix + String(nomorTerakhir + 1).padStart(3, "0");
}

function formatTanggal(value) {
  if (!value) return "-";

  const [tahun, bulan, hari] = value.split("-").map(Number);

  return new Date(tahun, bulan - 1, hari).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function hitungWaktu(data, tanggal, poli) {
  const jumlah = data.filter(pasien =>
    pasien.tanggal === tanggal && pasien.poli === poli
  ).length;

  const menit = 8 * 60 + jumlah * 15;

  return (
    String(Math.floor(menit / 60)).padStart(2, "0") +
    ":" +
    String(menit % 60).padStart(2, "0") +
    " WIB"
  );
}

function tampilkanBukti(pasien) {
  document.getElementById("ticketTitle").textContent =
    "Pendaftaran Berhasil!";

  document.getElementById("ticketSubtitle").textContent =
    "Nomor antrean Anda telah disimpan.";

  document.getElementById("ticketNumber").textContent =
    pasien.nomor;

  document.getElementById("ticketPoli").textContent =
    pasien.poli;

  document.getElementById("ticketName").textContent =
    pasien.nama;

  document.getElementById("ticketDate").textContent =
    formatTanggal(pasien.tanggal);

  document.getElementById("ticketTime").textContent =
    pasien.waktu;
}

function buatKolom(teks) {
  const td = document.createElement("td");
  td.textContent = teks ?? "-";
  return td;
}

function tampilkanAntrean() {
  const data = ambilData().sort((a, b) =>
    a.tanggal.localeCompare(b.tanggal) ||
    a.nomor.localeCompare(b.nomor)
  );

  queueRows.replaceChildren();

  document.getElementById("patientCount").textContent =
    `♟ ${data.length} Pasien`;

  document.getElementById("tableFoot").textContent =
    `Menampilkan ${data.length} data antrean`;

  emptyState.style.display = data.length === 0 ? "flex" : "none";

  data.forEach((pasien, index) => {
    const row = document.createElement("tr");

    [
      String(index + 1),
      pasien.nomor,
      pasien.nama,
      pasien.poli,
      formatTanggal(pasien.tanggal)
    ].forEach(teks => row.appendChild(buatKolom(teks)));

    const statusCell = buatKolom("");
    const status = document.createElement("span");

    status.className = "status-pill";
    status.textContent = pasien.status || "Terdaftar";

    statusCell.appendChild(status);
    row.appendChild(statusCell);

    const aksiCell = buatKolom("");
    const tombolHapus = document.createElement("button");

    tombolHapus.type = "button";
    tombolHapus.className = "delete-button";
    tombolHapus.textContent = "Hapus";

    tombolHapus.addEventListener("click", () => {
      hapusAntrean(pasien.id);
    });

    aksiCell.appendChild(tombolHapus);
    row.appendChild(aksiCell);

    queueRows.appendChild(row);
  });
}

function hapusAntrean(id) {
  if (!confirm("Yakin ingin menghapus antrean ini?")) {
    return;
  }

  const data = ambilData().filter(pasien => pasien.id !== id);

  if (simpanData(data)) {
    tampilkanAntrean();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  formMessage.textContent = "";

  const nama = document.getElementById("nama").value.trim();
  const nik = document.getElementById("nik").value.trim();
  const tanggal = tanggalInput.value;
  const poli = document.getElementById("poli").value;
  const keluhan = document.getElementById("keluhan").value.trim();

  if (!nama || !nik || !tanggal || !poli || !keluhan) {
    formMessage.textContent =
      "Mohon lengkapi semua data terlebih dahulu.";
    return;
  }

  if (!/^\d{16}$/.test(nik)) {
    formMessage.textContent =
      "NIK harus terdiri dari 16 digit angka.";
    return;
  }

  if (tanggal < tanggalLokal()) {
    formMessage.textContent =
      "Tanggal kunjungan tidak boleh sebelum hari ini.";
    return;
  }

  const data = ambilData();

  const sudahTerdaftar = data.some(pasien =>
    pasien.nik === nik &&
    pasien.tanggal === tanggal &&
    pasien.poli === poli
  );

  if (sudahTerdaftar) {
    formMessage.textContent =
      "NIK sudah terdaftar pada poli dan tanggal tersebut.";
    return;
  }

  const pasien = {
    id: Date.now().toString() +
      Math.random().toString(16).slice(2),
    nama,
    nik,
    tanggal,
    poli,
    keluhan,
    nomor: buatNomor(data, tanggal, poli),
    waktu: hitungWaktu(data, tanggal, poli),
    status: "Terdaftar"
  };

  data.push(pasien);

  if (!simpanData(data)) return;

  tampilkanBukti(pasien);
  tampilkanAntrean();

  form.reset();
  tanggalInput.min = tanggalLokal();
  tanggalInput.value = tanggalLokal();

  document.querySelector(".ticket-card").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});

function printTicket() {
  const nomor = document.getElementById("ticketNumber").textContent;

  if (!nomor || nomor === "A001") {
    alert("Silakan daftar terlebih dahulu.");
    return;
  }

  window.print();
}

tanggalInput.min = tanggalLokal();
tanggalInput.value = tanggalLokal();

tampilkanAntrean();
