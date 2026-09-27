# cPanel-ə yükləmə təlimatı

## 1. Faylları yükləyin
Bu qovluğu (aşağıdakılar **istisna olmaqla**) cPanel-də tətbiqin kök qovluğuna yükləyin:
`.venv/`, `venv/`, `node_modules/`, `__pycache__/`, `instance/*.db` (bunlar serverdə yenidən yaranacaq).

## 2. Python App yaradın (Setup Python App)
cPanel → **Setup Python App** → Create Application:
- Python version: 3.10+ (mövcud olan ən yenisi)
- Application root: bu qovluq
- Application startup file: `passenger_wsgi.py`
- Application Entry point: `application`

## 3. Asılılıqları quraşdırın
cPanel-in verdiyi "Enter to the virtual environment" komandasını işə salıb:
```bash
pip install -r requirements.txt
```

## 4. Mühit dəyişənləri
`.env.example` faylını `.env` adı ilə kopyalayın və doldurun:
```bash
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # SECRET_KEY üçün
```
`SECRET_KEY` mütləq unikal və gizli olmalıdır (default dəyər production üçün yararsızdır).

## 5. Verilənlər bazasını hazırlayın
```bash
flask db upgrade
```
Bu, `instance/iydp.db` faylını yaradacaq və bütün cədvəlləri quracaq, həmçinin ilk `admin` hesabını
(username: `admin`, şifrə: `admin123`) avtomatik yaradacaq.

**VACİB:** Deploy etdikdən dərhal sonra Admin Panel → daxil olun → şifrəni dəyişin
(hazırda kodda ayrıca "şifrə dəyiş" səhifəsi yoxdur — ən sadə yol: verilənlər bazasında
`user` cədvəlindəki `admin` sətrinin `password` sütununu
`python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('YENİ_ŞİFRƏ'))"`
nəticəsi ilə əvəz edin).

## 6. Kamera ilə QR skaner üçün
`/admin/scanner` səhifəsi brauzerin kamerasından istifadə edir — bu, **yalnız HTTPS üzərində**
işləyir (cPanel-də pulsuz "AutoSSL" aktivləşdirin).

## 7. Restart
cPanel → Setup Python App → "Restart" düyməsini basın ki, dəyişikliklər tətbiq olunsun.

---

## Layihənin strukturu (qısa)
- `app.py` — bütün marşrutlar (public səhifələr, admin panel, member/VIP, JSON API)
- `models.py` — verilənlər bazası modelləri
- `services/vip.py`, `services/checkin.py` — VIP ödəniş və QR check-in məntiqi
- `templates/` — bütün HTML səhifələr (Jinja2) — bu, canlı saytdır
- `src/` + `dist/` — ayrıca, hazırda **saytla bağlanmamış** React SPA cəhdi (aşağıya baxın)

## React SPA haqqında qeyd
`src/` qovluğunda tam ayrı bir React tətbiqi var (yeni dizaynla Home/News/Opportunities/FAQ/
Stories/Erasmus səhifələri), lakin `app.py` onu heç bir yerdə serve etmir — nə production build
(`dist/`) fayllarını, nə də onun `/faq`, `/stories`, `/erasmus` marşrutlarını. Yəni bu React
tətbiqi hazırda saytın canlı hissəsi deyil, orfanlaşmış vəziyyətdədir. Yeni Hesabım/VIP kart
funksionallığını mövcud (işlək) Jinja saytına əlavə etdim ki, risk yaratmayım. Əgər gələcəkdə
React tərəfini əsas sayt etmək istəsəniz, ayrıca müzakirə edib planlaşdırmaq lazımdır.
