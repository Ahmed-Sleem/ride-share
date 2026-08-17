/* ══════════════════════════════════════════════════════════════════════
   1. COPY — every readable string, both languages, in one place.
   ══════════════════════════════════════════════════════════════════════ */
const T = {
en:{
  brand:"Ride Share", tagline:"Share the ride. One fixed price.",
  role:{rider:"Rider",driver:"Driver",ops:"Operations",manager:"Manager",support:"Support"},
  nav:{home:"Home",trips:"Trips",wallet:"Wallet",safety:"Safety",profile:"Profile",
       duty:"Duty",work:"Find work",journey:"Journey",earnings:"Earnings",
       queue:"Queue",livemap:"Live map",stops:"Stops",routes:"Routes",users:"Users",
       board:"Board",coverage:"Coverage",pricing:"Pricing",promos:"Promotions",analytics:"Analytics",
       lookup:"Lookup",tickets:"Tickets",lost:"Lost property"},
  /* auth */
  getStarted:"Get started", browse:"Browse routes first", phoneLabel:"Mobile number",
  phoneHelp:"We send a 6-digit code by SMS.", continue:"Continue", verify:"Verify",
  otpTitle:"Enter the code", otpSent:"Sent to", resendIn:"Resend in", resend:"Resend code",
  wrongNumber:"Change number", passcodeTitle:"Set a passcode", passcodeWhy:"Opens the app without an SMS each time.",
  skip:"Skip", yourName:"Your name", nameWhy:"Drivers see your first name only.", finish:"Finish",
  /* rider core */
  greeting:"Good morning", nearby:"Routes near you", searchRoute:"Search routes and stops",
  searchHint:"Where do you want to go?",
  searchPlaceholder:"Where do you want to go?", yourRide:"Your ride", trackVehicle:"Track vehicle", showQr:"Show boarding code",
  walk:"min walk", fixedPrice:"Fixed price", getOffAnywhere:"Get off anywhere along the route",
  whereBoard:"Where will you board?", recommended:"Recommended", streetPickup:"Street pickup",
  streetPickupWhy:"We collect you from the roadside near you.",
  pickDeparture:"Pick a departure", arrives:"arrives", confirmBooking:"Confirm booking",
  seats:"Seats", cancelTerms:"Free until 30 minutes before departure. After that, half the fare.",
  booked:"Booked", bookedBody:"Be at your boarding point 5 minutes early.",
  arriving:"Arriving in", leaveNow:"Leave now", sos:"SOS", shareRide:"Share ride",
  nextStop:"Next stop", imGettingOff:"I'm getting off next", boardingCode:"Boarding code",
  scanAtDoor:"Show this to the driver at the door.", rideDone:"Ride complete", rateRide:"How was it?",
  submit:"Submit", trips:"Trips", upcoming:"Upcoming", past:"Past", noTrips:"No trips yet",
  noTripsBody:"Booked rides appear here.", balance:"Balance", topUp:"Top up", addMoney:"Add money",
  history:"History", subs:"Subscriptions", subsBody:"Ride the same route every day for less.",
  buySub:"Buy subscription", safetyCentre:"Safety centre", shareTrip:"Share trip status",
  emergency:"Emergency contacts", reportProblem:"Report a problem", callSupport:"Call support",
  language:"Language", theme:"Appearance", notifications:"Notifications", signOut:"Sign out",
  themeAuto:"Auto", themeLight:"Light", themeDark:"Dark",
  switchLight:"Switch to light", switchDark:"Switch to dark",
  collapseMenu:"Collapse menu", expandMenu:"Expand menu",
  /* driver */
  goOnline:"Go on duty", goOffline:"Go off duty", online:"On duty", offline:"Off duty",
  today:"Today", cashToSettle:"Cash to settle", claimSlot:"Claim this slot",
  claimed:"Slot claimed", ridersWaiting:"riders searched this slot yesterday",
  slotOpen:"Open", slotTaken:"Taken", slotMine:"Yours", scan:"Scan boarding code",
  scanned:"Scanned", notScanned:"Not scanned", boarding:"Boarding", alighting:"Getting off",
  arrived:"Arrived at stop", onTime:"On time", late:"Behind schedule",
  cashCollected:"Cash collected", endJourney:"End journey", reportIssue:"Report a problem",
  documents:"Documents", expires:"Expires", payouts:"Payouts", nextPayout:"Next payout",
  vehicle:"Vehicle", myDepartures:"My departures", noClaims:"No claimed departures",
  noClaimsBody:"Claim a slot to start earning.", queued:"queued", lastSync:"last synced",
  offlineBanner:"Offline — actions are saved and sent when you reconnect",
  /* staff */
  waiting:"Waiting", oldest:"Oldest", open:"Open", approve:"Approve", reject:"Reject",
  needsFix:"Needs correction", reason:"Reason", launchSale:"Launch flash sale",
  notifyRiders:"Notify riders", dismiss:"Dismiss", save:"Save changes", cancel:"Cancel",
  mapMock:"Illustrative map",
  na:"Not available at your role."
},
ar:{
  brand:"رايد شير", tagline:"شارك الرحلة. سعر ثابت.",
  role:{rider:"راكب",driver:"سائق",ops:"العمليات",manager:"مدير",support:"الدعم"},
  nav:{home:"الرئيسية",trips:"رحلاتي",wallet:"المحفظة",safety:"الأمان",profile:"حسابي",
       duty:"الدوام",work:"ابحث عن عمل",journey:"الرحلة",earnings:"الأرباح",
       queue:"الطلبات",livemap:"الخريطة",stops:"المحطات",routes:"المسارات",users:"المستخدمون",
       board:"اللوحة",coverage:"التغطية",pricing:"التسعير",promos:"العروض",analytics:"التحليلات",
       lookup:"بحث",tickets:"التذاكر",lost:"المفقودات"},
  getStarted:"ابدأ", browse:"تصفح المسارات أولاً", phoneLabel:"رقم الموبايل",
  phoneHelp:"سنرسل كود من ٦ أرقام برسالة.", continue:"متابعة", verify:"تأكيد",
  otpTitle:"أدخل الكود", otpSent:"أُرسل إلى", resendIn:"إعادة الإرسال بعد", resend:"إعادة إرسال الكود",
  wrongNumber:"تغيير الرقم", passcodeTitle:"اختر رمز دخول", passcodeWhy:"يفتح التطبيق بدون رسالة كل مرة.",
  skip:"تخطي", yourName:"اسمك", nameWhy:"السائق يرى الاسم الأول فقط.", finish:"إنهاء",
  greeting:"صباح الخير", nearby:"مسارات قريبة منك", searchRoute:"ابحث عن مسار أو محطة",
  searchHint:"إلى أين تريد الذهاب؟",
  searchPlaceholder:"إلى أين تريد الذهاب؟", yourRide:"رحلتك", trackVehicle:"تتبع المركبة", showQr:"اعرض كود الركوب",
  walk:"دقيقة مشي", fixedPrice:"سعر ثابت", getOffAnywhere:"انزل في أي مكان على المسار",
  whereBoard:"من أين ستركب؟", recommended:"الأنسب", streetPickup:"ركوب من الشارع",
  streetPickupWhy:"نمر عليك من أقرب نقطة على الطريق.",
  pickDeparture:"اختر موعد القيام", arrives:"الوصول", confirmBooking:"تأكيد الحجز",
  seats:"المقاعد", cancelTerms:"الإلغاء مجاني حتى ٣٠ دقيقة قبل القيام، وبعدها نصف الأجرة.",
  booked:"تم الحجز", bookedBody:"كن عند نقطة الركوب قبل الموعد بـ ٥ دقائق.",
  arriving:"يصل خلال", leaveNow:"اخرج الآن", sos:"استغاثة", shareRide:"شارك الرحلة",
  nextStop:"المحطة التالية", imGettingOff:"سأنزل في التالية", boardingCode:"كود الركوب",
  scanAtDoor:"اعرضه للسائق عند الباب.", rideDone:"انتهت الرحلة", rateRide:"كيف كانت؟",
  submit:"إرسال", trips:"الرحلات", upcoming:"القادمة", past:"السابقة", noTrips:"لا توجد رحلات",
  noTripsBody:"الرحلات المحجوزة تظهر هنا.", balance:"الرصيد", topUp:"شحن", addMoney:"إضافة رصيد",
  history:"السجل", subs:"الاشتراكات", subsBody:"اركب نفس المسار يوميًا بسعر أقل.",
  buySub:"اشترك", safetyCentre:"مركز الأمان", shareTrip:"شارك حالة الرحلة",
  emergency:"جهات الطوارئ", reportProblem:"أبلغ عن مشكلة", callSupport:"اتصل بالدعم",
  language:"اللغة", theme:"المظهر", notifications:"الإشعارات", signOut:"تسجيل الخروج",
  themeAuto:"تلقائي", themeLight:"فاتح", themeDark:"داكن",
  switchLight:"التبديل إلى الفاتح", switchDark:"التبديل إلى الداكن",
  collapseMenu:"طي القائمة", expandMenu:"توسيع القائمة",
  goOnline:"ابدأ الدوام", goOffline:"إنهاء الدوام", online:"في الدوام", offline:"خارج الدوام",
  today:"اليوم", cashToSettle:"نقدية للتوريد", claimSlot:"احجز هذا الموعد",
  claimed:"تم حجز الموعد", ridersWaiting:"راكب بحث عن هذا الموعد أمس",
  slotOpen:"متاح", slotTaken:"محجوز", slotMine:"لك", scan:"امسح كود الركوب",
  scanned:"تم المسح", notScanned:"لم يُمسح", boarding:"الركوب", alighting:"النزول",
  arrived:"وصلت المحطة", onTime:"في الموعد", late:"متأخر عن الجدول",
  cashCollected:"تم تحصيل النقدية", endJourney:"إنهاء الرحلة", reportIssue:"أبلغ عن مشكلة",
  documents:"المستندات", expires:"تنتهي", payouts:"التحويلات", nextPayout:"التحويل القادم",
  vehicle:"المركبة", myDepartures:"مواعيدي", noClaims:"لا توجد مواعيد محجوزة",
  noClaimsBody:"احجز موعدًا لتبدأ العمل.", queued:"في الانتظار", lastSync:"آخر مزامنة",
  offlineBanner:"غير متصل — سنحفظ ما تفعله ونرسله عند عودة الاتصال",
  waiting:"في الانتظار", oldest:"الأقدم", open:"فتح", approve:"قبول", reject:"رفض",
  needsFix:"يحتاج تصحيح", reason:"السبب", launchSale:"أطلق عرضًا",
  notifyRiders:"أبلغ الركاب", dismiss:"تجاهل", save:"حفظ التغييرات", cancel:"إلغاء",
  mapMock:"خريطة توضيحية",
  na:"غير متاح لدورك."
}};

