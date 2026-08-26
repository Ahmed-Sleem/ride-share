# RIDE SHARE — COMPLETE COPY, SCREENS & DESIGN ASSETS INVENTORY

> **For UI/UX Designers, Product Architects & Demo Creators**  
> This document contains **every single screen, section, headline, paragraph, button label, form field, error message, FAQ item, policy text, and micro-copy** currently in the production system across both **English** and **Arabic (RTL)**.
> Everything is 100% extracted from the single source of truth (`apps/web/src/data/content.js` and `packages/brand/brand.json`).

---

## 1. Brand Identity, Typography & Metadata

| Attribute | English (EN) | Arabic (AR) |
|---|---|---|
| **Product Name** | Ride Share | رايد شير |
| **Tagline** | Share the ride. One fixed price. | شارك الرحلة. سعر ثابت. |
| **Full Description** | Shared rides on fixed routes at a fixed price. | خدمة نقل تشاركي على مسارات ثابتة وبسعر ثابت. |
| **App Version** | v0.1.0 (Build 3) | v0.1.0 (إصدار 3) |
| **Font Family** | -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Arabic", sans-serif | -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Arabic", sans-serif |

---

## 2. Marketing Website & Landing Pages

### 2.1 Navigation Bar (Top Bar)
- **Brand Wordmark**: `Ride Share` / `رايد شير`
- **Nav Links**:
  - `navRide`: EN: `Ride` | AR: `الركوب`
  - `navDrive`: EN: `Drive` | AR: `القيادة`
  - `navAbout`: EN: `About` | AR: `عنّا`
  - `navHelp`: EN: `Help` | AR: `مساعدة`
  - `navDownload`: EN: `Get the app` | AR: `حمّل التطبيق`
- **Actions**:
  - Language Toggle: `Language` / `اللغة`
  - Theme Toggle: `Appearance` (`Switch to light` / `Switch to dark`)
  - Log In: `Log in` / `دخول`
  - Sign Up: `Sign up` / `اشترك`

### 2.2 Rider Landing Page (Front Door)

#### Hero Section
- **Main Headline (`landingHero`)**:
  - EN: `Fixed routes. One price. Your seat, booked.`
  - AR: `مسارات ثابتة. سعر واحد. مقعدك محجوز.`
- **Sub-headline (`landingHeroSub`)**:
  - EN: `A shared ride you can plan around — published stops, published times, a flat fare per route, and a seat you booked before you left home. Built for any city, one corridor at a time.`
  - AR: `ركوبة مشتركة تقدر تخطط عليها — محطات منشورة، مواعيد منشورة، أجرة ثابتة لكل مسار، ومقعد حجزته قبل ما تخرج من البيت. مصممة لأي مدينة، مسار بعد مسار.`
- **Primary Call to Action (`landingCtaStart`)**: EN: `Create account` | AR: `أنشئ حسابًا`
- **Secondary Call to Action (`landingCtaSignIn`)**: EN: `Sign in` | AR: `تسجيل الدخول`
- **Tertiary Call to Action (`navDownload`)**: EN: `Get the app` | AR: `حمّل التطبيق`

#### Parallax Stacking Panels (Value Proposition)
- **Kick Line (`panelKick`)**: EN: `Why it feels different` | AR: `لماذا يبدو الأمر مختلفًا`
1. **Chapter 1: The Seat**
   - Title (`panel1T`): EN: `Your seat, before you leave` | AR: `مقعدك قبل أن تغادر`
   - Body (`panel1B`): EN: `Published routes, published times. You know when it leaves and that there's a seat.` | AR: `مسارات منشورة ومواعيد منشورة. تعرف متى تنطلق وأن هناك مقعداً.`
2. **Chapter 2: The Price**
   - Title (`panel2T`): EN: `One fare, no surprises` | AR: `أجرة واحدة بلا مفاجآت`
   - Body (`panel2B`): EN: `The route's flat price is locked the moment you book. No surge, ever.` | AR: `سعر المسار الثابت يُثبَّت لحظة الحجز. لا زيادة مفاجئة أبدًا.`
3. **Chapter 3: The Boarding**
   - Title (`panel3T`): EN: `Board in seconds` | AR: `اركب في ثوانٍ`
   - Body (`panel3B`): EN: `Show your code at the door and ride. The number is always on screen — no battery anxiety.` | AR: `اعرض الكود عند الباب واركب. الرقم ظاهر دائمًا على الشاشة — بلا قلق على البطارية.`
4. **Chapter 4: The Network**
   - Title (`panel4T`): EN: `Get off anywhere` | AR: `انزل في أي مكان`
   - Body (`panel4B`): EN: `Alight anywhere along the route. You're never tied to a stop you don't need.` | AR: `انزل في أي نقطة على المسار. لست مقيدًا بمحطة لا تحتاجها.`

