const fs = require('fs');
let content = fs.readFileSync('D:/ODeSy - Platform/VPS_Backend/Odesy_Portal/public/DashboardView.html', 'utf8');

const oldSidebar = /<div class="modul-list">[\s\S]*?<\/aside>/;
const newSidebar = <div class="modul-list">
          <div class="modul-item active" onclick="selectModul(this, 'Gudang')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Gudang</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Aset')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Aset</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Logbook')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Logbook</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Pakan')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Pakan</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Saprotam')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Saprotam</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'BBM')">
            <span class="modul-icon">?</span>
            <span class="modul-text">BBM</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'HM/KM')">
            <span class="modul-icon">??</span>
            <span class="modul-text">HM/KM</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Laporan PKKPRL')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Laporan PKKPRL</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Laporan UKL-UPL')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Laporan UKL-UPL</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Laporan LKPM')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Laporan LKPM</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Lokasi')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Lokasi</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Struktur Organisasi')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Struktur Organisasi</span>
          </div>
          <div class="modul-item" onclick="selectModul(this, 'Aksesbilitas')">
            <span class="modul-icon">??</span>
            <span class="modul-text">Aksesbilitas</span>
          </div>
        </div>
      </aside>;

content = content.replace(oldSidebar, newSidebar);
fs.writeFileSync('D:/ODeSy - Platform/VPS_Backend/Odesy_Portal/public/DashboardView.html', content);
console.log('Sidebar updated');