/* ══════════════════════════════════════════════════════════════════════
   2. CONTENT — sample content for every screen.
   ══════════════════════════════════════════════════════════════════════ */
const DATA = {
  user:{ name:"Nour", initials:"N", phone:"+20 100 000 0000", balance:48 },
  routes:[
    {id:"r1", en:"Corniche Line — Montazah → Manshiya", ar:"خط الكورنيش — المنتزه ← المنشية",
     every:"Every 12 min", everyAr:"كل ١٢ دقيقة", window:"06:00 – 22:00", fare:15, stops:11},
    {id:"r2", en:"Smouha → Downtown", ar:"سموحة ← وسط البلد",
     every:"Every 15 min", everyAr:"كل ١٥ دقيقة", window:"06:30 – 21:00", fare:12, stops:8},
    {id:"r3", en:"Agami → Sidi Gaber", ar:"العجمي ← سيدي جابر",
     every:"Every 20 min", everyAr:"كل ٢٠ دقيقة", window:"05:30 – 20:00", fare:18, stops:14},
    {id:"r4", en:"Miami → Sporting", ar:"ميامي ← سبورتنج",
     every:"Every 18 min", everyAr:"كل ١٨ دقيقة", window:"06:00 – 20:30", fare:14, stops:9}
  ],
  streetPickupFare:20,
  boardingPoints:[
    {id:"b1", en:"Montazah Gate 2", ar:"بوابة المنتزه ٢", walk:4, ok:true, rec:true},
    {id:"b2", en:"Mandara Bridge", ar:"كوبري المندرة", walk:7, ok:true},
    {id:"b3", en:"Sidi Bishr Tram", ar:"ترام سيدي بشر", walk:11, ok:true},
    {id:"b4", en:"Asafra Market", ar:"سوق العصافرة", walk:9, ok:false, why:"Closed for road works"}
  ],
  departures:[
    {id:"d1", time:"07:15", arrive:"07:52", fare:15, seatsLeft:6, rec:true},
    {id:"d2", time:"07:27", arrive:"08:04", fare:15, seatsLeft:11},
    {id:"d3", time:"07:39", arrive:"08:16", fare:15, seatsLeft:14},
    {id:"d4", time:"07:51", arrive:"08:28", fare:15, seatsLeft:14}
  ],
  ticket:{ route:"Corniche Line", boarding:"Montazah Gate 2", time:"07:15",
           code:"482917", seats:1, fare:15 },
  vehicle:{ plate:"ALX 4821", model:"Toyota Hiace", colour:"#1B62D6", colourName:"Blue",
            driver:"Mahmoud A.", eta:6, rating:4.8 },
  routeStops:[
    {en:"Montazah Gate 2", ar:"بوابة المنتزه ٢", state:"done"},
    {en:"Mandara Bridge", ar:"كوبري المندرة", state:"done"},
    {en:"Sidi Bishr", ar:"سيدي بشر", state:"now"},
    {en:"Miami", ar:"ميامي", state:"next"},
    {en:"Sporting", ar:"سبورتنج", state:"next"},
    {en:"Manshiya", ar:"المنشية", state:"next"}
  ],
  tripsUpcoming:[
    {route:"Corniche Line", when:"Today 07:15", fare:15, state:"confirmed"}
  ],
  tripsPast:[
    {route:"Smouha → Downtown", when:"Yesterday 18:20", fare:12, state:"completed"},
    {route:"Corniche Line", when:"Sun 07:15", fare:15, state:"completed"},
    {route:"Agami → Sidi Gaber", when:"Sat 09:40", fare:18, state:"cancelled"}
  ],
  walletHistory:[
    {label:"Corniche Line", when:"Yesterday", amount:-12},
    {label:"Top up — card", when:"Yesterday", amount:+100},
    {label:"Smouha → Downtown", when:"Mon", amount:-12},
    {label:"Refund — cancelled ride", when:"Sat", amount:+18}
  ],
  subs:[
    {en:"Corniche Line — 20 rides", ar:"خط الكورنيش — ٢٠ رحلة", price:255, save:45, per:"month"},
    {en:"Corniche Line — 40 rides", ar:"خط الكورنيش — ٤٠ رحلة", price:480, save:120, per:"month"}
  ],
  driverToday:{ journeys:3, earned:412, cash:180, nextPayout:"Thursday" },
  slots:[
    {time:"06:45", state:"taken", demand:0},
    {time:"07:15", state:"open", demand:12, bonus:0},
    {time:"07:45", state:"claimed", demand:0},
    {time:"08:15", state:"open", demand:4},
    {time:"08:45", state:"open", demand:0},
    {time:"09:15", state:"taken", demand:0}
  ],
  claims:[
    {route:"Corniche Line", time:"07:45", date:"Today", seats:14, booked:9, committed:true},
    {route:"Corniche Line", time:"16:30", date:"Today", seats:14, booked:3, committed:false}
  ],
  manifest:[
    {initials:"N", name:"Nour", seats:1, scanned:true,  alighting:false, stop:"Montazah Gate 2"},
    {initials:"H", name:"Hana", seats:2, scanned:true,  alighting:false, stop:"Mandara Bridge"},
    {initials:"K", name:"Karim",seats:1, scanned:false, alighting:false, stop:"Sidi Bishr"},
    {initials:"S", name:"Sara", seats:1, scanned:true,  alighting:true,  stop:"Sidi Bishr"}
  ],
  driverDocs:[
    {name:"Driving licence", expires:"14 Mar 2027", state:"ok"},
    {name:"Vehicle licence", expires:"2 Oct 2026", state:"soon"},
    {name:"Criminal record", expires:"19 Jan 2027", state:"ok"}
  ],
  opsQueue:[
    {label:"Driver applications", count:12, oldest:"2 h", severity:"none", key:"drivers"},
    {label:"Vehicle approvals", count:5, oldest:"40 min", severity:"none", key:"vehicles"},
    {label:"Safety incidents", count:2, oldest:"11 min", severity:"danger", key:"incidents"},
    {label:"Disputes", count:7, oldest:"1 d", severity:"warn", key:"disputes"},
    {label:"Stop verification", count:23, oldest:"3 d", severity:"none", key:"stops"}
  ],
  applicant:{ name:"Mahmoud Abdelrahman", phone:"+20 100 000 0000", submitted:"2 h ago",
              docs:["Licence front","Licence back","National ID","Vehicle registration"] },
  opsStops:[
    {name:"Montazah Gate 2", route:"Corniche Line", state:"verified", by:"Field, 3 d ago"},
    {name:"Mandara Bridge", route:"Corniche Line", state:"verified", by:"Field, 3 d ago"},
    {name:"Asafra Market", route:"Corniche Line", state:"pending", by:"Desk, today"},
    {name:"Victoria Tram", route:"Miami → Sporting", state:"rejected", by:"Field, 1 d ago"}
  ],
  opsVehicles:[
    {plate:"ALX 4821", route:"Corniche Line", driver:"Mahmoud A.", state:"on-journey", slip:"+2 min"},
    {plate:"ALX 1190", route:"Smouha → Downtown", driver:"Tarek S.", state:"on-journey", slip:"+9 min"},
    {plate:"ALX 7734", route:"Agami → Sidi Gaber", driver:"Omar K.", state:"idle", slip:"—"}
  ],
  metrics:[
    {v:"1,284", l:"Rides today"}, {v:"87%", l:"Seats filled"},
    {v:"4.7", l:"Average rating"}, {v:"2", l:"Open incidents"}
  ],
  coverage:[
    {slot:"07:15", route:"Corniche Line", need:4, claimed:2, state:"short"},
    {slot:"07:45", route:"Corniche Line", need:4, claimed:4, state:"ok"},
    {slot:"08:15", route:"Smouha → Downtown", need:3, claimed:1, state:"short"},
    {slot:"08:45", route:"Miami → Sporting", need:2, claimed:2, state:"ok"}
  ],
  alerts:[
    {zone:"Montazah — 07:00 to 08:00", kind:"warn",
     body:"2 of 4 slots claimed. 38 riders searched this window yesterday."},
    {zone:"Smouha — 08:00 to 09:00", kind:"warn",
     body:"1 of 3 slots claimed. Consider a claim bonus."},
    {zone:"Agami — all day", kind:"ok", body:"Fully covered."}
  ],
  fares:[
    {route:"Corniche Line", stop:15, street:20, updated:"12 d ago"},
    {route:"Smouha → Downtown", stop:12, street:17, updated:"12 d ago"},
    {route:"Agami → Sidi Gaber", stop:18, street:23, updated:"5 d ago"},
    {route:"Miami → Sporting", stop:14, street:19, updated:"5 d ago"}
  ],
  promos:[
    {name:"Montazah morning fill", type:"Flash sale", window:"07:00–08:00", state:"running", uses:41},
    {name:"First ride free", type:"Acquisition", window:"Always", state:"running", uses:308},
    {name:"Ramadan evenings", type:"Flash sale", window:"19:00–21:00", state:"scheduled", uses:0}
  ],
  analytics:[
    {l:"Rides", v:"1,284", d:"+8% vs last week"},
    {l:"Seats filled", v:"87%", d:"+3 pts"},
    {l:"Cancellations", v:"4.1%", d:"−0.6 pts"},
    {l:"Schedule adherence", v:"92%", d:"−1 pt"}
  ],
  tickets:[
    {ref:"T-4821", subject:"Charged twice", who:"Nour", age:"12 min", state:"open"},
    {ref:"T-4818", subject:"Driver did not stop", who:"Hana", age:"1 h", state:"open"},
    {ref:"T-4809", subject:"Left a bag on board", who:"Karim", age:"3 h", state:"waiting"}
  ],
  lost:[
    {item:"Black backpack", route:"Corniche Line", when:"Yesterday 18:20", state:"with driver"},
    {item:"Phone — blue case", route:"Smouha → Downtown", when:"Mon 09:10", state:"claimed"}
  ]
};