#### Feature Cards Grid
- **Feature 1 (`landingF1T`/`B`)**:
  - EN: **One fixed price**: No surge, no surprises. The fare is the fare.
  - AR: **سعر ثابت واحد**: لا زيادة مفاجئة ولا مفاجآت. الأجرة هي الأجرة.
- **Feature 2 (`featureScheduleT`/`B`)**:
  - EN: **Schedule ahead**: Book a departure for later — same fixed fare, your seat held.
  - AR: **احجز مسبقًا**: احجز موعدًا لوقت لاحق — نفس الأجرة الثابتة ومقعدك محجوز.
- **Feature 3 (`featureCashT`/`B`)**:
  - EN: **Pay cash at the door**: No card needed. Pay the driver the fixed fare when you board.
  - AR: **ادفع كاش عند الباب**: لا حاجة لبطاقة. ادفع للسائق الأجرة الثابتة عند الركوب.
- **Feature 4 (`landingF4T`/`B`)**:
  - EN: **Track your ride live**: See your vehicle on the map and know exactly when it arrives.
  - AR: **تتبع رحلتك مباشرة**: شاهد مركبتك على الخريطة واعرف موعد وصولها بدقة.
- **Feature 5 (`landingF3T`/`B`)**:
  - EN: **Save on every ride**: Fixed routes cost a fraction of ride-hailing. You keep the difference.
  - AR: **وفّر في كل رحلة**: المسارات الثابتة تكلف جزءًا بسيطًا من تطبيقات الركوب — الفرق يبقى لك.
- **Feature 6 (`safetyF1T`/`B`)**:
  - EN: **Verified drivers**: Every driver is screened and every vehicle approved before a first ride.
  - AR: **سائقون موثّقون**: كل سائق يخضع للفحص وكل مركبة تُعتمد قبل الرحلة الأولى.
- **Feature 7 (`safetyF3T`/`B`)**:
  - EN: **Help within reach**: SOS and live ride sharing arrive with the safety centre.
  - AR: **المساعدة في متناولك**: الاستغاثة ومشاركة الرحلة المباشرة تأتيان مع مركز الأمان.

#### How It Works (3 Steps)
- **Section Title (`landingHowTitle`)**: EN: `How it works` | AR: `كيف تعمل`
- **Step 1 (`landingHow1T`/`B`)**: EN: `Pick a route — Browse published routes and stops near you.` | AR: `اختر المسار — تصفح المسارات والمحطات القريبة منك.`
- **Step 2 (`landingHow2T`/`B`)**: EN: `Book a seat — Choose a departure and pay one fixed fare.` | AR: `احجز مقعدًا — اختر موعد القيام وادفع أجرة ثابتة واحدة.`
- **Step 3 (`landingHow3T`/`B`)**: EN: `Board by code — Show your boarding code at the stop and ride.` | AR: `اركب بالكود — اعرض كود الركوب عند المحطة واركب.`

#### Landing Footer & Policies
- **Footer Note (`landingFoot`)**: EN: `Shared rides, fixed routes, one price.` | AR: `ركوبات مشتركة، مسارات ثابتة، سعر واحد.`
- **Policy Links**: `Terms` / `الشروط`, `Privacy` / `الخصوصية`, `undefined` / `undefined`

### 2.3 Driver Landing Page (`driveLanding`)
- **Headline (`driveHero`)**: EN: `undefined` | AR: `undefined`
- **Sub-headline (`driveHeroSub`)**: EN: `undefined` | AR: `undefined`
- **CTA (`driveCtaStart`)**: EN: `undefined` | AR: `undefined`
- **Features**:
  1. EN: **undefined**: undefined | AR: **undefined**: undefined
  2. EN: **undefined**: undefined | AR: **undefined**: undefined
  3. EN: **undefined**: undefined | AR: **undefined**: undefined
  4. EN: **undefined**: undefined | AR: **undefined**: undefined
- **Requirements Title (`driveReqTitle`)**: EN: `undefined` | AR: `undefined`
- **Requirements Items (`driveReqs`)**:

### 2.4 About Page (`aboutLanding`)
- **Kick (`aboutKick`)**: EN: `About` | AR: `عنّا`
- **Title (`aboutTitle`)**: EN: `The middle ground between the microbus and ride-hailing.` | AR: `الحلّ الوسط بين الميكروباص وخدمات الركوب.`
- **Sub (`aboutSub`)**: EN: `undefined` | AR: `undefined`
- **Story Chapters (`aboutStory`)**:

