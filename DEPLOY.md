# Yükləmə təlimatı

React tətbiqi (`src/`) build olunub Fl`ask tərəfindən serve edilir, `/admin/*` isə ayrıca
server-rendered admin paneldir. Python 3.10+ lazımdır. Aşağıda VPS üçün yeniləmə qaydası, sonra
cPanel variantı var.

## VPS-də mövcud saytı yeniləmək

**Toxunulmamalı olanlar:** serverdəki `.env`, `instance/` (baza) və `static/uploads/` (şəkillər).

1. **Əvvəlcə nüsxə götürün:** baza və `static/uploads/`. PostgreSQL-dirsə `pg_dump`. Bəzi köhnə
   sütunlar və cədvəllər dəyişir, nüsxəsiz başlamayın.
2. Yeni kodu köhnənin üzərinə qoyun, yuxarıdakı üç yeri silmədən.
3. Paketlər: `pip install -r requirements.txt` (Flask 2.3 → 3.1, Pillow əlavə olunub).
4. `.env`-ə yeniləri əlavə edin, `.env.example`-a baxın: `TRUSTED_PROXY_HOPS`, `SITE_URL`, `MAIL_*`.
5. Baza: `FLASK_APP=app.py flask db upgrade`. Bazada hansı versiya olsa da, çatışmayanları əlavə edir.
6. `dist/` zip-də hazırdır. Git-dən yeniləyirsinizsə: `npm ci && npm run build`.
7. Servisi restart edin. `gunicorn app:app`, `requirements.txt`-dədir.
8. nginx-də `client_max_body_size 80m;` olsun, yoxsa böyük şəkil albomları yüklənmir. HTTPS-in düzgün
   tanınması üçün `proxy_set_header X-Forwarded-Proto $scheme;` da lazımdır. Sürət üçün `gzip on;` əlavə edin
   (`js`, `css`, `svg`, `json`).
9. Gündəlik ehtiyat nüsxə üçün cron: `cd /layihə && venv/bin/python scripts/backup_db.py` (yalnız SQLite).

**Email təsdiqi:** `MAIL_*` və `SITE_URL` dolu olanda işə düşür. Üzvə link gedir, 24 saat işləyir.
Üzv hesaba girə bilir, amma təsdiqdən
əvvəl tədbirə, layihəyə müraciət edə və VIP istəyə bilmir. Köhnə hesablar da bir dəfə təsdiq edir.
Bu dəyərlər boş olsa, heç kimdən təsdiq istənmir və admin panelin ana səhifəsində xəbərdarlıq görünür.
Məktubu çatmayan üzvü admin **Members** səhifəsindən əl ilə təsdiqləyə bilər.

**Əlaqə mesajları:** `CONTACT_NOTIFY_EMAIL` doludursa, saytdan gələn hər mesaj həmin ünvana da mail
ilə gedir, cavab vuranda birbaşa yazana çatır. Boşdursa, yalnız admin paneldə görünür.

**Şifrəni unutmaq:** giriş səhifəsindəki **Şifrəni unutmusunuz?** üzvə 1 saatlıq link göndərir. Link bir
dəfə işləyir, şifrə dəyişəndə bütün cihazlarda çıxış olur. `MAIL_*` və `SITE_URL` boşdursa işləmir: o zaman
admin **Members** səhifəsindən müvəqqəti şifrə verir. Admin hesablarına bu yolla link göndərilmir.

**Məktublar spama düşməsin deyə:** domenin DNS-i Cloudflare-dədir, ona görə SPF və DKIM qeydləri
avtomatik yazılmır, Cloudflare-ə əl ilə əlavə olunmalıdır.
1. konsoleH-də domen üçün DKIM-i aktiv edin, göstərilən TXT qeydini Cloudflare-ə əlavə edin (DNS only).
2. SPF qeydini konsoleH-in göstərdiyi dəyərlə əvəz edin. Domendə yalnız bir SPF qeydi olmalıdır.
3. Serverdə `SITE_URL=https://iydp.org` olsun. `127.0.0.1` və ya rəqəmli ünvan olmasın.
4. `python scripts/test_mail.py <ünvan>` ilə Gmail-ə məktub göndərin. "Show original"-da `spf=pass`,
   `dkim=pass`, `dmarc=pass` görünməlidir.

**Yenilənmədən sonra:**
- Bütün istifadəçilər bir dəfə hesabdan çıxmış olur, sessiya formatı dəyişib.
- Köhnə kod ilk admini `admin123` şifrəsi ilə yaradırdı. Admin paneldə **Settings**-dən dəyişin.
- `blog_post` cədvəli silinmir, amma sayt artıq onu istifadə etmir. Stories ayrıca doldurulur.
- Formasız tədbirlərə müraciət bağlı olur. Admin hər tədbir üçün **Create form** ilə forma qurur.

## cPanel variantı

Hostinq planında **Setup Python App** olmalıdır: hər cPanel planında olmur. `app.py` Passenger ilə
(`passenger_wsgi.py`) işə düşür.

---

### 1. Faylları yükləyin
Tətbiqi `public_html`-dən **kənarda** bir qovluğa qoyun (məs. `~/iydp`), əks halda `.env` və
baza internetdən açıla bilər. Bu qovluğu (aşağıdakılar **istisna olmaqla**) ora yükləyin:
`.venv/`, `venv/`, `node_modules/`, `__pycache__/`, `dist/`, `instance/*.db`
(bunlar serverdə yenidən yaranacaq/build olunacaq).

### 2. Python App yaradın (Setup Python App)
cPanel → **Setup Python App** → Create Application:
- Python version: 3.10+ (mövcud olan ən yenisi)
- Application root: bu qovluq
- Application startup file: `passenger_wsgi.py`
- Application Entry point: `application`

### 3. Asılılıqları quraşdırın
cPanel-in verdiyi "Enter to the virtual environment" komandasını işə salıb:
```bash
pip install -r requirements.txt
```

### 4. React tətbiqini build edin
Terminal-da (Node.js mövcud olmalıdır — yoxdursa, cPanel-in "Setup Node.js App"
xüsusiyyəti ilə və ya lokal maşınızda build edib yalnız `dist/` qovluğunu yükləyin):
```bash
npm install
npm run build
```
Bu `dist/` qovluğunu yaradır — Flask onu avtomatik serve edir (`/`, `/login`,
`/account` və s. üçün).

### 5. Mühit dəyişənləri
`.env.example` faylını `.env` adı ilə kopyalayın və doldurun:
```bash
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # SECRET_KEY üçün
```
`SECRET_KEY` mütləq unikal və gizli olmalıdır — bu, sessiya cookie-lərini imzalayır.
Əgər təyin etməsəniz, tətbiq özü təsadüfi bir dəyər yaradacaq (xəbərdarlıqla), amma
bu, hər restart-da sessiyaları etibarsız edəcək, ona görə mütləq təyin edin.

### 6. Verilənlər bazasını hazırlayın
```bash
flask db upgrade
```
Bu, `instance/iydp.db` faylını yaradacaq və bütün cədvəlləri quracaq.

**İlk admin hesabı:** kodda heç bir default şifrə yoxdur. `flask db upgrade` işlətməzdən
əvvəl `.env` faylına `ADMIN_PASSWORD=<uzun şifrə>` yazın (istəsəniz `ADMIN_USERNAME` də).
Admin hesabı ilk işə düşmədə yaradılır. Giriş etdikdən sonra `ADMIN_PASSWORD` sətrini
`.env`-dən silin; şifrəni sonra **Admin Panel → Settings**-dən dəyişə bilərsiniz.

### 7. Kamera ilə QR skaner üçün
`/admin/scanner` səhifəsi brauzerin kamerasından istifadə edir — bu, **yalnız HTTPS
üzərində** işləyir (cPanel-də pulsuz "AutoSSL" aktivləşdirin).

### 8. Restart
cPanel → Setup Python App → "Restart" düyməsini basın ki, dəyişikliklər tətbiq olunsun.

---

## Testlər

Yeniləmədən əvvəl lokal kompüterdə işlədin. Hər yoxlama öz yeni bazası ilə işləyir, real bazaya,
`static/uploads/`-a və real maillərə toxunmur:

```bash
pip install -r requirements-dev.txt
npm install && npm run build
pytest tests -m "not browser"   # sürətli
pytest tests                    # brauzer yoxlamaları ilə, Google Chrome lazımdır
```

## Verilənlər bazası və ehtiyat nüsxə

Sayt SQLite ilə işləyir (`instance/iydp.db`), ayrıca baza serveri və ödəniş tələb etmir.
Hər bağlantıda WAL rejimi, xarici açar yoxlaması və 15 saniyəlik gözləmə açılır.

**WAL haqqında:** baza yanında `iydp.db-wal` və `iydp.db-shm` faylları görünə bilər, bu
normaldır. Sayt işləyərkən `.db` faylını əl ilə kopyalamayın, son dəyişikliklər itə bilər.
Hostinqin diski şəbəkə diski (NFS) olmamalıdır: hostinqdən soruşun.

**Gündəlik ehtiyat nüsxə:** cPanel → **Cron Jobs** → gündə bir dəfə. Virtual mühitin yolunu
Setup Python App səhifəsi göstərir:
```bash
cd ~/iydp && ~/virtualenv/iydp/3.11/bin/python scripts/backup_db.py
```
Skript bazanı və yeni şəkilləri `../iydp-backups` qovluğuna yazır, bazanın 14 gündən köhnə
nüsxələrini silir. Cron üçün email ünvanı qoyun ki, xəta olanda xəbər tutasınız.

**Vacib:** bu nüsxələr eyni serverdədir. Hostinq hesabı itsə, onlar da itər. Həftədə bir dəfə
ən son nüsxəni serverdən kənara endirin və kənar nüsxəni şifrəli yerdə saxlayın, içində üzv
məlumatları var.

**Bərpa:**
1. Setup Python App → **Stop**.
2. `gunzip -c ../iydp-backups/iydp-TARİX.db.gz > instance/iydp.db`
3. `rm -f instance/iydp.db-wal instance/iydp.db-shm`
4. Setup Python App → **Start**.

---

## Təhlükəsizlik — nəyi mütləq etməlisiniz

- [ ] `SECRET_KEY`-i `.env`/hosting environment-də təyin edin (yuxarıya baxın).
- [ ] `ADMIN_PASSWORD`-u uzun seçin, ilk girişdən sonra environment-dən silin.
- [ ] HTTPS-i aktivləşdirin (cPanel: AutoSSL).
- [ ] `SESSION_COOKIE_SECURE=1` qalsın (default belədir) — bu, sessiya cookie-sinin
      yalnız HTTPS üzərində göndərilməsini təmin edir. Yalnız lokal HTTP test üçün 0 edin.
- [ ] `FLASK_DEBUG` heç vaxt production-da `1` olmasın (default `0`-dır, dəyişməyin).

Artıq kodda hazır olan qorunma: CSRF token (bütün formalarda və API sorğularında),
login/qeydiyyat üçün rate-limit (brute-force qorunması), parolların hash-lənməsi,
sessiya cookie-lərinin HttpOnly+SameSite ilə qorunması.

**Qeyd:** Rate-limit hazırda proses-daxili yaddaşda saxlanılır (Flask-Limiter). Passenger
bir neçə proses işlədirsə, limit effektiv olaraq o qədər dəfə artmış olar (hər proses öz
sayğacını saxlayır). Kiçik/orta trafik üçün bu
qəbul edilə bilər; böyük tətbiq üçün Redis-based storage (`Limiter(storage_uri=...)`)
əlavə edilməlidir.

---

## Layihənin strukturu (qısa)
- `app.py` — bütün marşrutlar (admin panel, member/VIP JSON API, public JSON API,
  SPA-ya yönləndirən route-lar)
- `models.py` — verilənlər bazası modelləri
- `services/vip.py`, `services/checkin.py` — VIP ödəniş və QR check-in məntiqi (QR hər üzvdə var)
- `services/uploads.py` — admin paneldən yüklənən şəkillərin yoxlanması, kiçildilməsi
  (WebP) və silinməsi
- `templates/admin/` — bütün admin panel (`/admin/*`)
- `src/` — React tətbiqi: `/`, `/projects` (+ `/projects/finished`, `/projects/:id`), `/events` (+ `/events/:id`), `/news`
  (+ `/news/:id`), `/contact`, `/login`, `/register`, `/account` (Hesabım + VIP
  kart), `/faq`, `/stories` (+ `/stories/:slug`), `/erasmus`. Bu səhifələr real `/api/*` endpoint-lərindən
  (admin panel-dən idarə olunan) data çəkir. `npm run build` ilə `dist/`-ə yığılır,
  Flask onu serve edir.

**Tədbir qeydiyyatı:** admin hər tədbir üçün Events → tədbir → **Form** bölməsində sualları
yaradır, forma olmayan tədbirə müraciət etmək olmur. Üzvün müraciəti gözləmədə qalır, yeri yalnız
adminin təsdiqi tutur. Qərardan sonra üzv "Hesabım"da bildiriş görür, `MAIL_*` dəyərləri `.env`-də
doludursa email də alır. Formalı tədbirdə QR skaner təsdiqsiz üzvü dayandırır, amma admin
**Let in anyway** ilə buraxa bilər.

**Layihə forması:** Projects → layihə → **Form** bölməsində eyni üsulla suallar yaradılır. Sual
yoxdursa, üzv standart müraciət formasını görür. Qəbul və ya rədd qərarından üzvə bildiriş gedir.

**Üzv profili:** `/account/profile` səhifəsində üzv təhsil, təcrübə, dil və digər
məlumatlarını doldurur. Admin onları üzvün səhifəsində görür. Layihə formasında
**Require a complete profile** açıqdırsa, profil tamamlanmadan müraciət etmək olmur.

**Stories:** iştirakçıların Erasmus+/ESC təcrübələri admin paneldə **Stories**
bölməsindən idarə olunur (başlıq, profil fotosu, ad, qısa məlumat, mətn, layihə
şəkilləri). Köhnə bloq bölməsi silinib. Homepage-in Projects, Stories və News bölmələri real datadır,
boş olanda görünmür.
