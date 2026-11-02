# Yükləmə təlimatı

İki yol var: **cPanel** (öz hostinginiz) və ya **Render** (sürətli, canlı link üçün).
Hər ikisi eyni `app.py`-ni işə salır — React tətbiqi (`src/`) build olunub Flask
tərəfindən serve edilir, `/admin/*` isə ayrıca server-rendered admin paneldir.

---

## A) cPanel

### 1. Faylları yükləyin
Bu qovluğu (aşağıdakılar **istisna olmaqla**) cPanel-də tətbiqin kök qovluğuna yükləyin:
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

## B) Render.com (sürətli canlı link üçün)

1. Kodu GitHub-a push edin.
2. render.com → **New → Web Service** → repo-nu seçin.
3. Ayarlar:
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt && npm install && npm run build`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT` (bu `Procfile`-da
     artıq yazılıb, Render onu avtomatik oxuyacaq — amma "Start Command" sahəsini əl ilə
     dolduracaqsınızsa, mütləq `--bind 0.0.0.0:$PORT` hissəsini daxil edin, əks halda
     Render tətbiqi "port tapılmadı" xətası ilə deploy-u uğursuz sayacaq)
4. **Environment** bölməsində əlavə edin: `SECRET_KEY` (uzun təsadüfi sətir).
5. Environment-ə `ADMIN_PASSWORD` də əlavə edin, deploy edin, sonra onu silin.

**Vacib məhdudiyyət:** Render-in pulsuz "Web Service" planında disk **müvəqqətidir** —
hər redeploy/restart-da SQLite bazası sıfırlanır (bütün üzvlər, ödənişlər, iştirak
qeydləri itir). Demo/sınaq üçün problem deyil, amma real istifadəçilər üçün **Render-in
pulsuz PostgreSQL** əlavəsini qoşun:
1. Render-də **New → PostgreSQL** yaradın (pulsuz tier var).
2. Verdiyi "Internal Database URL"-i kopyalayın.
3. Web Service-in Environment bölməsinə əlavə edin: `DATABASE_URL=<həmin URL>`.
4. `requirements.txt`-ə `psycopg2-binary` əlavə edib yenidən deploy edin (bu paket
   defolt olaraq daxil edilməyib, çünki bəzi Python versiyalarında əlavə build
   addımı tələb edir).

**Yüklənən şəkillər də eyni problemlə üzləşir.** Admin paneldən yüklənən bütün şəkillər
(story, layihə posterləri və qalereyaları, tədbir posterləri) `static/uploads/` qovluğunda saxlanılır. Render-in
pulsuz planında bu qovluq da hər redeploy-da silinir. Real istifadə üçün Render-də
**Persistent Disk** qoşun və onu `static/uploads` yoluna bağlayın (və ya cPanel
istifadə edin, orada fayllar qalıcıdır). Bu qovluq `.gitignore`-dadır, git-ə düşmür,
ona görə serveri köçürəndə onu ayrıca kopyalayın.

---

## Təhlükəsizlik — nəyi mütləq etməlisiniz

- [ ] `SECRET_KEY`-i `.env`/hosting environment-də təyin edin (yuxarıya baxın).
- [ ] `ADMIN_PASSWORD`-u uzun seçin, ilk girişdən sonra environment-dən silin.
- [ ] HTTPS-i aktivləşdirin (cPanel: AutoSSL; Render: avtomatik).
- [ ] `SESSION_COOKIE_SECURE=1` qalsın (default belədir) — bu, sessiya cookie-sinin
      yalnız HTTPS üzərində göndərilməsini təmin edir. Yalnız lokal HTTP test üçün 0 edin.
- [ ] `FLASK_DEBUG` heç vaxt production-da `1` olmasın (default `0`-dır, dəyişməyin).

Artıq kodda hazır olan qorunma: CSRF token (bütün formalarda və API sorğularında),
login/qeydiyyat üçün rate-limit (brute-force qorunması), parolların hash-lənməsi,
sessiya cookie-lərinin HttpOnly+SameSite ilə qorunması.

**Qeyd:** Rate-limit hazırda proses-daxili yaddaşda saxlanılır (Flask-Limiter). Əgər
gələcəkdə gunicorn-u bir neçə worker (`--workers N`) ilə işə salsanız, limit effektiv
olaraq N dəfə artmış olar (hər worker öz sayğacını saxlayır). Kiçik/orta trafik üçün bu
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

**Stories:** iştirakçıların Erasmus+/ESC təcrübələri admin paneldə **Stories**
bölməsindən idarə olunur (başlıq, profil fotosu, ad, qısa məlumat, mətn, layihə
şəkilləri). Köhnə bloq bölməsi silinib. Homepage-in Projects, Stories və News bölmələri real datadır,
boş olanda görünmür.