### 2.5 Help & FAQ Page (`helpLanding`)
- **Kick (`helpKick`)**: EN: `Help` | AR: `مساعدة`
- **Title (`helpTitle`)**: EN: `How can we help?` | AR: `كيف نساعدك؟`
- **FAQ Items (`helpItems`)**:
  - **Q: How do I book a ride?**
    - EN: Create an account, pick a route, choose a boarding stop and a departure, then confirm. You'll get a boarding code.
    - **س: كيف أحجز رحلة؟**
    - AR: أنشئ حسابًا، اختر مسارًا، اختر محطة الركوب وموعد القيام، ثم أكّد. ستحصل على كود ركوب.
  - **Q: How do I pay?**
    - EN: One flat fare per route. Pay from your wallet, or in cash to the driver when you board.
    - **س: كيف أدفع؟**
    - AR: أجرة ثابتة واحدة لكل مسار. ادفع من محفظتك أو نقدًا للسائق عند الركوب.
  - **Q: Can I cancel?**
    - EN: Yes, from your trips. Cancelling returns your seats to the departure.
    - **س: هل يمكنني الإلغاء؟**
    - AR: نعم، من رحلاتك. الإلغاء يعيد مقاعدك إلى الموعد.
  - **Q: How do I become a driver?**
    - EN: Create a rider account, then apply to drive with your documents. Once approved, claim a departure and start.
    - **س: كيف أصبح سائقًا؟**
    - AR: أنشئ حساب راكب ثم قدّم للقيادة بمستنداتك. بعد الاعتماد، احجز موعدًا وابدأ.
  - **Q: Where is the service available?**
    - EN: On the published corridors. New cities and corridors are added as they are mapped and verified.
    - **س: أين تتوفر الخدمة؟**
    - AR: على الممرات المنشورة. تُضاف المدن والممرات الجديدة فور رسمها والتحقق منها.
  - **Q: How do I reach support?**
    - EN: From Help in the app — by phone or in-app. SOS is one tap from any ride screen.
    - **س: كيف أتواصل مع الدعم؟**
    - AR: من «مساعدة» داخل التطبيق — هاتفيًا أو من داخل التطبيق. زر الاستغاثة على بُعد نقرة من أي شاشة رحلة.

### 2.6 Download App Page (`downloadLanding`)
- **Title (`j_dlTitle`)**: EN: `Get the app` | AR: `حمّل التطبيق`
- **Sub (`j_dlSub`)**: EN: `Install the Android app. The same account works on the website.` | AR: `ثبّت تطبيق أندرويد. نفس الحساب يعمل على الموقع.`
- **Android Download Button (`j_dlAndroid`)**: EN: `Download Android APK` | AR: `تنزيل APK لأندرويد`
- **QR Code Scan Label (`j_dlQr`)**: EN: `Scan to download` | AR: `امسح للتنزيل`
- **iOS Card (`j_dlIos` / `j_dlIosSoon`)**: EN: `iPhone — Coming soon — stay tuned.` | AR: `آيفون — قريباً — ترقّب.`

### 2.7 Policy Documents (Terms, Privacy, Safety)
- **Template Note (`policyTemplateNote`)**: EN: `This is a template — the final legal wording is provided by the operator's legal team. The product only collects what it needs to run the ride.` | AR: `هذه صفحة نموذجية — الصياغة القانونية النهائية يقدّمها الفريق القانوني للمشغّل. المنتج لا يجمع أكثر مما يحتاجه لتشغيل الرحلة.`
- **Terms of Service (`policyTermsTitle`)**:
  - **The service** (الخدمة): Ride Share runs shared rides on fixed routes at a fixed price. A rider boards at a published stop and may get off anywhere along the route.
  - **Your account** (حسابك): One email equals one account. Keep your details accurate and your credentials private. Staff accounts are created by the operator's administrator.
  - **Booking & fares** (الحجز والأجرة): The fare is the route's flat price and is locked the moment you book. Seats are limited; a cancelled booking returns its seats to the departure.
  - **Boarding** (الركوب): Show your boarding code at the door. It is single-use and tied to your booking and this departure.
  - **Rider conduct** (سلوك الراكب): Respect the driver and other riders. Keep the vehicle clean and do not carry items that are illegal or dangerous.
  - **Driver conduct** (سلوك السائق): Drivers are approved by the operator and run the published departure. They must follow traffic law and the route's published schedule.
  - **Payments & refunds** (الدفع والاسترداد): Pay the locked fare in cash at boarding or from your wallet when that option is on. Refunds return as wallet credit. Contact support if a receipt looks wrong.
  - **Changes & contact** (التعديلات والتواصل): These terms may be updated; the version published here is the one that applies. Reach us through Help for questions or complaints.
- **Privacy Policy (`policyPrivacyTitle`)**:
  - **What we collect** (ما نجمعه): Account details, your bookings, your boarding and alighting stops, and — when you allow it — your device location.
  - **Why we collect it** (لماذا نجمعه): To run your ride, board you at the right stop, keep the service safe, and settle payments correctly.
  - **What we never do** (ما لا نفعله أبدًا): We do not sell your personal data. It is used to operate the service and nothing else.
  - **Who we share with** (من نشارك معه): The driver sees only what your trip needs: your first name, boarding stop and seat count. Authorities receive data only when the law requires it.
  - **Keeping & your rights** (الاحتفاظ وحقوقك): Data is kept to operate and audit the service. You may request access, correction or deletion of your account and its data.
  - **Security & contact** (الأمان والتواصل): Access is limited and logged. For privacy questions, contact us through Help.
