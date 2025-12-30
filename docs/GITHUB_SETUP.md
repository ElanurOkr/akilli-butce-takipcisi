# GitHub'a Push İşlemleri

## 1. GitHub Repository Oluşturun

1. [GitHub.com](https://github.com) adresine gidin
2. Giriş yapın
3. Sağ üstteki "+" butonuna tıklayın → "New repository"
4. Repository bilgilerini girin:
   - **Repository name**: `akilli-butce-takipcisi`
   - **Description**: `Profesyonel finans yönetim sistemi`
   - **Public/Private**: İstediğinizi seçin
   - **"Initialize this repository with a README"**: İşaretlemeyin (zaten var)
5. "Create repository" butonuna tıklayın

## 2. Repository'yi Yerel Bağlantı

GitHub repository oluşturduktan sonra, aşağıdaki komutları terminalde çalıştırın:

```bash
# GitHub remote'ını ekle (GitHub_URL yerine kendi repository URL'nizi girin)
git remote add origin https://github.com/KULLANICI_ADI/akilli-butce-takipcisi.git

# Main branch'i GitHub'a pushla
git push -u origin main
```

## 3. GitHub URL Örneği

GitHub'da repository oluşturduktan sonra size şöyle bir URL verilecek:
```
https://github.com/kullanici-adiniz/akilli-butce-takipcisi.git
```

Bu URL'yi yukarıdaki komutta kullanın.

## 4. Alternatif - Token ile Push

Eğer şifre sorarsa, GitHub Personal Access Token oluşturmanız gerekebilir:

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" → "Generate new token (classic)"
3. Token'ı kopyalayın
4. Push sırasında şifre yerine bu token'ı kullanın

## Proje Durumu

✅ Git repository oluşturuldu  
✅ Dosyalar commit edildi  
⏳ GitHub remote'ı bekleniyor  
⏳ Push işlemi bekleniyor  

Yukarıdaki adımları tamamladıktan sonra projeniz GitHub'da yayınlanacak!
