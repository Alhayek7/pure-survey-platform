# 📊 PURE Survey Platform

> منصة استبيانات متكاملة مع نظام أدوار (Admin, Researcher, User)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14.x-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Team](https://img.shields.io/badge/team-3_members-orange.svg)

---

## 📖 **نبذة عن المشروع**

**PURE Survey Platform** هي منصة متكاملة لإدارة الاستبيانات والمسوح، تم تطويرها لتلبية احتياجات الباحثين والمؤسسات. توفر المنصة واجهة سهلة الاستخدام مع نظام أدوار متكامل يضمن التحكم الكامل في الصلاحيات.

### ✨ **المميزات الرئيسية**

- ✅ **نظام أدوار متكامل**: Admin، Researcher، User
- ✅ **إنشاء وإدارة الاستبيانات**: واجهة سهلة لإنشاء الاستبيانات
- ✅ **جمع الردود**: نظام متكامل لجمع وتحليل الردود
- ✅ **تصدير البيانات**: دعم تصدير النتائج بصيغة Excel
- ✅ **توثيق API**: واجهة Swagger لتجربة الـ API
- ✅ **سجلات الأخطاء**: نظام تسجيل متكامل باستخدام Winston
- ✅ **حماية متقدمة**: Helmet، CORS، تقييد الطلبات، التحقق من الصلاحيات

---

## 👥 **فريق العمل**

نفخر بتقديم فريقنا المتميز الذي ساهم في إنجاز هذا المشروع:

|  | الاسم | الدور | التخصص |
|--|------|------|--------|
| <img src="https://img.icons8.com/color/48/000000/administrator-male.png" width="30"> | **أحمد الحايك** | قائد الفريق / Full-Stack Developer | Node.js, Express, PostgreSQL |
| <img src="https://img.icons8.com/color/48/000000/engineer.png" width="30"> | **المهندسة رغد السرحي** | Backend Developer | API Development, Database Design |
| <img src="https://img.icons8.com/color/48/000000/engineer.png" width="30"> | **المهندسة زينة** | Frontend Developer | UI/UX, HTML, CSS, JavaScript |

> 🤝 **شكر خاص**: لكل أعضاء الفريق على تفانيهم وإبداعهم في إنجاز هذا العمل المتميز.

---

## 🛠️ **التقنيات المستخدمة**

| الطبقة | التقنية |
|--------|---------|
| **Backend** | Node.js, Express.js |
| **قاعدة البيانات** | PostgreSQL |
| **ORM** | Sequelize |
| **المصادقة** | JWT (صلاحية 24 ساعة) |
| **تشفير كلمات المرور** | bcrypt (قوة 10) |
| **Frontend** | HTML, CSS, JavaScript + Tailwind CDN |
| **تصدير البيانات** | ExcelJS (.xlsx) |
| **الأمان** | Helmet, CORS, Rate Limiting |
| **التوثيق** | Swagger UI (`/api-docs`) |

---

## 🚀 **بدء التشغيل السريع**

### المتطلبات الأساسية

- Node.js (v18 أو أحدث)
- PostgreSQL (v14 أو أحدث)
- npm أو yarn

### خطوات التثبيت

#### 1. **استنساخ المشروع**

```bash
git clone https://github.com/Alhayek7/pure-survey-platform.git
cd pure-survey-platform
```

#### 2. **إعداد Backend**

```bash
cd backend
cp .env.example .env
npm install
```

#### 3. **تهيئة قاعدة البيانات**

```bash
npm run db:setup
```

#### 4. **تشغيل الخادم**

```bash
npm start
```

#### 5. **تشغيل Frontend** (في نافذة أخرى)

```bash
cd frontend
npx serve . -l 8000
```

#### 6. **فتح التطبيق**

- **واجهة المستخدم**: `http://localhost:8000`
- **فحص صحة الخادم**: `http://localhost:3000/health`
- **توثيق API**: `http://localhost:3000/api-docs`

---

## 👥 **نظام الأدوار والصلاحيات**

| الدور | الصلاحيات |
|-------|-----------|
| **Admin** | صلاحية كاملة على جميع الاستبيانات، المستخدمين، الردود، والتصدير |
| **Researcher** | إدارة الاستبيانات الخاصة والردود المرتبطة بها |
| **User** | الإجابة على الاستبيانات المنشورة وعرض ردودهم الخاصة |

---

## 🔑 **المستخدم الافتراضي**

بعد تنفيذ `npm run db:setup`، يتم إنشاء مستخدم Admin افتراضي:

- **البريد الإلكتروني**: `admin@example.com`
- **كلمة المرور**: `admin123`

> ⚠️ **تنبيه**: يُرجى تغيير كلمة المرور فوراً قبل الاستخدام الفعلي!

---

## 📡 **واجهات API الرئيسية**

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| `POST` | `/api/v1/auth/register` | تسجيل مستخدم جديد |
| `POST` | `/api/v1/auth/login` | تسجيل الدخول |
| `GET` | `/api/v1/auth/me` | عرض معلومات المستخدم |
| `POST` | `/api/v1/surveys` | إنشاء استبيان جديد |
| `GET` | `/api/v1/surveys/public` | عرض الاستبيانات المنشورة |
| `POST` | `/api/v1/responses` | إرسال رد على استبيان |
| `GET` | `/api/v1/responses/survey/:id` | عرض ردود استبيان معين |
| `GET` | `/api/v1/export/survey/:id` | تصدير نتائج استبيان بصيغة Excel |
| `GET` | `/api/v1/users` | عرض قائمة المستخدمين (للمدير) |

> 📚 **للتوثيق الكامل**: راجع `/api-docs` بعد تشغيل الخادم.

---

## 📂 **هيكل المشروع**

```
pure-survey-platform/
├── backend/
│   ├── src/
│   │   ├── config/         # إعدادات التطبيق
│   │   ├── models/         # نماذج قاعدة البيانات
│   │   ├── middleware/     # البرمجيات الوسيطة
│   │   ├── controllers/    # منطق التحكم
│   │   ├── services/       # طبقة الخدمات
│   │   ├── routes/         # مسارات API
│   │   ├── validators/     # التحقق من البيانات
│   │   ├── seeders/        # بيانات أولية
│   │   └── utils/          # دوال مساعدة
│   ├── uploads/            # الملفات المرفوعة
│   ├── tests/              # اختبارات
│   └── package.json
├── frontend/
│   ├── css/                # ملفات التنسيق
│   ├── js/                 # ملفات JavaScript
│   └── *.html              # صفحات التطبيق
├── README.md
├── INSTALLATION.md
└── LICENSE
```

---

## 🤝 **المساهمة في المشروع**

نرحب بمساهماتكم! يُرجى اتباع الخطوات التالية:

1. عمل **Fork** للمشروع
2. إنشاء فرع جديد (`git checkout -b feature/AmazingFeature`)
3. إجراء التغييرات المطلوبة
4. رفع التغييرات (`git push origin feature/AmazingFeature`)
5. فتح **Pull Request**

---

## 📝 **الترخيص**

هذا المشروع مرخص تحت رخصة **MIT** - راجع ملف [LICENSE](LICENSE) للتفاصيل.

---

## 📧 **جهات الاتصال**

| الاسم | الدور | GitHub |
|-------|-------|--------|
| **أحمد الحييك** | قائد الفريق | [Alhayek7](https://github.com/Alhayek7) |
| **رغد السرحي** | Backend Developer | [رابط GitHub] |
| **زينة** | Frontend Developer | [رابط GitHub] |

- **رابط المشروع**: [https://github.com/Alhayek7/pure-survey-platform](https://github.com/Alhayek7/pure-survey-platform)

---

## 🙏 **شكر وتقدير**

نقدم جزيل الشكر لكل أعضاء الفريق على جهودهم المخلصة:

- **المهندس رغد السرحي** - على إتقانه في تطوير الـ Backend وقاعدة البيانات
- **المهندسة زينة** - على إبداعها في تصميم واجهة المستخدم وتجربة المستخدم
- **أحمد الحييك** - على قيادة الفريق والتكامل بين المكونات

شكر خاص لكل من ساهم في تطوير هذه المنصة وجعلها أداة مفيدة للباحثين والمؤسسات.

---

<div align="center">

**⭐ لا تنسَ منح المشروع نجمة على GitHub إذا أعجبك! ⭐**

</div>

---