- **Safety Policy (`policySafetyTitle`)**:
  - **Our commitment** (التزامنا): Safety is designed in: verified drivers, approved vehicles, and boarding by code.
  - **Driver & vehicle checks** (فحص السائق والمركبة): Every driver's documents and every vehicle are checked and approved before a first trip.
  - **Board by code** (الركوب بالكود): Your boarding code proves the right rider is on the right ride. Check the vehicle plate before you board.
  - **In an emergency** (في الطوارئ): SOS is one tap away from any ride screen and shares your location with help.
  - **Report a problem** (الإبلاغ عن مشكلة): Every report is reviewed. Severe issues are acted on immediately and reported back to you.
  - **Good habits** (عادات جيدة): Wait in a safe, visible spot and stay on the pavement until your vehicle stops.

---

## 3. Mobile App Onboarding Intro Slides (`introView`)

1. **Slide 1: Ride Share**
   - Kick (`j_intro1K`): EN: `Ride Share` | AR: `رايد شير`
   - Title (`j_intro1T`): EN: `Shared rides. One fixed price.` | AR: `ركوبات مشتركة. سعر ثابت واحد.`
   - Body (`j_intro1B`): EN: `Book a seat on a planned route. You know the fare before you go — no surge, no guessing.` | AR: `احجز مقعداً على مسار معلن. تعرف الأجرة قبل أن تتحرك — بلا زيادة مفاجئة.`
2. **Slide 2: Find a Route**
   - Kick (`j_intro2K`): EN: `Find a ride` | AR: `ابحث عن رحلة`
   - Title (`j_intro2T`): EN: `Search where you are going.` | AR: `ابحث عن وجهتك.`
   - Body (`j_intro2B`): EN: `Pick start and end. See the next departures and the price. Choose a time that fits.` | AR: `اختر البداية والنهاية. شاهد المواعيد التالية والسعر. اختر الوقت المناسب.`
3. **Slide 3: Board & Travel**
   - Kick (`j_intro3K`): EN: `Travel` | AR: `السفر`
   - Title (`j_intro3T`): EN: `Show your ticket and ride.` | AR: `اعرض تذكرتك واركب.`
   - Body (`j_intro3B`): EN: `Pay in the app. Board with your code. Track the trip. That is the whole loop.` | AR: `ادفع في التطبيق. اركب بالكود. تتبع الرحلة. هذه الدورة كاملة.`
4. **Slide 4: Drive & Earn**
   - Kick (`j_intro4K`): EN: `Drive` | AR: `القيادة`
   - Title (`j_intro4T`): EN: `Start Driving & Get Paid` | AR: `ابدأ القيادة واحصل على أجرك`
   - Body (`j_intro4B`): EN: `Your rider account is for booking seats. To drive, you will need a separate Driver Account.` | AR: `حساب الراكب لحجز المقاعد. للقيادة تحتاج حساب سائق منفصل.`
   - CTA (`j_intro4C`): EN: `Create your Driver Account to start driving and earning today.` | AR: `أنشئ حساب السائق لتبدأ القيادة والكسب اليوم.`
- **Controls**: Skip (`j_introSkip`), Prev (`j_introPrev`), Next (`j_introNext`), Start (`j_introStart`).

---

## 4. Authentication & Account Creation (`auth.js`)

- **Tabs**: Sign In (`signin`) / Create Account (`signup`)
- **Role Choice Cards (for Signup)**:
  - **Rider Card**: Title: `Rider` / `راكب` — Sub: `undefined` / `undefined`
  - **Driver Card**: Title: `Driver` / `سائق` — Sub: `undefined` / `undefined`
- **Input Fields & Labels**:
  - Email or Phone: `undefined` / `undefined` (Hint: `undefined` / `undefined`)
  - Password: `undefined` / `undefined` (Min 8 chars: `undefined` / `undefined`)
  - Full Name: `Your name` / `اسمك` (Hint: `Drivers see your first name only.` / `السائق يرى الاسم الأول فقط.`)
  - OTP Code 6-Digit Box: `Enter the code` / `أدخل الكود` (Sent to: `Sent to`)
  - Resend Code: `Resend code` / `إعادة إرسال الكود` (Countdown: `Resend in {seconds}s`)
  - Forgot Password Link: `undefined` / `undefined`
  - Set New Password: `New password` / `كلمة المرور الجديدة`
  - Action Buttons: Continue (`continue`), Create Account (`createAccount`), Sign In (`signIn`), Back to Sign In (`backToSignIn`).

