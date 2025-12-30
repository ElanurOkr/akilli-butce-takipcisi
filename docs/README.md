# Akıllı Bütçe Takipçisi

Tarayıcı tabanlı, localStorage destekli profesyonel bütçe takip uygulaması.

## Özellikler

### 📊 Veri Kalıcılığı (Persistence)
- **localStorage** kullanarak verileri tarayıcıda saklar
- Sayfa yenilense bile veriler kaybolmaz
- Herhangi bir backend veya API gerektirmez

### 💰 Gelir ve Gider Yönetimi
- Gelir ve giderleri kolayca ekleme
- Kategorize edilmiş işlem yönetimi
- Tarih bazlı işlem takibi

### 📈 Gerçek Zamanlı Bakiye Hesaplama
- Anlık toplam gelir, gider ve net bakiye gösterimi
- Pozitif/negatif bakiye renk ayrımı
- Otomatik hesaplama algoritması

### 📋 Kategorizasyon Sistemi
**Gelir Kategorileri:**
- Maaş
- Freelance
- Yatırım
- Hediye
- Diğer Gelir

**Gider Kategorileri:**
- Market
- Eğlence
- Ulaşım
- Faturalar
- Sağlık
- Eğitim
- Giyim
- Kira
- Diğer Gider

### 📊 Veri Görselleştirme
- **Chart.js** entegrasyonu ile pasta grafik
- Giderlerin kategori bazlı dağılımı
- İnteraktif grafik özellikleri

### 🎨 Profesyonel Arayüz
- Modern **TailwindCSS** tasarımı
- Cam efekti (glassmorphism) bileşenler
- Responsive tasarım (mobil uyumlu)
- Smooth animasyonlar ve geçişler
- Font Awesome ikonlar

### 🔍 Filtreleme ve Arama
- Tüm işlemleri görüntüleme
- Sadece gelirleri filtreleme
- Sadece giderleri filtreleme
- İşlem silme özelliği

## Teknolojiler

- **HTML5** - Modern yapısal markup
- **TailwindCSS** - Utility-first CSS framework
- **Vanilla JavaScript** - ES6+ özellikleri
- **Chart.js** - Veri görselleştirme
- **Font Awesome** - İkon kütüphanesi
- **localStorage API** - Tarayıcı depolama

## Nasıl Kullanılır?

1. Projeyi tarayıcıda açın:
   ```bash
   # Proje dizinine gidin
   cd akilli-butce-takipcisi
   
   # index.html dosyasını tarayıcıda açın
   open index.html
   ```

2. **İşlem Eklemek:**
   - Gelir veya Gider tipini seçin
   - Açıklama, tutar ve kategori bilgilerini girin
   - Tarihi seçin (otomatik olarak bugün gelir)
   - "İşlemi Kaydet" butonuna tıklayın

3. **Veri Yönetimi:**
   - İşlemleri listede görüntüleyin
   - Filtreler kullanarak istediğiniz verileri gösterin
   - Çöp kutusu ikonu ile işlemleri silin

4. **Analiz:**
   - Üst kısımda bakiye kartlarını izleyin
   - Pasta grafikten gider dağılımını görün

## Proje Yapısı

```
akilli-butce-takipcisi/
├── index.html          # Ana HTML dosyası
├── script.js           # JavaScript uygulama mantığı
└── README.md          # Proje dokümantasyonu
```

## localStorage Veri Yapısı

Uygulama, işlemleri şu formatta localStorage'da saklar:

```javascript
{
  "id": 1234567890,
  "type": "income|expense",
  "description": "İşlem açıklaması",
  "amount": 1500.00,
  "category": "Maaş",
  "date": "2024-01-15",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Öne Çıkan Özellikler

### ✅ Veri Kalıcılığı
- Sayfa yenilendiğinde veriler korunur
- Tarayıcı kapanıp açıldığında veriler kaybolmaz

### ✅ Anlık Hesaplama
- Her işlemde bakiye otomatik güncellenir
- Performans optimize edilmiş hesaplama algoritması

### ✅ Profesyonel UI/UX
- Modern ve şık tasarım
- Kullanıcı dostu arayüz
- Mobil cihazlarda mükemmel görünüm

### ✅ Veri Görselleştirme
- Anlaşılır grafikler
- İnteraktif gösterimler
- Yüzdesel dağılım

## Geliştirici Notları

Bu proje, frontend geliştirmede şu konuları gösterir:
- Modern JavaScript ES6+ özellikleri
- localStorage API kullanımı
- Responsive web tasarımı
- Veri görselleştirme
- Component-based düşünce yapısı
- Event handling ve state management

## Lisans

Bu proje eğitim amaçlıdır ve açık kaynaklıdır.