---

## 5. Rider App Screens (`rider.js`)

### 5.1 Rider Home (`riderHome`)
- **Greeting**: `Good morning` / `صباح الخير`
- **Search Hint Band**: `Where do you want to go?` / `إلى أين تريد الذهاب؟`
- **Active Trip Card (if in-ride/booked)**:
  - Title: `Your ride` / `رحلتك`
  - Buttons: Show Boarding Code (`showQr`), Track Vehicle (`trackVehicle`), SOS (`sos`)
- **Nearby Routes Section**: `Routes near you` / `مسارات قريبة منك`
  - Route Card: Line Name (`routeline`), Frequency/Interval (`every` / `everyAr`), Time Window (`window`), Locked Flat Fare (`fixedPrice` + `{fare} EGP`).
- **Subscriptions Banner**: `Subscriptions` — `Ride the same route every day for less.` (Button: `Buy subscription`)

### 5.2 Routes Search & Filtering (`riderRoutes`)
- **Search Input**: `Search routes and stops` / `ابحث عن مسار أو محطة`
- **Empty State**: `No routes or stops match — try another name in English or Arabic.` / `لا توجد مسارات أو محطات مطابقة — جرّب اسمًا آخر بالإنجليزية أو العربية.`
- **Coming Soon State**: `Routes are being mapped for your city. Search will show real routes and stops here once the network opens.` / `جارٍ رسم المسارات لمدينتك. سيظهر البحث مسارات ومحطات حقيقية هنا فور فتح الشبكة.`

### 5.3 Boarding Stop Selector (`riderBoarding`)
- **Title**: `Where will you board?` / `من أين ستركب؟`
- **Stops List**: Numbered sequence (1..N), Stop Name, Walking Time (`{n} min walk` / `{n} دقيقة مشي`), Recommended Badge (`recommended`).
- **Street Pickup Option**: `Street pickup` — `We collect you from the roadside near you.`

### 5.4 Departure Picker (`riderDepartures`)
- **Title**: `Pick a departure` / `اختر موعد القيام`
- **Slot Cards**: Departure time, Arrival estimate (`arrives`), Vehicle plate/model/rating, Driver name, Seats remaining (`{n} seats left` / `باقي {n} مقاعد`).

### 5.5 Booking Review & Payment Selection (`riderReview`)
- **Title**: `Confirm booking` / `تأكيد الحجز`
- **Summary**: Route name, Boarding stop, Departure time, Number of seats selector (`seats`: 1, 2, 3).
- **Total Fare**: `{fare} EGP` (`fixedPrice`)
- **Payment Method Choice (`w_choice`)**:
  - Wallet (`w_useWallet`): Current balance `{balance} EGP`. (Insufficient banner: `Not enough wallet balance for this fare.` + Button: `Top up`)
  - Cash (`w_payCash`): `Cash — pay the driver at boarding` / `كاش — ادفع للسائق عند الركوب`
- **Cancellation Terms**: `Free until 30 minutes before departure. After that, half the fare.` / `الإلغاء مجاني حتى ٣٠ دقيقة قبل اوب قبل الموعد بـ ٥ دقائق.`
- **Action Button**: `Confirm booking` / `تأكيد الحجز`

### 5.6 Booking Confirmation & Boarding Code (`riderBooked` / `QRPanel`)
- **Header**: `Booked` / `undefined` — `Be at your boarding point 5 minutes early.`
- **6-Digit Boarding Code**: Prominent numeric code (e.g. `842 190`) + QR Code SVG.
- **Instruction**: `Show this to the driver at the door.` / `اعرضه للسائق عند الباب.`
- **Action Buttons**: Track Ride (`trackVehicle`), Share Ride (`shareRide`), Cancel Booking (`cancelBooking`).

### 5.7 Waiting & In-Ride Live Screen (`riderWaiting` / `riderOnboard`)
- **Status**: ETA countdown (`arriving {n} min`), Next Stop indicator (`nextStop`).
- **Arrival Alarm**: `Your ride is arriving` / `رحلتك تصل الآن`
- **Alight Button**: `I'm getting off next` / `سأنزل في التالية` (Toast: `Driver notified you are getting off next`)
- **Emergency SOS**: `SOS` / `استغاثة`

### 5.8 Trip History (`riderTrips`)
- **Tabs**: Upcoming (`upcoming`) / Past (`past`)
- **Empty State**: `No trips yet` — `Booked rides appear here.`
- **Trip Card**: Route, Date/Time, Seats, Fare, Payment Status (`j_paidWallet` / `j_payAtDoor`), Rating prompt (`rateRide`).

### 5.9 Safety Center (`riderSafety`)
- **Header**: `Safety centre` / `مركز الأمان`
- **Share My Ride**: `Share trip status` — `A family member can open the link in any browser — no account.` (Button: `Create link` -> Generates shareable URL `https://.../?share=token`).
- **Silent SOS**: `SOS` — `Reach the on-call team with your location` (Warning: `This alerts a real person. Use it only if you need help now.` -> Button: `Send SOS` -> Confirmation: `Help was reached`)
- **Incident Reporting**: `Report a problem` — `A ticket is opened. We tell you the outcome.`
  - Categories: Assault (`j_cat_assault`), Harassment (`j_cat_harassment`), Dangerous Driving (`j_cat_dangerous_driving`), Discrimination (`j_cat_discrimination`), Theft (`j_cat_theft`), Vehicle Condition (`j_cat_vehicle_condition`), Punctuality (`j_cat_punctuality`), Other (`j_cat_other`).
  - Details Text Area (`j_reportBody`), Submit Button (`submit`), Success Toast (`j_reportOk`).
- **Emergency Contacts**: `Emergency contacts` / `جهات الطوارئ`

---

## 6. Driver App Screens (`driver.js`)

### 6.1 Shift Board & Duty Toggle (`driverDuty`)
- **Duty Switch**: Online (`goOnline` / `online`) vs Offline (`goOffline` / `offline`)
- **Cash to Settle Card**: `Cash to settle`: `{amount} EGP`
- **Today Summary**: Completed rides, Total earnings, Hours online.
- **Upcoming Claimed Departures**: List of slots claimed by driver.

### 6.2 Work & Slot Claims Board (`driverWork`)
- **Title**: `Find work` / `ابحث عن عمل`
- **Corridor Slots Grid**: Time slot, Route, Demand metric (`{n} riders searched this slot yesterday`), Claim Button (`claimSlot` -> `Claim this slot?` -> Badge: `Slot claimed` / `Yours`).
- **Release Claim**: `Release` / `إلغاء الحجز`

### 6.3 Active Journey & Live Manifest (`driverJourney`)
- **Journey Controls**: Start Trip (`j_startRide`), Arrived at Stop (`j_arrivedStop`), End Journey (`j_completeRide`), Abort Trip (`j_abortRide` with Reason `j_abortWhy`).
- **Schedule Slip Badge**: On Time (`onTime`) / Late (`late` - `{n} min behind schedule`).
- **Passenger Manifest Table (`j_manifest`)**:
  - Columns: Seat #, Rider Name, Boarding Stop, Alighting Stop, Status (Boarded `j_boarded` / Waiting `waiting`), Fare Method (Wallet / Cash).
  - Action: Scan Boarding Code Button (`scan` -> Opens Camera Scanner or 6-digit input `j_scanHint`).
  - Cash Collected Tap: `Cash collected` / `تم تحصيل النقدية`
  - Alighting Indicator: Highlighted row when rider sends `imGettingOff` signal.

### 6.4 Driver Earnings & Statements (`driverEarnings`)
- **Title**: `undefined` / `undefined`
- **Weekly Net Payout**: `{amount} EGP` (Next Payout Date: `Next payout`)
- **Breakdown**: Gross Fares + Claim Bonuses − Platform Commission − Cash Collected.
- **Payout History**: Date, Bank/Wallet Account, Status (`Transferred` / `Pending`).

---

## 7. Wallet & Payments Experience (`wallet.js`)

- **Current Balance Card**: `Wallet balance`: `{amount} EGP` (Top-up Button: `Top up`)
- **Paymob Top-up Bottom Sheet (`topupSheet`)**:
  - Title: `Top up` — Sub: `Add money to your wallet, then every booking is one tap.`
  - Quick Amount Pills: `50 EGP`, `100 EGP`, `200 EGP`, Custom (`w_custom`).
  - Card Payment Button: `Continue to card payment` (Status: `Opening secure payment…` / `Top-up started — finish the card payment in the tab that opens.`)
- **Ledger Transaction History (`w_history`)**:
  - Types: Top-up (`w_reason_topup`), Fare Paid (`w_reason_fare_paid_commission`), Cash Settlement (`w_reason_cash_collected_commission`), Refund (`w_reason_refund_credit`).
  - Empty State: `No activity yet.` / `لا حركات بعد.`

---

## 8. Spatial Trip Planner (`planner.js` / DEC-206)

- **Header**: `Plan a trip` / `خطط رحلة`
- **Instruction**: `Pick where you start and where you get off. We recommend a route that boards near the start and passes the end — you can alight anywhere on the line.` / `اختر نقطة البداية ونقطة النزول. نقترح مسارًا يركب قرب البداية ويمر بالنهاية — والنزول حر في أي مكان على الخط.`
- **Inputs**:
  - From (`j_from`): `Where to?` (or `Use my location`)
  - To (`j_to`): Destination landmark or address
- **Map Interactive View**: Live stops, Snapped nearest stop (`p_pinnedNearest`), Recommended route line (`p_recommendedRoute`).
- **Route Suggestion Cards**: Direct (`j_single`) vs 2-Leg Mix (`j_mix`), Walking Leg to Boarding (`j_walkBoard`), Walking Leg from Alighting (`j_walkAlight`), Transfer Walk (`j_transfer`).

---

## 9. Operations, Management & Support Desks (`staff.js`)

### 9.1 Operations Verification Queue (`opsQueue`)
- Driver KYC submissions & Vehicle inspection cards.
- Actions: Approve (`approve`), Reject (`reject`), Needs Correction (`needsFix`), Rejection Reason (`reason`).

### 9.2 Live Ops Fleet Map (`opsLiveMap`)
- Interactive map with real-time bus positions (`m_fleet`).
- Vehicle telemetry: Plate, Driver, Route, Speed, Schedule Slip, Live Occupancy.
- Empty State: `No vehicles sharing a live position right now.` / `لا مركبات تشارك موقعاً مباشراً الآن.`

### 9.3 Stops Desk Mapping Tool (`opsStops` / `EditRouteMap`)
- Pin-drop coordinate placement (`latLabel`, `lngLabel`), Bilingual naming (`stopNameEn`, `stopNameAr`).
- 4-Point Field Verification Checklist: Somewhere to stand (`standOk`), Well lit (`litOk`), Legal to stop (`legalOk`), Reachable safely (`reachableOk`).
- Proximity Collision Warning: `Too close to another stop — add a reason to override.` + Override Reason (`overrideReason`).

### 9.4 Support Incident Triage (`supportTickets`)
- Incident queue with severity tags (Assault, Harassment, SOS, etc.).
- Investigation Panel (`j_investigate`), Human Decision Recording (`j_decide`): No Action (`j_dec_no_action`), Warning (`j_dec_warning`), Mandatory Training (`j_dec_training`), Suspension (`j_dec_suspension`), Permanent Removal (`j_dec_removal`).

---

## 10. System Administration & Owner Control (`admin.js`)

- **Staff Accounts Table (`adminStaff`)**: Name, Email, Role (`operations`, `manager`, `support`), Actions (Edit `staffEdit`, Deactivate `staffRemove`).
- **Owner Platform Settings (`adminSettings`)**:
  - Platform Commission Rate (`j_setCommission`): Percentage slider/input.
  - Email OTP Verification Bypass (`j_setEmailVerify`): Toggle On (`j_emailVerifyOn`) / Off (`j_emailVerifyOff`).
  - Notification Limits: Behavioral per day (`j_setBehDay`), Promotional per week (`j_setPromoWeek`), Non-transactional cap (`j_setNonTx`).
  - Paymob Gateway Switch (`j_setPaymob`): On (`j_on`) / Off (`j_off`).
- **Immutable Audit Log Viewer (`adminAudit`)**: Timestamp, Actor (User ID/Email), Action (`j_auditAction`), Target entity (`j_auditTarget`), Changes diff.

---

## 11. System Errors, Auth Alerts & Validation Copy

### Auth Errors (`T.en.auth` & `T.ar.auth`)
- `invalid_credentials`: EN: "Email or password isn't right." | AR: "البريد أو كلمة المرور غير صحيحة."
- `account_suspended`: EN: "This account is suspended." | AR: "هذا الحساب موقوف."
- `email_domain_not_allowed`: EN: "This email provider isn't supported. Please use Gmail, Yahoo, Outlook, or your school or university email." | AR: "مزوّد البريد هذا غير مدعوم. استخدم Gmail أو Yahoo أو Outlook أو بريد جامعتك."
- `email_taken`: EN: "You already have an account with this email — sign in instead. To drive, apply from your profile." | AR: "لديك حساب بهذا البريد بالفعل — سجّل الدخول بدلًا من ذلك. وللقيادة قدّم من حسابك."
- `phone_taken`: EN: "That phone number is already in use." | AR: "هذا الرقم مستخدم بالفعل."
- `super_admin_reserved`: EN: "Only the main admin can be super admin." | AR: "المدير الرئيسي فقط يمكنه أن يكون مديرًا عامًا."
- `main_admin_protected`: EN: "The main admin account can't be edited or removed." | AR: "حساب المدير الرئيسي لا يمكن تعديله أو حذفه."
- `staff_not_found`: EN: "Staff account not found." | AR: "حساب الموظف غير موجود."
- `staff_roles_only`: EN: "Only staff roles can be created here." | AR: "يمكن إنشاء أدوار الموظفين هنا فقط."
- `forbidden`: EN: "You don't have permission to do that." | AR: "ليست لديك صلاحية للقيام بذلك."
- `identifier_required`: EN: "An email or phone number is required." | AR: "البريد أو رقم الهاتف مطلوب."
- `otp_mismatch`: EN: "That code isn't right." | AR: "الكود غير صحيح."
- `otp_expired`: EN: "That code has expired — send a new one." | AR: "انتهت صلاحية الكود — أرسل كودًا جديدًا."
- `otp_not_found`: EN: "Send a code first, then enter it." | AR: "أرسل كودًا أولًا ثم أدخله."
- `otp_consumed`: EN: "That code was already used." | AR: "هذا الكود مستخدم بالفعل."
- `code_locked`: EN: "Too many attempts — try again in 1 hour." | AR: "محاولات كثيرة — حاول مرة أخرى بعد ساعة."
- `resend_wait`: EN: "Please wait before sending another code." | AR: "انتظر قليلًا قبل إرسال كود آخر."
- `reset_invalid`: EN: "That reset code isn't valid." | AR: "كود إعادة التعيين غير صالح."
- `session_invalid`: EN: "Your session expired — sign in again." | AR: "انتهت جلستك — سجّل الدخول مرة أخرى."
- `email_not_set`: EN: "Add an email address first." | AR: "أضف بريدًا إلكترونيًا أولًا."
- `owner_only`: EN: "Only the main admin can change these settings." | AR: ""

### Payment & Ledger Errors (`T.en.payments` & `T.ar.payments`)
- `disabled`: EN: "Online top-up is not enabled yet." | AR: "الشحن الإلكتروني غير مُفعّل بعد."
- `bad_signature`: EN: "Payment confirmation rejected (bad signature)." | AR: "تم رفض تأكيد الدفع (توقيع غير صحيح)."
- `bad_topup_amount`: EN: "Enter an amount between 5 and 10,000 EGP." | AR: "أدخل مبلغًا بين ٥ و١٠٠٠٠ جنيه."
- `provider_not_configured`: EN: "The payment provider is not configured yet." | AR: "لم يتم إعداد وسيلة الدفع بعد."
- `provider_unreachable`: EN: "Could not reach the payment provider — try again." | AR: "تعذّر الوصول إلى وسيلة الدفع — حاول مرة أخرى."
- `provider_error`: EN: "The payment provider returned an error." | AR: "أرجعت وسيلة الدفع خطأً."
- `unknown_order`: EN: "Unknown payment order." | AR: "طلب دفع غير معروف."
- `amount_mismatch`: EN: "Payment amount mismatch — nothing was charged." | AR: "مبلغ الدفع غير مطابق — لم يتم خصم شيء."
- `booking_not_found`: EN: "Booking not found." | AR: "الحجز غير موجود."
- `not_your_journey`: EN: "This is not your journey." | AR: "هذه ليست رحلتك."
- `booking_not_payable`: EN: "This booking can no longer be paid." | AR: "لم يعد يمكن دفع هذا الحجز."
- `rider_not_found`: EN: "Account not found." | AR: "الحساب غير موجود."
- `unsupported_kind`: EN: "Unsupported payment type." | AR: "نوع دفع غير مدعوم."
- `insufficient_funds`: EN: "Wallet balance is not enough for this fare — top up or pay cash." | AR: "رصيد المحفظة لا يكفي لهذه الأجرة — اشحن المحفظة أو ادفع كاش."
- `no_driver`: EN: "This journey has no driver yet." | AR: "لا يوجد سائق لهذه الرحلة بعد."
- `not_your_booking`: EN: "This booking is not yours." | AR: "هذا الحجز ليس لك."

### Booking Errors (`T.en.bookings` & `T.ar.bookings`)
- `not_found`: EN: "That code is not on this departure." | AR: "هذا الكود ليس على هذا الموعد."
- `already_boarded`: EN: "This rider is already on board." | AR: "هذا الراكب ركب بالفعل."
- `wrong_journey`: EN: "That code is for a different departure." | AR: "هذا الكود لموعد آخر."
- `cannot_board`: EN: "This booking cannot board." | AR: "لا يمكن إركاب هذا الحجز."
- `out_of_window`: EN: "Boarding is only open around the departure time." | AR: "الركوب مفتوح فقط حول موعد القيام."

### Support & Incident Errors (`T.en.support` & `T.ar.support`)
- `booking_not_found`: EN: "That booking was not found." | AR: "هذا الحجز غير موجود."
- `bad_category`: EN: "Pick a valid category." | AR: "اختر تصنيفًا صالحًا."
- `body_required`: EN: "Describe what happened." | AR: "صف ما حدث."
- `share_expired`: EN: "This share link has expired." | AR: "انتهت صلاحية رابط المشاركة."
- `not_found`: EN: "Incident not found." | AR: "الحادثة غير موجودة."
- `illegal_transition`: EN: "That step is not allowed from the current state." | AR: "هذه الخطوة غير مسموحة من الحالة الحالية."
- `reason_required`: EN: "A reason is required." | AR: "السبب مطلوب."
- `bad_decision`: EN: "Pick a valid decision." | AR: "اختر قرارًا صالحًا."
