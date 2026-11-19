/* eslint react-refresh/only-export-components: off */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const LANGUAGES = [
  { code: "en", label: "English", locale: "en-IN" },
  { code: "hi", label: "हिन्दी", locale: "hi-IN" },
  { code: "bn", label: "বাংলা", locale: "bn-IN" },
  { code: "ta", label: "தமிழ்", locale: "ta-IN" },
  { code: "te", label: "తెలుగు", locale: "te-IN" },
  { code: "mr", label: "मराठी", locale: "mr-IN" },
];

const words = {
  hi: {
    Welcome: "स्वागत है",
    "Here’s what’s happening at your clinic today.":
      "आज आपके क्लिनिक में क्या हो रहा है, यहाँ देखें।",
    "My Appointment": "मेरी अपॉइंटमेंट",
    "How it works": "कैसे काम करता है",
    "For clinics": "क्लिनिक के लिए",
    "Find a clinic": "क्लिनिक खोजें",
    "Clinic login": "क्लिनिक लॉगिन",
    "Register clinic": "क्लिनिक पंजीकृत करें",
    "A calmer way to care": "देखभाल का आसान तरीका",
    "Less waiting.": "कम इंतज़ार।",
    "More caring.": "बेहतर देखभाल।",
    "A clearer queue for your clinic. Patients know where they stand, and your team stays in control.":
      "क्लिनिक की कतार अब साफ़ और व्यवस्थित। मरीज़ अपनी स्थिति जानें और आपकी टीम नियंत्रण में रहे।",
    "Get started for free": "मुफ़्त शुरू करें",
    "See how it works": "जानें कैसे काम करता है",
    "Made for independent clinics": "स्वतंत्र क्लिनिकों के लिए",
    "Across India": "पूरे भारत में",
    "TODAY AT": "आज",
    Open: "खुला है",
    "NOW SERVING": "अभी चल रहा है",
    waiting: "इंतज़ार में",
    "UP NEXT": "अगला नंबर",
    "Queue updates live": "कतार की जानकारी लाइव",
    "Updated just now": "अभी अपडेट हुआ",
    "BUILT FOR THE PEOPLE WHO KEEP CLINICS MOVING":
      "क्लिनिक को सुचारू रखने वालों के लिए",
    "Independent clinics": "स्वतंत्र क्लिनिक",
    "Reception teams": "रिसेप्शन टीम",
    "Patients on the go": "मरीज़ों के लिए",
    "A BETTER VISIT, STEP BY STEP": "बेहतर मुलाक़ात, हर कदम पर",
    "Good care starts": "अच्छी देखभाल शुरू होती है",
    "before the consult.": "मुलाक़ात से पहले।",
    "Know where you stand": "अपनी स्थिति जानें",
    "Patients get a token and a live view of their place in line.":
      "मरीज़ को टोकन और कतार में अपनी जगह की ताज़ा जानकारी मिलती है।",
    "Wait on your terms": "अपनी सुविधा से इंतज़ार करें",
    "Come back when your turn is getting close, with clear guidance.":
      "बारी पास आने पर साफ़ सूचना के साथ वापस आएँ।",
    "Keep the day flowing": "दिन को सुचारू रखें",
    "Your team manages walk-ins and appointments from one simple queue.":
      "आपकी टीम वॉक-इन और अपॉइंटमेंट एक ही कतार से संभाले।",
    "YOUR CLINIC, IN BETTER FLOW": "आपका क्लिनिक, बेहतर व्यवस्था में",
    "Make room for": "जगह बनाएँ",
    "what matters.": "ज़रूरी बातों के लिए।",
    "Set up your clinic and start a one-month free trial. No payment details needed to begin.":
      "क्लिनिक सेट करें और एक महीने का मुफ़्त ट्रायल शुरू करें। शुरुआत में भुगतान की जानकारी ज़रूरी नहीं।",
    "Create your clinic": "अपना क्लिनिक बनाएँ",
    Contact: "संपर्क",
    Privacy: "गोपनीयता",
    Terms: "नियम",
    "GET STARTED": "शुरू करें",
    "WELCOME BACK": "वापसी पर स्वागत है",
    "Set up your clinic": "अपना क्लिनिक सेट करें",
    "Sign in to QueueLess": "QueueLess में लॉगिन करें",
    "Create your clinic workspace. Your first month is on us.":
      "अपने क्लिनिक का कार्यक्षेत्र बनाएँ। पहला महीना मुफ़्त है।",
    "Manage your clinic queue and appointments.":
      "क्लिनिक की कतार और अपॉइंटमेंट संभालें।",
    "Clinic name": "क्लिनिक का नाम",
    "Clinic address": "क्लिनिक का पता",
    City: "शहर",
    State: "राज्य",
    "Clinic phone": "क्लिनिक फ़ोन",
    "Your name": "आपका नाम",
    "Email address": "ईमेल पता",
    Password: "पासवर्ड",
    "Create a strong password": "मज़बूत पासवर्ड बनाएँ",
    "At least 8 characters, with uppercase, lowercase, number, and special character.":
      "कम से कम 8 अक्षर रखें, जिनमें एक बड़ा अक्षर, एक छोटा अक्षर, एक संख्या और एक विशेष चिह्न हो।",
    "Clinic administrator": "क्लिनिक प्रशासक",
    "Street address": "सड़क का पता",
    "I agree to the": "मैं सहमत हूँ",
    " and the ": " और ",
    "Please wait…": "कृपया प्रतीक्षा करें…",
    "Create clinic account": "क्लिनिक खाता बनाएँ",
    "Sign in": "लॉगिन करें",
    "Already set up?": "पहले से खाता है?",
    "New to QueueLess?": "QueueLess पर नए हैं?",
    "Back to home": "होम पर वापस",
    "Better flow starts here": "बेहतर व्यवस्था यहीं से",
    "More time for": "ज़्यादा समय",
    "good care.": "अच्छी देखभाल के लिए।",
    "QueueLess brings a little more calm to the everyday clinic visit.":
      "QueueLess रोज़मर्रा की क्लिनिक मुलाक़ात को थोड़ा आसान बनाता है।",
    "Thoughtful queues, better visits.": "सुव्यवस्थित कतार, बेहतर मुलाक़ात।",
    "Your session expired. Please sign in again.":
      "आपका सत्र समाप्त हो गया। कृपया फिर लॉगिन करें।",
    "Loading your clinic…": "आपका क्लिनिक लोड हो रहा है…",
    "Sign in again": "फिर लॉगिन करें",
    "PHASE 2 · CLINIC SETUP": "चरण 2 · क्लिनिक सेटअप",
    "Configure your team and opening hours. You can adjust these any time.":
      "अपनी टीम और खुलने का समय तय करें। आप इसे कभी भी बदल सकते हैं।",
    "Clinic profile": "क्लिनिक की जानकारी",
    "Confirm the details patients will use to find you.":
      "मरीज़ों को दिखने वाली जानकारी की पुष्टि करें।",
    "Contact number": "संपर्क नंबर",
    Address: "पता",
    "Time zone": "समय क्षेत्र",
    "Doctors and availability": "डॉक्टर और उपलब्धता",
    "Add a doctor and set the clinic's regular hours.":
      "डॉक्टर जोड़ें और क्लिनिक का नियमित समय तय करें।",
    "Doctor name": "डॉक्टर का नाम",
    Specialization: "विशेषज्ञता",
    Optional: "वैकल्पिक",
    "Add doctor": "डॉक्टर जोड़ें",
    DAY: "दिन",
    OPEN: "खुलने का समय",
    CLOSE: "बंद होने का समय",
    "Add a daily consultation break": "रोज़ाना परामर्श का विराम जोड़ें",
    From: "से",
    To: "तक",
    "Queue preferences": "कतार की प्राथमिकताएँ",
    "Choose a few defaults for the reception team.":
      "रिसेप्शन टीम के लिए सामान्य विकल्प चुनें।",
    "Appointment slot length": "अपॉइंटमेंट अवधि",
    "Appointments per slot": "हर स्लॉट में अपॉइंटमेंट",
    "Turn approaching reminder": "बारी पास आने की सूचना",
    "Walk-in registrations": "बिना अपॉइंटमेंट पंजीकरण",
    Enabled: "चालू",
    Disabled: "बंद",
    "Returned patient queue rule": "वापस आए मरीज़ की कतार",
    "Missed turn policy": "छूटी हुई बारी का नियम",
    "Save and continue": "सेव करके आगे बढ़ें",
    "Changes are saved to your clinic workspace.":
      "बदलाव आपके क्लिनिक खाते में सेव होंगे।",
    "Good morning": "सुप्रभात",
    "Here's what's happening at your clinic today.":
      "आज आपके क्लिनिक में यह स्थिति है।",
    "CLINIC OVERVIEW": "क्लिनिक का सारांश",
    "Clinic settings": "क्लिनिक सेटिंग",
    "Queue dashboard": "कतार डैशबोर्ड",
    WORKSPACE: "कार्यस्थल",
    "Clinic workspace": "क्लिनिक कार्यक्षेत्र",
    Administrator: "प्रशासक",
    "Registered today": "आज पंजीकृत",
    "people checked in": "मरीज़ चेक-इन",
    "Waiting now": "अभी इंतज़ार में",
    "in the queue": "कतार में",
    "In consultation": "परामर्श में",
    "with a doctor": "डॉक्टर के साथ",
    Completed: "पूरा हुआ",
    "visits today": "आज की मुलाक़ातें",
    "Live queue": "लाइव कतार",
    "Updates every 20 seconds": "हर 20 सेकंड में अपडेट",
    "Call next patient": "अगले मरीज़ को बुलाएँ",
    "Your queue is clear": "अभी कतार खाली है",
    "Registered patients will show here. Add a walk-in to get started.":
      "पंजीकृत मरीज़ यहाँ दिखेंगे। शुरू करने के लिए वॉक-इन जोड़ें।",
    TOKEN: "टोकन",
    PATIENT: "मरीज़",
    DOCTOR: "डॉक्टर",
    STATUS: "स्थिति",
    POSITION: "स्थान",
    ACTION: "कार्रवाई",
    "Any doctor": "कोई भी डॉक्टर",
    "Check in": "चेक-इन करें",
    Call: "बुलाएँ",
    Start: "शुरू करें",
    Missed: "बारी छूटी",
    Complete: "पूरा करें",
    Cancel: "रद्द करें",
    "Register a walk-in": "वॉक-इन पंजीकृत करें",
    "New patient or returning visitor": "नया या लौटता हुआ मरीज़",
    "Patient name": "मरीज़ का नाम",
    "Mobile number": "मोबाइल नंबर",
    "Reception note": "रिसेप्शन नोट",
    "Add to today’s queue": "आज की कतार में जोड़ें",
    "Walk-ins can be registered during configured clinic hours. A permanent reference and token are assigned.":
      "वॉक-इन तय क्लिनिक समय में पंजीकृत किए जा सकते हैं। हर पंजीकरण को स्थायी संदर्भ और टोकन मिलेगा।",
    "missed turns": "छूटी हुई बारी",
    cancelled: "रद्द",
    "Reception actions are recorded in the activity log.":
      "रिसेप्शन की कार्रवाइयाँ गतिविधि लॉग में दर्ज होती हैं।",
    "Sign out": "लॉगआउट",
    "PATIENT PORTAL": "मरीज़ पोर्टल",
    "Search for a clinic to view its details and book an appointment.":
      "क्लिनिक की जानकारी देखें और अपॉइंटमेंट बुक करें।",
    "Clinic name, city, or address": "क्लिनिक का नाम, शहर या पता",
    Search: "खोजें",
    "Loading clinics…": "क्लिनिक लोड हो रहे हैं…",
    "No clinics found yet": "कोई क्लिनिक नहीं मिला",
    "Try a different search or check back later.":
      "दूसरी खोज करें या बाद में फिर देखें।",
    "View clinic": "क्लिनिक देखें",
    "All clinics": "सभी क्लिनिक",
    "BOOK A VISIT": "मुलाक़ात बुक करें",
    "Online registration unavailable": "ऑनलाइन पंजीकरण उपलब्ध नहीं",
    "Call the clinic to arrange your visit.":
      "मुलाक़ात तय करने के लिए क्लिनिक को फ़ोन करें।",
    "Visit type": "मुलाक़ात का प्रकार",
    "Book an appointment": "अपॉइंटमेंट बुक करें",
    "Join today’s walk-in queue": "आज की वॉक-इन कतार में जुड़ें",
    Doctor: "डॉक्टर",
    "Choose a doctor": "डॉक्टर चुनें",
    "Appointment date": "अपॉइंटमेंट की तारीख",
    "Available times": "उपलब्ध समय",
    "No times available. Choose another date.":
      "समय उपलब्ध नहीं है। दूसरी तारीख चुनें।",
    left: "बाकी",
    "I agree to receive registration updates from the clinic.":
      "मैं क्लिनिक से पंजीकरण संबंधी संदेश पाने के लिए सहमत हूँ।",
    "Confirm registration": "पंजीकरण पक्का करें",
    "Registering…": "पंजीकरण हो रहा है…",
    "REGISTRATION CONFIRMED": "पंजीकरण पक्का हुआ",
    "You’re on the list.": "आपका पंजीकरण हो गया।",
    "Your private visit link is ready. Bookmark this page to reopen the registration.":
      "आपका निजी लिंक तैयार है। पंजीकरण फिर देखने के लिए इस पेज को बुकमार्क करें।",
    REFERENCE: "संदर्भ नंबर",
    "REGISTRATION STATUS": "पंजीकरण की स्थिति",
    "Appointment time:": "अपॉइंटमेंट का समय:",
    "This is your scheduled appointment time, not a live queue position.":
      "यह तय अपॉइंटमेंट समय है, लाइव कतार की जगह नहीं।",
    "View registration": "पंजीकरण देखें",
    "YOUR REGISTRATION": "आपका पंजीकरण",
    "PRIVATE VISIT LINK": "निजी मुलाक़ात लिंक",
    "Link unavailable": "लिंक उपलब्ध नहीं",
    "Recover access": "लिंक वापस पाएँ",
    "Loading your registration…": "आपका पंजीकरण लोड हो रहा है…",
    "Queue position:": "कतार में स्थान:",
    "Create a new private link": "नया निजी लिंक बनाएँ",
    "Revoke this link": "यह लिंक रद्द करें",
    "Recover your visit": "अपनी मुलाक़ात वापस पाएँ",
    "Use the mobile number you gave the clinic. We’ll send a verification code if registrations are found.":
      "क्लिनिक में दिया मोबाइल नंबर भरें। पंजीकरण मिलने पर सत्यापन कोड भेजा जाएगा।",
    "Send verification code": "सत्यापन कोड भेजें",
    "Six-digit code": "छह अंकों का कोड",
    "Local development code:": "स्थानीय परीक्षण कोड:",
    "Verify and find visits": "सत्यापित करें और मुलाक़ातें देखें",
    "Open visit": "मुलाक़ात खोलें",
    "No active registrations found": "कोई सक्रिय पंजीकरण नहीं मिला",
    "Check the mobile number or contact your clinic.":
      "मोबाइल नंबर जाँचें या क्लिनिक से संपर्क करें।",
    "Estimated wait:": "अनुमानित प्रतीक्षा:",
    minutes: "मिनट",
  },
  bn: {
    Welcome: "স্বাগতম",
    "Here’s what’s happening at your clinic today.":
      "আজ আপনার ক্লিনিকে কী ঘটছে, তা এখানে দেখুন।",
    "My Appointment": "আমার অ্যাপয়েন্টমেন্ট",
    "How it works": "যেভাবে কাজ করে",
    "For clinics": "ক্লিনিকের জন্য",
    "Find a clinic": "ক্লিনিক খুঁজুন",
    "Clinic login": "ক্লিনিক লগইন",
    "Register clinic": "ক্লিনিক নিবন্ধন",
    "A calmer way to care": "আরও স্বচ্ছন্দ চিকিৎসা",
    "Less waiting.": "কম অপেক্ষা।",
    "More caring.": "আরও যত্ন।",
    "A clearer queue for your clinic. Patients know where they stand, and your team stays in control.":
      "ক্লিনিকের সারি থাকুক পরিষ্কার। রোগীরা নিজেদের অবস্থান জানবেন, আর আপনার দল থাকবে নিয়ন্ত্রণে।",
    "Get started for free": "বিনামূল্যে শুরু করুন",
    "See how it works": "কীভাবে কাজ করে দেখুন",
    "Made for independent clinics": "স্বতন্ত্র ক্লিনিকের জন্য",
    "Across India": "সারা ভারতে",
    "TODAY AT": "আজ",
    Open: "খোলা",
    "NOW SERVING": "এখন দেখা হচ্ছে",
    waiting: "অপেক্ষায়",
    "UP NEXT": "পরের জন",
    "Queue updates live": "সারির আপডেট সরাসরি",
    "Updated just now": "এইমাত্র আপডেট",
    "PATIENT PORTAL": "রোগী পোর্টাল",
    "Search for a clinic to view its details and book an appointment.":
      "ক্লিনিকের তথ্য দেখুন এবং অ্যাপয়েন্টমেন্ট বুক করুন।",
    "Clinic name, city, or address": "ক্লিনিকের নাম, শহর বা ঠিকানা",
    Search: "খুঁজুন",
    "Loading clinics…": "ক্লিনিক লোড হচ্ছে…",
    "No clinics found yet": "কোনও ক্লিনিক পাওয়া যায়নি",
    "Try a different search or check back later.":
      "অন্যভাবে খুঁজুন বা পরে আবার দেখুন।",
    "View clinic": "ক্লিনিক দেখুন",
    "All clinics": "সব ক্লিনিক",
    "BOOK A VISIT": "সাক্ষাৎ বুক করুন",
    "Online registration unavailable": "অনলাইন নিবন্ধন উপলভ্য নয়",
    "Call the clinic to arrange your visit.":
      "সাক্ষাতের জন্য ক্লিনিকে ফোন করুন।",
    "Visit type": "সাক্ষাতের ধরন",
    "Book an appointment": "অ্যাপয়েন্টমেন্ট বুক করুন",
    "Join today’s walk-in queue": "আজকের ওয়াক-ইন সারিতে যোগ দিন",
    Doctor: "ডাক্তার",
    "Choose a doctor": "ডাক্তার বেছে নিন",
    "Appointment date": "অ্যাপয়েন্টমেন্টের তারিখ",
    "Available times": "উপলভ্য সময়",
    "No times available. Choose another date.":
      "কোনও সময় উপলভ্য নেই। অন্য তারিখ বেছে নিন।",
    "Your name": "আপনার নাম",
    "Mobile number": "মোবাইল নম্বর",
    "I agree to receive registration updates from the clinic.":
      "ক্লিনিক থেকে নিবন্ধনের আপডেট পেতে আমি সম্মত।",
    "Confirm registration": "নিবন্ধন নিশ্চিত করুন",
    "Registering…": "নিবন্ধন হচ্ছে…",
    "REGISTRATION CONFIRMED": "নিবন্ধন নিশ্চিত হয়েছে",
    "You’re on the list.": "আপনার নাম তালিকায় আছে।",
    "Your private visit link is ready. Bookmark this page to reopen the registration.":
      "আপনার ব্যক্তিগত লিঙ্ক তৈরি। পরে দেখতে এই পেজটি বুকমার্ক করুন।",
    REFERENCE: "রেফারেন্স",
    "REGISTRATION STATUS": "নিবন্ধনের অবস্থা",
    "Appointment time:": "অ্যাপয়েন্টমেন্টের সময়:",
    "This is your scheduled appointment time, not a live queue position.":
      "এটি নির্ধারিত অ্যাপয়েন্টমেন্টের সময়, সরাসরি সারির অবস্থান নয়।",
    "View registration": "নিবন্ধন দেখুন",
    "YOUR REGISTRATION": "আপনার নিবন্ধন",
    "PRIVATE VISIT LINK": "ব্যক্তিগত সাক্ষাৎ লিঙ্ক",
    "Link unavailable": "লিঙ্ক উপলভ্য নয়",
    "Recover access": "অ্যাক্সেস ফিরে পান",
    "Loading your registration…": "আপনার নিবন্ধন লোড হচ্ছে…",
    "Queue position:": "সারিতে অবস্থান:",
    "Create a new private link": "নতুন ব্যক্তিগত লিঙ্ক তৈরি করুন",
    "Revoke this link": "এই লিঙ্ক বাতিল করুন",
    "Recover your visit": "আপনার সাক্ষাৎ ফিরে পান",
    "Use the mobile number you gave the clinic. We’ll send a verification code if registrations are found.":
      "ক্লিনিকে দেওয়া মোবাইল নম্বর লিখুন। নিবন্ধন থাকলে যাচাইকরণ কোড পাঠানো হবে।",
    "Send verification code": "যাচাইকরণ কোড পাঠান",
    "Six-digit code": "ছয় অঙ্কের কোড",
    "Verify and find visits": "যাচাই করে সাক্ষাৎ দেখুন",
    "Open visit": "সাক্ষাৎ খুলুন",
    "No active registrations found": "কোনও সক্রিয় নিবন্ধন পাওয়া যায়নি",
    "Check the mobile number or contact your clinic.":
      "মোবাইল নম্বর যাচাই করুন বা ক্লিনিকে যোগাযোগ করুন।",
  },
  ta: {
    Welcome: "வரவேற்கிறோம்",
    "Here’s what’s happening at your clinic today.":
      "இன்று உங்கள் கிளினிக்கில் என்ன நடக்கிறது என்பதைப் பாருங்கள்.",
    "My Appointment": "எனது சந்திப்பு",
    "How it works": "எப்படி செயல்படுகிறது",
    "For clinics": "மருத்துவமனைகளுக்கு",
    "Find a clinic": "மருத்துவமனையைத் தேடுங்கள்",
    "Clinic login": "மருத்துவமனை உள்நுழைவு",
    "Register clinic": "மருத்துவமனையைப் பதிவு செய்க",
    "A calmer way to care": "அமைதியான மருத்துவ அனுபவம்",
    "Less waiting.": "காத்திருப்பு குறைவு.",
    "More caring.": "அக்கறை அதிகம்.",
    "A clearer queue for your clinic. Patients know where they stand, and your team stays in control.":
      "மருத்துவமனை வரிசை தெளிவாக இருக்கும். நோயாளிகள் தங்கள் நிலையை அறியலாம்; உங்கள் குழு நிர்வகிக்கலாம்.",
    "Get started for free": "இலவசமாகத் தொடங்குங்கள்",
    "See how it works": "எப்படி செயல்படுகிறது பாருங்கள்",
    "Made for independent clinics": "தனியார் மருத்துவமனைகளுக்காக",
    "Across India": "இந்தியா முழுவதும்",
    "TODAY AT": "இன்று",
    Open: "திறந்திருக்கும்",
    "NOW SERVING": "தற்போது அழைக்கப்படுபவர்",
    waiting: "காத்திருப்பு",
    "UP NEXT": "அடுத்தவர்",
    "Queue updates live": "வரிசை நேரலை புதுப்பிப்பு",
    "Updated just now": "இப்போது புதுப்பிக்கப்பட்டது",
    "PATIENT PORTAL": "நோயாளர் பகுதி",
    "Search for a clinic to view its details and book an appointment.":
      "மருத்துவமனை விவரங்களைப் பார்த்து நேரத்தை முன்பதிவு செய்யுங்கள்.",
    "Clinic name, city, or address": "மருத்துவமனை பெயர், நகரம் அல்லது முகவரி",
    Search: "தேடுங்கள்",
    "Loading clinics…": "மருத்துவமனைகள் ஏற்றப்படுகின்றன…",
    "No clinics found yet": "மருத்துவமனைகள் இல்லை",
    "Try a different search or check back later.":
      "வேறு சொல்லைத் தேடுங்கள் அல்லது பின்னர் முயற்சிக்கவும்.",
    "View clinic": "மருத்துவமனையைப் பாருங்கள்",
    "All clinics": "அனைத்து மருத்துவமனைகள்",
    "BOOK A VISIT": "சந்திப்பை முன்பதிவு செய்க",
    "Online registration unavailable": "ஆன்லைன் பதிவு இல்லை",
    "Call the clinic to arrange your visit.":
      "சந்திப்பை ஏற்பாடு செய்ய மருத்துவமனையை அழைக்கவும்.",
    "Visit type": "சந்திப்பு வகை",
    "Book an appointment": "நேரம் முன்பதிவு செய்க",
    "Join today’s walk-in queue": "இன்றைய நேரடி வரிசையில் சேருங்கள்",
    Doctor: "மருத்துவர்",
    "Choose a doctor": "மருத்துவரைத் தேர்ந்தெடுக்கவும்",
    "Appointment date": "சந்திப்பு தேதி",
    "Available times": "கிடைக்கும் நேரங்கள்",
    "No times available. Choose another date.":
      "நேரங்கள் இல்லை. வேறு தேதியைத் தேர்ந்தெடுக்கவும்.",
    "Your name": "உங்கள் பெயர்",
    "Mobile number": "கைபேசி எண்",
    "I agree to receive registration updates from the clinic.":
      "பதிவு குறித்த தகவல்களைப் பெற ஒப்புக்கொள்கிறேன்.",
    "Confirm registration": "பதிவை உறுதிசெய்க",
    "Registering…": "பதிவு செய்யப்படுகிறது…",
    "REGISTRATION CONFIRMED": "பதிவு உறுதிசெய்யப்பட்டது",
    "You’re on the list.": "உங்கள் பதிவு நிறைவடைந்தது.",
    "Your private visit link is ready. Bookmark this page to reopen the registration.":
      "உங்கள் தனிப்பட்ட இணைப்பு தயார். மீண்டும் பார்க்க இந்தப் பக்கத்தைச் சேமிக்கவும்.",
    REFERENCE: "குறிப்பு எண்",
    "REGISTRATION STATUS": "பதிவு நிலை",
    "Appointment time:": "சந்திப்பு நேரம்:",
    "This is your scheduled appointment time, not a live queue position.":
      "இது முன்பதிவு நேரம்; நேரடி வரிசை இடம் அல்ல.",
    "View registration": "பதிவைப் பாருங்கள்",
    "YOUR REGISTRATION": "உங்கள் பதிவு",
    "PRIVATE VISIT LINK": "தனிப்பட்ட சந்திப்பு இணைப்பு",
    "Link unavailable": "இணைப்பு இல்லை",
    "Recover access": "அணுகலை மீட்கவும்",
    "Loading your registration…": "உங்கள் பதிவு ஏற்றப்படுகிறது…",
    "Queue position:": "வரிசை இடம்:",
    "Create a new private link": "புதிய தனிப்பட்ட இணைப்பை உருவாக்கவும்",
    "Revoke this link": "இந்த இணைப்பை ரத்து செய்க",
    "Recover your visit": "உங்கள் சந்திப்பை மீட்கவும்",
    "Use the mobile number you gave the clinic. We’ll send a verification code if registrations are found.":
      "மருத்துவமனைக்கு அளித்த கைபேசி எண்ணை உள்ளிடவும். பதிவு இருந்தால் சரிபார்ப்புக் குறியீடு அனுப்பப்படும்.",
    "Send verification code": "சரிபார்ப்புக் குறியீட்டை அனுப்பவும்",
    "Six-digit code": "ஆறு இலக்கக் குறியீடு",
    "Verify and find visits": "சரிபார்த்து சந்திப்புகளைப் பாருங்கள்",
    "Open visit": "சந்திப்பைத் திறக்கவும்",
    "No active registrations found": "செயலில் உள்ள பதிவுகள் இல்லை",
    "Check the mobile number or contact your clinic.":
      "கைபேசி எண்ணைச் சரிபார்க்கவும் அல்லது மருத்துவமனையைத் தொடர்புகொள்ளவும்.",
  },
  te: {
    Welcome: "స్వాగతం",
    "Here’s what’s happening at your clinic today.":
      "ఈరోజు మీ క్లినిక్‌లో ఏమి జరుగుతుందో ఇక్కడ చూడండి.",
    "My Appointment": "నా అపాయింట్‌మెంట్",
    "How it works": "ఇది ఎలా పనిచేస్తుంది",
    "For clinics": "క్లినిక్‌ల కోసం",
    "Find a clinic": "క్లినిక్‌ను కనుగొనండి",
    "Clinic login": "క్లినిక్ లాగిన్",
    "Register clinic": "క్లినిక్ నమోదు",
    "A calmer way to care": "సులభమైన వైద్య సేవ",
    "Less waiting.": "తక్కువ నిరీక్షణ.",
    "More caring.": "మరింత శ్రద్ధ.",
    "A clearer queue for your clinic. Patients know where they stand, and your team stays in control.":
      "క్లినిక్ క్యూను స్పష్టంగా నిర్వహించండి. రోగులకు తమ స్థానం తెలుస్తుంది; మీ బృందం నియంత్రణలో ఉంటుంది.",
    "Get started for free": "ఉచితంగా ప్రారంభించండి",
    "See how it works": "ఇది ఎలా పనిచేస్తుందో చూడండి",
    "Made for independent clinics": "స్వతంత్ర క్లినిక్‌ల కోసం",
    "Across India": "భారతదేశమంతటా",
    "TODAY AT": "ఈరోజు",
    Open: "తెరిచి ఉంది",
    "NOW SERVING": "ఇప్పుడు సేవలో",
    waiting: "వేచి ఉన్నారు",
    "UP NEXT": "తదుపరి",
    "Queue updates live": "క్యూ ప్రత్యక్ష నవీకరణలు",
    "Updated just now": "ఇప్పుడే నవీకరించబడింది",
    "PATIENT PORTAL": "రోగి పోర్టల్",
    "Search for a clinic to view its details and book an appointment.":
      "క్లినిక్ వివరాలు చూసి అపాయింట్‌మెంట్ బుక్ చేయండి.",
    "Clinic name, city, or address": "క్లినిక్ పేరు, నగరం లేదా చిరునామా",
    Search: "వెతకండి",
    "Loading clinics…": "క్లినిక్‌లు లోడ్ అవుతున్నాయి…",
    "No clinics found yet": "క్లినిక్‌లు కనబడలేదు",
    "Try a different search or check back later.":
      "మరో విధంగా వెతకండి లేదా తర్వాత మళ్లీ చూడండి.",
    "View clinic": "క్లినిక్ వివరాలు",
    "All clinics": "అన్ని క్లినిక్‌లు",
    "BOOK A VISIT": "సందర్శన బుక్ చేయండి",
    "Online registration unavailable": "ఆన్‌లైన్ నమోదు అందుబాటులో లేదు",
    "Call the clinic to arrange your visit.":
      "సందర్శన కోసం క్లినిక్‌కు ఫోన్ చేయండి.",
    "Visit type": "సందర్శన రకం",
    "Book an appointment": "అపాయింట్‌మెంట్ బుక్ చేయండి",
    "Join today’s walk-in queue": "ఈరోజు వాక్-ఇన్ క్యూలో చేరండి",
    Doctor: "వైద్యుడు",
    "Choose a doctor": "వైద్యుడిని ఎంచుకోండి",
    "Appointment date": "అపాయింట్‌మెంట్ తేదీ",
    "Available times": "అందుబాటులో ఉన్న సమయాలు",
    "No times available. Choose another date.":
      "సమయాలు అందుబాటులో లేవు. మరో తేదీ ఎంచుకోండి.",
    "Your name": "మీ పేరు",
    "Mobile number": "మొబైల్ నంబర్",
    "I agree to receive registration updates from the clinic.":
      "నమోదు సమాచారం పొందేందుకు నేను అంగీకరిస్తున్నాను.",
    "Confirm registration": "నమోదును నిర్ధారించండి",
    "Registering…": "నమోదవుతోంది…",
    "REGISTRATION CONFIRMED": "నమోదు నిర్ధారించబడింది",
    "You’re on the list.": "మీ నమోదు పూర్తయింది.",
    "Your private visit link is ready. Bookmark this page to reopen the registration.":
      "మీ ప్రైవేట్ లింక్ సిద్ధంగా ఉంది. మళ్లీ చూడటానికి ఈ పేజీని సేవ్ చేసుకోండి.",
    REFERENCE: "రిఫరెన్స్",
    "REGISTRATION STATUS": "నమోదు స్థితి",
    "Appointment time:": "అపాయింట్‌మెంట్ సమయం:",
    "This is your scheduled appointment time, not a live queue position.":
      "ఇది షెడ్యూల్ చేసిన సమయం; ప్రత్యక్ష క్యూ స్థానం కాదు.",
    "View registration": "నమోదు వివరాలు",
    "YOUR REGISTRATION": "మీ నమోదు",
    "PRIVATE VISIT LINK": "ప్రైవేట్ సందర్శన లింక్",
    "Link unavailable": "లింక్ అందుబాటులో లేదు",
    "Recover access": "యాక్సెస్ తిరిగి పొందండి",
    "Loading your registration…": "మీ నమోదు లోడ్ అవుతోంది…",
    "Queue position:": "క్యూలో స్థానం:",
    "Create a new private link": "కొత్త ప్రైవేట్ లింక్ సృష్టించండి",
    "Revoke this link": "ఈ లింక్‌ను రద్దు చేయండి",
    "Recover your visit": "మీ సందర్శనను తిరిగి పొందండి",
    "Use the mobile number you gave the clinic. We’ll send a verification code if registrations are found.":
      "క్లినిక్‌కు ఇచ్చిన మొబైల్ నంబర్ నమోదు చేయండి. నమోదు ఉంటే ధృవీకరణ కోడ్ పంపుతాము.",
    "Send verification code": "ధృవీకరణ కోడ్ పంపండి",
    "Six-digit code": "ఆరు అంకెల కోడ్",
    "Verify and find visits": "ధృవీకరించి సందర్శనలను చూడండి",
    "Open visit": "సందర్శన తెరవండి",
    "No active registrations found": "క్రియాశీల నమోదులు కనబడలేదు",
    "Check the mobile number or contact your clinic.":
      "మొబైల్ నంబర్ తనిఖీ చేయండి లేదా క్లినిక్‌ను సంప్రదించండి.",
  },
  mr: {
    Welcome: "स्वागत आहे",
    "Here’s what’s happening at your clinic today.":
      "आज तुमच्या क्लिनिकमध्ये काय सुरू आहे ते येथे पाहा.",
    "My Appointment": "माझी अपॉइंटमेंट",
    "How it works": "हे कसे काम करते",
    "For clinics": "क्लिनिकसाठी",
    "Find a clinic": "क्लिनिक शोधा",
    "Clinic login": "क्लिनिक लॉगिन",
    "Register clinic": "क्लिनिक नोंदणी",
    "A calmer way to care": "आरामदायी आरोग्यसेवा",
    "Less waiting.": "कमी प्रतीक्षा.",
    "More caring.": "अधिक काळजी.",
    "A clearer queue for your clinic. Patients know where they stand, and your team stays in control.":
      "क्लिनिकची रांग स्पष्ट ठेवा. रुग्णांना त्यांचा क्रम कळेल आणि तुमची टीम नियंत्रणात राहील.",
    "Get started for free": "मोफत सुरू करा",
    "See how it works": "हे कसे काम करते ते पाहा",
    "Made for independent clinics": "स्वतंत्र क्लिनिकसाठी",
    "Across India": "संपूर्ण भारतात",
    "TODAY AT": "आज",
    Open: "उघडे",
    "NOW SERVING": "सध्या सुरू",
    waiting: "प्रतीक्षेत",
    "UP NEXT": "पुढील क्रमांक",
    "Queue updates live": "रांगेचे थेट अपडेट",
    "Updated just now": "आत्ताच अपडेट",
    "PATIENT PORTAL": "रुग्ण पोर्टल",
    "Search for a clinic to view its details and book an appointment.":
      "क्लिनिकची माहिती पाहा आणि भेटीची वेळ ठरवा.",
    "Clinic name, city, or address": "क्लिनिकचे नाव, शहर किंवा पत्ता",
    Search: "शोधा",
    "Loading clinics…": "क्लिनिक लोड होत आहेत…",
    "No clinics found yet": "क्लिनिक सापडले नाही",
    "Try a different search or check back later.":
      "वेगळा शोध घ्या किंवा नंतर पुन्हा पाहा.",
    "View clinic": "क्लिनिक पाहा",
    "All clinics": "सर्व क्लिनिक",
    "BOOK A VISIT": "भेटीची वेळ ठरवा",
    "Online registration unavailable": "ऑनलाइन नोंदणी उपलब्ध नाही",
    "Call the clinic to arrange your visit.":
      "भेट ठरवण्यासाठी क्लिनिकला फोन करा.",
    "Visit type": "भेटीचा प्रकार",
    "Book an appointment": "अपॉइंटमेंट ठरवा",
    "Join today’s walk-in queue": "आजच्या वॉक-इन रांगेत सामील व्हा",
    Doctor: "डॉक्टर",
    "Choose a doctor": "डॉक्टर निवडा",
    "Appointment date": "अपॉइंटमेंटची तारीख",
    "Available times": "उपलब्ध वेळा",
    "No times available. Choose another date.":
      "वेळ उपलब्ध नाही. दुसरी तारीख निवडा.",
    "Your name": "तुमचे नाव",
    "Mobile number": "मोबाईल क्रमांक",
    "I agree to receive registration updates from the clinic.":
      "क्लिनिककडून नोंदणीचे अपडेट मिळण्यास माझी संमती आहे.",
    "Confirm registration": "नोंदणी निश्चित करा",
    "Registering…": "नोंदणी सुरू आहे…",
    "REGISTRATION CONFIRMED": "नोंदणी निश्चित झाली",
    "You’re on the list.": "तुमची नोंदणी झाली आहे.",
    "Your private visit link is ready. Bookmark this page to reopen the registration.":
      "तुमची खाजगी लिंक तयार आहे. नोंदणी पुन्हा पाहण्यासाठी हे पान जतन करा.",
    REFERENCE: "संदर्भ क्रमांक",
    "REGISTRATION STATUS": "नोंदणीची स्थिती",
    "Appointment time:": "अपॉइंटमेंटची वेळ:",
    "This is your scheduled appointment time, not a live queue position.":
      "ही ठरलेली वेळ आहे; थेट रांगेतील क्रमांक नाही.",
    "View registration": "नोंदणी पाहा",
    "YOUR REGISTRATION": "तुमची नोंदणी",
    "PRIVATE VISIT LINK": "खाजगी भेट लिंक",
    "Link unavailable": "लिंक उपलब्ध नाही",
    "Recover access": "प्रवेश पुन्हा मिळवा",
    "Loading your registration…": "तुमची नोंदणी लोड होत आहे…",
    "Queue position:": "रांगेतील क्रमांक:",
    "Create a new private link": "नवीन खाजगी लिंक तयार करा",
    "Revoke this link": "ही लिंक रद्द करा",
    "Recover your visit": "तुमची भेट पुन्हा मिळवा",
    "Use the mobile number you gave the clinic. We’ll send a verification code if registrations are found.":
      "क्लिनिकला दिलेला मोबाईल क्रमांक टाका. नोंदणी असल्यास पडताळणी कोड पाठवू.",
    "Send verification code": "पडताळणी कोड पाठवा",
    "Six-digit code": "सहा अंकी कोड",
    "Verify and find visits": "पडताळणी करून भेटी पाहा",
    "Open visit": "भेट उघडा",
    "No active registrations found": "सक्रिय नोंदणी सापडली नाही",
    "Check the mobile number or contact your clinic.":
      "मोबाईल क्रमांक तपासा किंवा क्लिनिकशी संपर्क साधा.",
  },
};

const clinicWords = {
  hi: {
    registered: "पंजीकृत",
    called: "बुलाया गया",
    "in consultation": "परामर्श में",
    completed: "पूरा हुआ",
    missed: "बारी छूटी",
    "Return to queue": "कतार में वापस जोड़ें",
    "checked in": "चेक-इन हुआ",
    "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.":
      "ऑनलाइन पंजीकरण से क्लिनिक में आपकी उपस्थिति की पुष्टि नहीं होती। पहुँचने पर रिसेप्शन पर चेक-इन करें।",
    "Your registration is confirmed. Please check in with the receptionist when you arrive; online registration does not confirm physical arrival.":
      "आपका पंजीकरण पक्का है। पहुँचने पर रिसेप्शन पर चेक-इन करें; ऑनलाइन पंजीकरण से उपस्थिति की पुष्टि नहीं होती।",
    "Estimated wait:": "अनुमानित प्रतीक्षा:",
    "minutes.": "मिनट।",
    "This is an estimate and may change; it is not a guaranteed consultation time.":
      "यह अनुमान बदल सकता है; परामर्श का निश्चित समय नहीं है।",
    Reference: "संदर्भ",
    Token: "टोकन",
  },
  bn: {
    "Clinic workspace": "ক্লিনিক কর্মক্ষেত্র",
    WORKSPACE: "কর্মক্ষেত্র",
    "Queue dashboard": "সারির ড্যাশবোর্ড",
    "Clinic settings": "ক্লিনিক সেটিংস",
    "CLINIC OVERVIEW": "ক্লিনিকের সারাংশ",
    "Good morning": "সুপ্রভাত",
    "Here's what's happening at your clinic today.":
      "আজ আপনার ক্লিনিকের অবস্থা।",
    "Registered today": "আজ নিবন্ধিত",
    "people checked in": "জন চেক-ইন করেছেন",
    "Waiting now": "এখন অপেক্ষায়",
    "in the queue": "সারিতে",
    "In consultation": "পরামর্শ চলছে",
    "with a doctor": "ডাক্তারের সঙ্গে",
    Completed: "সম্পন্ন",
    "visits today": "আজকের সাক্ষাৎ",
    "Live queue": "লাইভ সারি",
    "Updates every 20 seconds": "প্রতি ২০ সেকেন্ডে আপডেট",
    "Call next patient": "পরের রোগীকে ডাকুন",
    "Your queue is clear": "সারি এখন খালি",
    "Registered patients will show here. Add a walk-in to get started.":
      "নিবন্ধিত রোগীরা এখানে দেখা যাবে। শুরু করতে ওয়াক-ইন যোগ করুন।",
    TOKEN: "টোকেন",
    PATIENT: "রোগী",
    DOCTOR: "ডাক্তার",
    STATUS: "অবস্থা",
    POSITION: "অবস্থান",
    ACTION: "কাজ",
    registered: "নিবন্ধিত",
    "in consultation": "পরামর্শ চলছে",
    "Check in": "চেক-ইন করুন",
    Call: "ডাকুন",
    Start: "শুরু",
    Missed: "অনুপস্থিত",
    Complete: "সম্পন্ন",
    Cancel: "বাতিল",
    "Return to queue": "সারিতে ফিরিয়ে নিন",
    "Register a walk-in": "ওয়াক-ইন নিবন্ধন",
    "New patient or returning visitor": "নতুন বা ফিরে আসা রোগী",
    "Patient name": "রোগীর নাম",
    "Mobile number": "মোবাইল নম্বর",
    "Any doctor": "যেকোনও ডাক্তার",
    "Reception note": "রিসেপশন নোট",
    "Add to today’s queue": "আজকের সারিতে যোগ করুন",
    "missed turns": "বাদ পড়া পালা",
    cancelled: "বাতিল",
    "Sign out": "সাইন আউট",
    "PHASE 2 · CLINIC SETUP": "ধাপ ২ · ক্লিনিক সেটআপ",
    "Clinic profile": "ক্লিনিকের তথ্য",
    "Doctors and availability": "ডাক্তার ও উপলভ্যতা",
    "Queue preferences": "সারির পছন্দ",
    "Save and continue": "সংরক্ষণ করে এগিয়ে যান",
    "Contact number": "যোগাযোগ নম্বর",
    Address: "ঠিকানা",
    City: "শহর",
    State: "রাজ্য",
    "Time zone": "সময় অঞ্চল",
    "Doctor name": "ডাক্তারের নাম",
    Specialization: "বিশেষত্ব",
    "Appointment slot length": "অ্যাপয়েন্টমেন্টের সময়কাল",
    "Appointments per slot": "প্রতি স্লটে অ্যাপয়েন্টমেন্ট",
    "Walk-in registrations": "ওয়াক-ইন নিবন্ধন",
    Enabled: "চালু",
    Disabled: "বন্ধ",
    "Sign in": "লগইন",
    "Email address": "ইমেল ঠিকানা",
    Password: "পাসওয়ার্ড",
    Search: "খুঁজুন",
    Reference: "রেফারেন্স",
    Token: "টোকেন",
    "checked in": "চেক-ইন হয়েছে",
    "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.":
      "অনলাইন নিবন্ধন ক্লিনিকে উপস্থিতি নিশ্চিত করে না। পৌঁছে রিসেপশনে চেক-ইন করুন।",
    "Your registration is confirmed. Please check in with the receptionist when you arrive; online registration does not confirm physical arrival.":
      "আপনার নিবন্ধন নিশ্চিত। পৌঁছে রিসেপশনে চেক-ইন করুন; অনলাইন নিবন্ধন উপস্থিতি নিশ্চিত করে না।",
    "Estimated wait:": "আনুমানিক অপেক্ষা:",
    "minutes.": "মিনিট।",
    "This is an estimate and may change; it is not a guaranteed consultation time.":
      "এটি আনুমানিক সময়, বদলাতে পারে; পরামর্শের নিশ্চিত সময় নয়।",
  },
  ta: {
    "Clinic workspace": "மருத்துவமனைப் பணியிடம்",
    WORKSPACE: "பணியிடம்",
    "Queue dashboard": "வரிசை பலகை",
    "Clinic settings": "மருத்துவமனை அமைப்புகள்",
    "CLINIC OVERVIEW": "மருத்துவமனைச் சுருக்கம்",
    "Good morning": "காலை வணக்கம்",
    "Here's what's happening at your clinic today.":
      "இன்று உங்கள் மருத்துவமனையின் நிலை.",
    "Registered today": "இன்று பதிவு",
    "people checked in": "பேர் வருகை பதிவு",
    "Waiting now": "தற்போது காத்திருப்பு",
    "in the queue": "வரிசையில்",
    "In consultation": "சிகிச்சையில்",
    "with a doctor": "மருத்துவருடன்",
    Completed: "முடிந்தது",
    "visits today": "இன்றைய சந்திப்புகள்",
    "Live queue": "நேரடி வரிசை",
    "Updates every 20 seconds": "20 விநாடிக்கு ஒருமுறை புதுப்பிப்பு",
    "Call next patient": "அடுத்த நோயாளியை அழைக்கவும்",
    "Your queue is clear": "வரிசை காலியாக உள்ளது",
    "Registered patients will show here. Add a walk-in to get started.":
      "பதிவு செய்த நோயாளிகள் இங்கே தெரியும். தொடங்க நேரடி வருகையைச் சேர்க்கவும்.",
    TOKEN: "டோக்கன்",
    PATIENT: "நோயாளர்",
    DOCTOR: "மருத்துவர்",
    STATUS: "நிலை",
    POSITION: "இடம்",
    ACTION: "செயல்",
    registered: "பதிவு",
    "in consultation": "சிகிச்சையில்",
    "Check in": "வருகையைப் பதிவு செய்க",
    Call: "அழைக்கவும்",
    Start: "தொடங்கவும்",
    Missed: "தவறியது",
    Complete: "முடிக்கவும்",
    Cancel: "ரத்து செய்க",
    "Return to queue": "வரிசைக்குத் திரும்பு",
    "Register a walk-in": "நேரடி வருகையைப் பதிவு செய்க",
    "New patient or returning visitor": "புதிய அல்லது மீண்டும் வரும் நோயாளர்",
    "Patient name": "நோயாளர் பெயர்",
    "Mobile number": "கைபேசி எண்",
    "Any doctor": "எந்த மருத்துவரும்",
    "Reception note": "வரவேற்புக் குறிப்பு",
    "Add to today’s queue": "இன்றைய வரிசையில் சேர்க்கவும்",
    "missed turns": "தவறிய அழைப்புகள்",
    cancelled: "ரத்து",
    "Sign out": "வெளியேறு",
    "PHASE 2 · CLINIC SETUP": "கட்டம் 2 · மருத்துவமனை அமைப்பு",
    "Clinic profile": "மருத்துவமனை விவரம்",
    "Doctors and availability": "மருத்துவர் மற்றும் நேரம்",
    "Queue preferences": "வரிசை விருப்பங்கள்",
    "Save and continue": "சேமித்து தொடரவும்",
    "Contact number": "தொடர்பு எண்",
    Address: "முகவரி",
    City: "நகரம்",
    State: "மாநிலம்",
    "Time zone": "நேர மண்டலம்",
    "Doctor name": "மருத்துவர் பெயர்",
    Specialization: "சிறப்பு",
    "Appointment slot length": "சந்திப்பு நேர அளவு",
    "Appointments per slot": "ஒவ்வொரு நேரத்திற்கான சந்திப்புகள்",
    "Walk-in registrations": "நேரடி வருகைப் பதிவு",
    Enabled: "இயக்கு",
    Disabled: "முடக்கு",
    "Sign in": "உள்நுழைக",
    "Email address": "மின்னஞ்சல் முகவரி",
    Password: "கடவுச்சொல்",
    Search: "தேடுங்கள்",
    Reference: "குறிப்பு எண்",
    Token: "டோக்கன்",
    "checked in": "வருகை பதிவு",
    "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.":
      "ஆன்லைன் பதிவு மருத்துவமனைக்கு வந்ததை உறுதிசெய்யாது. வந்ததும் வரவேற்பில் வருகையைப் பதிவு செய்யவும்.",
    "Your registration is confirmed. Please check in with the receptionist when you arrive; online registration does not confirm physical arrival.":
      "உங்கள் பதிவு உறுதிசெய்யப்பட்டது. வந்ததும் வரவேற்பில் வருகையைப் பதிவு செய்யவும்; ஆன்லைன் பதிவு வருகையை உறுதிசெய்யாது.",
    "Estimated wait:": "காத்திருப்பு மதிப்பீடு:",
    "minutes.": "நிமிடங்கள்.",
    "This is an estimate and may change; it is not a guaranteed consultation time.":
      "இது மாறக்கூடிய மதிப்பீடு; உறுதியான ஆலோசனை நேரம் அல்ல.",
  },
  te: {
    "Clinic workspace": "క్లినిక్ కార్యస్థలం",
    WORKSPACE: "కార్యస్థలం",
    "Queue dashboard": "క్యూ డ్యాష్‌బోర్డ్",
    "Clinic settings": "క్లినిక్ సెట్టింగ్‌లు",
    "CLINIC OVERVIEW": "క్లినిక్ సమీక్ష",
    "Good morning": "శుభోదయం",
    "Here's what's happening at your clinic today.":
      "ఈరోజు మీ క్లినిక్ పరిస్థితి.",
    "Registered today": "ఈరోజు నమోదు",
    "people checked in": "మంది చెక్-ఇన్",
    "Waiting now": "ఇప్పుడు వేచి ఉన్నవారు",
    "in the queue": "క్యూలో",
    "In consultation": "సంప్రదింపులో",
    "with a doctor": "వైద్యుడితో",
    Completed: "పూర్తయింది",
    "visits today": "ఈరోజు సందర్శనలు",
    "Live queue": "ప్రత్యక్ష క్యూ",
    "Updates every 20 seconds": "ప్రతి 20 సెకన్లకు నవీకరణ",
    "Call next patient": "తదుపరి రోగిని పిలవండి",
    "Your queue is clear": "క్యూ ఖాళీగా ఉంది",
    "Registered patients will show here. Add a walk-in to get started.":
      "నమోదైన రోగులు ఇక్కడ కనిపిస్తారు. ప్రారంభించడానికి వాక్-ఇన్‌ను జోడించండి.",
    TOKEN: "టోకెన్",
    PATIENT: "రోగి",
    DOCTOR: "వైద్యుడు",
    STATUS: "స్థితి",
    POSITION: "స్థానం",
    ACTION: "చర్య",
    registered: "నమోదైంది",
    "in consultation": "సంప్రదింపులో",
    "Check in": "చెక్-ఇన్ చేయండి",
    Call: "పిలవండి",
    Start: "ప్రారంభించండి",
    Missed: "రాలేదు",
    Complete: "పూర్తి చేయండి",
    Cancel: "రద్దు",
    "Return to queue": "క్యూలోకి తిరిగి చేర్చండి",
    "Register a walk-in": "వాక్-ఇన్ నమోదు",
    "New patient or returning visitor": "కొత్త లేదా తిరిగి వచ్చిన రోగి",
    "Patient name": "రోగి పేరు",
    "Mobile number": "మొబైల్ నంబర్",
    "Any doctor": "ఏ వైద్యుడైనా",
    "Reception note": "రిసెప్షన్ గమనిక",
    "Add to today’s queue": "ఈరోజు క్యూకు జోడించండి",
    "missed turns": "తప్పిన వంతులు",
    cancelled: "రద్దు",
    "Sign out": "సైన్ అవుట్",
    "PHASE 2 · CLINIC SETUP": "దశ 2 · క్లినిక్ సెటప్",
    "Clinic profile": "క్లినిక్ వివరాలు",
    "Doctors and availability": "వైద్యులు మరియు లభ్యత",
    "Queue preferences": "క్యూ ప్రాధాన్యతలు",
    "Save and continue": "సేవ్ చేసి కొనసాగండి",
    "Contact number": "సంప్రదింపు నంబర్",
    Address: "చిరునామా",
    City: "నగరం",
    State: "రాష్ట్రం",
    "Time zone": "సమయ మండలం",
    "Doctor name": "వైద్యుడి పేరు",
    Specialization: "ప్రత్యేకత",
    "Appointment slot length": "అపాయింట్‌మెంట్ సమయం",
    "Appointments per slot": "ఒక్కో స్లాట్‌లో అపాయింట్‌మెంట్‌లు",
    "Walk-in registrations": "వాక్-ఇన్ నమోదు",
    Enabled: "ప్రారంభం",
    Disabled: "నిలిపివేయి",
    "Sign in": "సైన్ ఇన్",
    "Email address": "ఈమెయిల్ చిరునామా",
    Password: "పాస్‌వర్డ్",
    Search: "వెతకండి",
    Reference: "రిఫరెన్స్",
    Token: "టోకెన్",
    "checked in": "చెక్-ఇన్ అయింది",
    "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.":
      "ఆన్‌లైన్ నమోదు క్లినిక్‌కు వచ్చినట్లు నిర్ధారించదు. చేరుకున్నాక రిసెప్షన్ వద్ద చెక్-ఇన్ చేయండి.",
    "Your registration is confirmed. Please check in with the receptionist when you arrive; online registration does not confirm physical arrival.":
      "మీ నమోదు నిర్ధారించబడింది. వచ్చినప్పుడు రిసెప్షన్ వద్ద చెక్-ఇన్ చేయండి; ఆన్‌లైన్ నమోదు హాజరును నిర్ధారించదు.",
    "Estimated wait:": "అంచనా నిరీక్షణ:",
    "minutes.": "నిమిషాలు.",
    "This is an estimate and may change; it is not a guaranteed consultation time.":
      "ఇది అంచనా మాత్రమే, మారవచ్చు; సంప్రదింపు సమయానికి హామీ కాదు.",
  },
  mr: {
    "Clinic workspace": "क्लिनिक कार्यक्षेत्र",
    WORKSPACE: "कार्यस्थळ",
    "Queue dashboard": "रांग डॅशबोर्ड",
    "Clinic settings": "क्लिनिक सेटिंग्ज",
    "CLINIC OVERVIEW": "क्लिनिकचा आढावा",
    "Good morning": "सुप्रभात",
    "Here's what's happening at your clinic today.":
      "आज तुमच्या क्लिनिकची स्थिती.",
    "Registered today": "आज नोंदणी",
    "people checked in": "रुग्णांनी हजेरी लावली",
    "Waiting now": "सध्या प्रतीक्षेत",
    "in the queue": "रांगेत",
    "In consultation": "तपासणी सुरू",
    "with a doctor": "डॉक्टरांकडे",
    Completed: "पूर्ण",
    "visits today": "आजच्या भेटी",
    "Live queue": "थेट रांग",
    "Updates every 20 seconds": "दर २० सेकंदांनी अपडेट",
    "Call next patient": "पुढील रुग्णाला बोलवा",
    "Your queue is clear": "रांग सध्या रिकामी आहे",
    "Registered patients will show here. Add a walk-in to get started.":
      "नोंदणी केलेले रुग्ण येथे दिसतील. सुरू करण्यासाठी वॉक-इन जोडा.",
    TOKEN: "टोकन",
    PATIENT: "रुग्ण",
    DOCTOR: "डॉक्टर",
    STATUS: "स्थिती",
    POSITION: "क्रमांक",
    ACTION: "कृती",
    registered: "नोंदणी झाली",
    "in consultation": "तपासणी सुरू",
    "Check in": "हजेरी नोंदवा",
    Call: "बोलवा",
    Start: "सुरू करा",
    Missed: "गैरहजर",
    Complete: "पूर्ण करा",
    Cancel: "रद्द करा",
    "Return to queue": "रांगेत परत घ्या",
    "Register a walk-in": "वॉक-इन नोंदणी",
    "New patient or returning visitor": "नवीन किंवा पुन्हा आलेले रुग्ण",
    "Patient name": "रुग्णाचे नाव",
    "Mobile number": "मोबाईल क्रमांक",
    "Any doctor": "कोणतेही डॉक्टर",
    "Reception note": "रिसेप्शन नोंद",
    "Add to today’s queue": "आजच्या रांगेत जोडा",
    "missed turns": "चुकलेल्या पाळ्या",
    cancelled: "रद्द",
    "Sign out": "बाहेर पडा",
    "PHASE 2 · CLINIC SETUP": "टप्पा २ · क्लिनिक सेटअप",
    "Clinic profile": "क्लिनिकची माहिती",
    "Doctors and availability": "डॉक्टर आणि उपलब्धता",
    "Queue preferences": "रांगेची प्राधान्ये",
    "Save and continue": "जतन करून पुढे जा",
    "Contact number": "संपर्क क्रमांक",
    Address: "पत्ता",
    City: "शहर",
    State: "राज्य",
    "Time zone": "वेळ क्षेत्र",
    "Doctor name": "डॉक्टरांचे नाव",
    Specialization: "विशेषज्ञता",
    "Appointment slot length": "अपॉइंटमेंटचा कालावधी",
    "Appointments per slot": "प्रत्येक स्लॉटमधील अपॉइंटमेंट",
    "Walk-in registrations": "वॉक-इन नोंदणी",
    Enabled: "सुरू",
    Disabled: "बंद",
    "Sign in": "लॉगिन",
    "Email address": "ईमेल पत्ता",
    Password: "पासवर्ड",
    Search: "शोधा",
    Reference: "संदर्भ",
    Token: "टोकन",
    "checked in": "हजेरी नोंदली",
    "Online registration does not confirm physical arrival. Please check in with the receptionist when you reach the clinic.":
      "ऑनलाइन नोंदणीमुळे क्लिनिकमध्ये आल्याची खात्री होत नाही. पोहोचल्यावर रिसेप्शनवर हजेरी नोंदवा.",
    "Your registration is confirmed. Please check in with the receptionist when you arrive; online registration does not confirm physical arrival.":
      "तुमची नोंदणी निश्चित झाली. पोहोचल्यावर रिसेप्शनवर हजेरी नोंदवा; ऑनलाइन नोंदणी उपस्थितीची खात्री देत नाही.",
    "Estimated wait:": "अंदाजे प्रतीक्षा:",
    "minutes.": "मिनिटे.",
    "This is an estimate and may change; it is not a guaranteed consultation time.":
      "हा अंदाज बदलू शकतो; तपासणीच्या वेळेची हमी नाही.",
  },
};

const statusWords = {
  hi: {
    waiting: "इंतज़ार में",
    registered: "पंजीकृत",
    booked: "बुक हुआ",
    called: "बुलाया गया",
    "in consultation": "परामर्श में",
    completed: "पूरा हुआ",
    missed: "बारी छूटी",
    cancelled: "रद्द",
    "checked in": "चेक-इन हुआ",
  },
  bn: {
    waiting: "অপেক্ষায়",
    registered: "নিবন্ধিত",
    booked: "বুক করা হয়েছে",
    called: "ডাকা হয়েছে",
    "in consultation": "পরামর্শ চলছে",
    completed: "সম্পন্ন",
    missed: "অনুপস্থিত",
    cancelled: "বাতিল",
    "checked in": "চেক-ইন হয়েছে",
  },
  ta: {
    waiting: "காத்திருக்கிறது",
    registered: "பதிவு",
    booked: "முன்பதிவு செய்யப்பட்டது",
    called: "அழைக்கப்பட்டது",
    "in consultation": "சிகிச்சையில்",
    completed: "முடிந்தது",
    missed: "வரவில்லை",
    cancelled: "ரத்து",
    "checked in": "வருகை பதிவு",
  },
  te: {
    waiting: "వేచి ఉన్నారు",
    registered: "నమోదైంది",
    booked: "బుక్ అయింది",
    called: "పిలిచారు",
    "in consultation": "సంప్రదింపులో",
    completed: "పూర్తయింది",
    missed: "రాలేదు",
    cancelled: "రద్దు",
    "checked in": "చెక్-ఇన్ అయింది",
  },
  mr: {
    waiting: "प्रतीक्षेत",
    registered: "नोंदणी झाली",
    booked: "बुक झाले",
    called: "बोलावले",
    "in consultation": "तपासणी सुरू",
    completed: "पूर्ण",
    missed: "गैरहजर",
    cancelled: "रद्द",
    "checked in": "हजेरी नोंदली",
  },
};

const screenWords = {
  bn: {
    "Configure your team and opening hours. You can adjust these any time.":
      "আপনার দল ও খোলার সময় ঠিক করুন। পরে যেকোনও সময় বদলাতে পারবেন।",
    "Confirm the details patients will use to find you.":
      "রোগীরা আপনাকে খুঁজতে যে তথ্য দেখবেন তা নিশ্চিত করুন।",
    "Add a doctor and set the clinic's regular hours.":
      "ডাক্তার যোগ করুন এবং ক্লিনিকের নিয়মিত সময় ঠিক করুন।",
    "Choose a few defaults for the reception team.":
      "রিসেপশন দলের জন্য সাধারণ পছন্দগুলি ঠিক করুন।",
    "Turn approaching reminder": "পালা এগিয়ে এলে মনে করান",
    "Returned patient queue rule": "ফিরে আসা রোগীর সারির নিয়ম",
    "Missed turn policy": "পালা মিস হলে কী হবে",
    "Rejoin after eligible waiting patients":
      "অপেক্ষায় থাকা রোগীদের পরে আবার যোগ করুন",
    "Rejoin at the end of the queue": "সারির শেষে আবার যোগ করুন",
    "Patients placed ahead on return; the default is five.":
      "ফিরে এলে কতজনের আগে থাকবেন; সাধারণ মান পাঁচ।",
    "Add a daily consultation break": "প্রতিদিন পরামর্শের বিরতি যোগ করুন",
    "Changes are saved to your clinic workspace.":
      "পরিবর্তনগুলি ক্লিনিক অ্যাকাউন্টে সংরক্ষিত হবে।",
    "Loading setup…": "সেটআপ লোড হচ্ছে…",
    "Could not load clinic setup. Please sign in again.":
      "ক্লিনিক সেটআপ লোড হয়নি। আবার লগইন করুন।",
    "Add at least one doctor to finish setup.":
      "সেটআপ শেষ করতে অন্তত একজন ডাক্তার যোগ করুন।",
    "Unable to save setup. Please try again.":
      "সেটআপ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
    Monday: "সোমবার",
    Tuesday: "মঙ্গলবার",
    Wednesday: "বুধবার",
    Thursday: "বৃহস্পতিবার",
    Friday: "শুক্রবার",
    Saturday: "শনিবার",
    Sunday: "রবিবার",
    monday: "সোমবার",
    tuesday: "মঙ্গলবার",
    wednesday: "বুধবার",
    thursday: "বৃহস্পতিবার",
    friday: "শুক্রবার",
    saturday: "শনিবার",
    sunday: "রবিবার",
    "10 minutes": "১০ মিনিট",
    "15 minutes": "১৫ মিনিট",
    "20 minutes": "২০ মিনিট",
    "30 minutes": "৩০ মিনিট",
  },
  ta: {
    "Configure your team and opening hours. You can adjust these any time.":
      "உங்கள் குழு மற்றும் திறந்திருக்கும் நேரத்தை அமைக்கவும். எப்போது வேண்டுமானாலும் மாற்றலாம்.",
    "Confirm the details patients will use to find you.":
      "நோயாளிகள் உங்களைக் கண்டறிய உதவும் விவரங்களை உறுதிசெய்யவும்.",
    "Add a doctor and set the clinic's regular hours.":
      "மருத்துவரைச் சேர்த்து வழக்கமான நேரத்தை அமைக்கவும்.",
    "Choose a few defaults for the reception team.":
      "வரவேற்புக் குழுவிற்கான இயல்புநிலைகளைத் தேர்ந்தெடுக்கவும்.",
    "Turn approaching reminder": "முறை நெருங்கும் நினைவூட்டல்",
    "Returned patient queue rule": "திரும்பும் நோயாளிக்கான வரிசை விதி",
    "Missed turn policy": "தவறிய முறைக்கான விதி",
    "Rejoin after eligible waiting patients":
      "காத்திருக்கும் நோயாளிகளுக்குப் பிறகு சேர்க்கவும்",
    "Rejoin at the end of the queue": "வரிசையின் முடிவில் சேர்க்கவும்",
    "Patients placed ahead on return; the default is five.":
      "திரும்பும்போது முன்னால் வைக்கப்படும் நோயாளிகள்; இயல்புநிலை ஐந்து.",
    "Add a daily consultation break": "தினசரி ஆலோசனை இடைவேளையைச் சேர்க்கவும்",
    "Changes are saved to your clinic workspace.":
      "மாற்றங்கள் கிளினிக் கணக்கில் சேமிக்கப்படும்.",
    "Loading setup…": "அமைப்பு ஏற்றப்படுகிறது…",
    "Could not load clinic setup. Please sign in again.":
      "கிளினிக் அமைப்பை ஏற்ற முடியவில்லை. மீண்டும் உள்நுழையவும்.",
    "Add at least one doctor to finish setup.":
      "அமைப்பை முடிக்க குறைந்தது ஒரு மருத்துவரைச் சேர்க்கவும்.",
    "Unable to save setup. Please try again.":
      "அமைப்பைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    Monday: "திங்கள்",
    Tuesday: "செவ்வாய்",
    Wednesday: "புதன்",
    Thursday: "வியாழன்",
    Friday: "வெள்ளி",
    Saturday: "சனி",
    Sunday: "ஞாயிறு",
    monday: "திங்கள்",
    tuesday: "செவ்வாய்",
    wednesday: "புதன்",
    thursday: "வியாழன்",
    friday: "வெள்ளி",
    saturday: "சனி",
    sunday: "ஞாயிறு",
    "10 minutes": "10 நிமிடங்கள்",
    "15 minutes": "15 நிமிடங்கள்",
    "20 minutes": "20 நிமிடங்கள்",
    "30 minutes": "30 நிமிடங்கள்",
  },
  te: {
    "Configure your team and opening hours. You can adjust these any time.":
      "మీ బృందం, పని వేళలను సెట్ చేయండి. ఎప్పుడైనా మార్చవచ్చు.",
    "Confirm the details patients will use to find you.":
      "రోగులు మిమ్మల్ని కనుగొనడానికి ఉపయోగించే వివరాలను నిర్ధారించండి.",
    "Add a doctor and set the clinic's regular hours.":
      "వైద్యుడిని జోడించి క్లినిక్ సాధారణ వేళలను సెట్ చేయండి.",
    "Choose a few defaults for the reception team.":
      "రిసెప్షన్ బృందం కోసం సాధారణ ఎంపికలను ఎంచుకోండి.",
    "Turn approaching reminder": "వంతు దగ్గరపడినప్పుడు గుర్తు చేయండి",
    "Returned patient queue rule": "తిరిగి వచ్చిన రోగి క్యూ నియమం",
    "Missed turn policy": "తప్పిన వంతు విధానం",
    "Rejoin after eligible waiting patients":
      "వేచి ఉన్న రోగుల తర్వాత తిరిగి చేర్చండి",
    "Rejoin at the end of the queue": "క్యూ చివరలో తిరిగి చేర్చండి",
    "Patients placed ahead on return; the default is five.":
      "తిరిగివచ్చినప్పుడు ముందుగా ఉండే రోగులు; సాధారణంగా ఐదుగురు.",
    "Add a daily consultation break": "రోజువారీ సంప్రదింపు విరామం జోడించండి",
    "Changes are saved to your clinic workspace.":
      "మార్పులు మీ క్లినిక్ ఖాతాలో సేవ్ అవుతాయి.",
    "Loading setup…": "సెటప్ లోడ్ అవుతోంది…",
    "Could not load clinic setup. Please sign in again.":
      "క్లినిక్ సెటప్ లోడ్ కాలేదు. మళ్లీ సైన్ ఇన్ చేయండి.",
    "Add at least one doctor to finish setup.":
      "సెటప్ పూర్తి చేయడానికి కనీసం ఒక వైద్యుడిని జోడించండి.",
    "Unable to save setup. Please try again.":
      "సెటప్ సేవ్ కాలేదు. మళ్లీ ప్రయత్నించండి.",
    Monday: "సోమవారం",
    Tuesday: "మంగళవారం",
    Wednesday: "బుధవారం",
    Thursday: "గురువారం",
    Friday: "శుక్రవారం",
    Saturday: "శనివారం",
    Sunday: "ఆదివారం",
    monday: "సోమవారం",
    tuesday: "మంగళవారం",
    wednesday: "బుధవారం",
    thursday: "గురువారం",
    friday: "శుక్రవారం",
    saturday: "శనివారం",
    sunday: "ఆదివారం",
    "10 minutes": "10 నిమిషాలు",
    "15 minutes": "15 నిమిషాలు",
    "20 minutes": "20 నిమిషాలు",
    "30 minutes": "30 నిమిషాలు",
  },
  mr: {
    "Configure your team and opening hours. You can adjust these any time.":
      "तुमची टीम आणि कामकाजाच्या वेळा ठरवा. हे कधीही बदलू शकता.",
    "Confirm the details patients will use to find you.":
      "रुग्णांना तुम्हाला शोधण्यासाठी लागणाऱ्या माहितीची खात्री करा.",
    "Add a doctor and set the clinic's regular hours.":
      "डॉक्टर जोडा आणि क्लिनिकच्या नियमित वेळा ठरवा.",
    "Choose a few defaults for the reception team.":
      "रिसेप्शन टीमसाठी काही प्राथमिक पर्याय निवडा.",
    "Turn approaching reminder": "पाळी जवळ आल्याची सूचना",
    "Returned patient queue rule": "परत आलेल्या रुग्णासाठी रांगेचा नियम",
    "Missed turn policy": "चुकलेल्या पाळीचा नियम",
    "Rejoin after eligible waiting patients":
      "प्रतीक्षेत असलेल्या रुग्णांनंतर पुन्हा सामील करा",
    "Rejoin at the end of the queue": "रांगेच्या शेवटी पुन्हा सामील करा",
    "Patients placed ahead on return; the default is five.":
      "परत आल्यावर पुढे असणारे रुग्ण; डीफॉल्ट पाच.",
    "Add a daily consultation break": "दररोजची तपासणी विश्रांती जोडा",
    "Changes are saved to your clinic workspace.":
      "बदल तुमच्या क्लिनिक खात्यात जतन होतील.",
    "Loading setup…": "सेटअप लोड होत आहे…",
    "Could not load clinic setup. Please sign in again.":
      "क्लिनिक सेटअप लोड झाले नाही. पुन्हा लॉगिन करा.",
    "Add at least one doctor to finish setup.":
      "सेटअप पूर्ण करण्यासाठी किमान एक डॉक्टर जोडा.",
    "Unable to save setup. Please try again.":
      "सेटअप जतन झाले नाही. पुन्हा प्रयत्न करा.",
    Monday: "सोमवार",
    Tuesday: "मंगळवार",
    Wednesday: "बुधवार",
    Thursday: "गुरुवार",
    Friday: "शुक्रवार",
    Saturday: "शनिवार",
    Sunday: "रविवार",
    monday: "सोमवार",
    tuesday: "मंगळवार",
    wednesday: "बुधवार",
    thursday: "गुरुवार",
    friday: "शुक्रवार",
    saturday: "शनिवार",
    sunday: "रविवार",
    "10 minutes": "१० मिनिटे",
    "15 minutes": "१५ मिनिटे",
    "20 minutes": "२० मिनिटे",
    "30 minutes": "३० मिनिटे",
  },
};

// Shared clinic controls render outside page-level Localized trees. Keep their
// labels here so navigation, filters, pagination and time controls follow the
// selected language as well.
const clinicUiWords = {
  hi: {
    "Queue dashboard": "कतार डैशबोर्ड",
    "Today's Patients": "आज के मरीज़",
    "Patient History": "मरीज़ों का इतिहास",
    "Clinic settings": "क्लिनिक सेटिंग",
    "Clinic workspace": "क्लिनिक कार्यक्षेत्र",
    WORKSPACE: "कार्यस्थल",
    "Clinic administrator": "क्लिनिक प्रशासक",
    Administrator: "प्रशासक",
    "Sign out": "लॉगआउट",
    "Back to queue": "कतार पर वापस",
    "Table pages": "तालिका पृष्ठ",
    Showing: "दिखाए जा रहे हैं",
    of: "में से",
    Previous: "पिछला",
    Page: "पृष्ठ",
    Next: "अगला",
    rows: "पंक्तियाँ",
    patients: "मरीज़",
    visits: "मुलाक़ातें",
    notifications: "सूचनाएँ",
    "Choose an option": "एक विकल्प चुनें",
    Search: "खोजें",
    "No status found for “": "“ के लिए कोई स्थिति नहीं मिली",
    "Indian states and union territories":
      "भारत के राज्य और केंद्र शासित प्रदेश",
    "No state or Union Territory matches “":
      "“ से कोई राज्य या केंद्र शासित प्रदेश नहीं मिला",
    Selected: "चयनित",
    "Choose ": "चुनें ",
    Hour: "घंटा",
    Minute: "मिनट",
    Period: "अवधि",
    Cancel: "रद्द करें",
    "Apply time": "समय लागू करें",
    "Loading clinic data…": "क्लिनिक डेटा लोड हो रहा है…",
    "Today’s Patients": "आज के मरीज़",
    "Appointments and registrations for your clinic today.":
      "आज आपके क्लिनिक के अपॉइंटमेंट और पंजीकरण।",
    Refresh: "रीफ़्रेश",
    "Clinic date:": "क्लिनिक की तारीख:",
    "Search patient or reference": "मरीज़ या संदर्भ खोजें",
    "Name or reference": "नाम या संदर्भ",
    Status: "स्थिति",
    "All statuses": "सभी स्थितियाँ",
    VISIT: "मुलाक़ात",
    "DATE & TIME": "तारीख और समय",
    ARRIVAL: "आगमन",
    COMPLETED: "पूर्ण",
    "Not arrived": "नहीं पहुँचा",
    Arrived: "पहुँच गए",
    Appointment: "अपॉइंटमेंट",
    "Walk-in": "वॉक-इन",
    "Loading patient records…": "मरीज़ रिकॉर्ड लोड हो रहे हैं…",
    "No patient records found": "कोई मरीज़ रिकॉर्ड नहीं मिला",
    "Try adjusting the search, date range or status filter.":
      "खोज, तारीख सीमा या स्थिति फ़िल्टर बदलें।",
  },
  bn: {
    "Queue dashboard": "সারি ড্যাশবোর্ড",
    "Today's Patients": "আজকের রোগীরা",
    "Patient History": "রোগীর ইতিহাস",
    "Clinic settings": "ক্লিনিক সেটিংস",
    "Clinic workspace": "ক্লিনিক কর্মক্ষেত্র",
    WORKSPACE: "কর্মক্ষেত্র",
    "Clinic administrator": "ক্লিনিক প্রশাসক",
    Administrator: "প্রশাসক",
    "Sign out": "সাইন আউট",
    "Back to queue": "সারিতে ফিরুন",
    "Table pages": "টেবিল পৃষ্ঠা",
    Showing: "দেখানো হচ্ছে",
    of: "এর মধ্যে",
    Previous: "আগের",
    Page: "পৃষ্ঠা",
    Next: "পরের",
    rows: "সারি",
    patients: "রোগী",
    visits: "সাক্ষাৎ",
    notifications: "বিজ্ঞপ্তি",
    "Choose an option": "একটি বিকল্প বেছে নিন",
    Search: "খুঁজুন",
    "No status found for “": "“ এর জন্য কোনও অবস্থা পাওয়া যায়নি",
    "Indian states and union territories": "ভারতের রাজ্য ও কেন্দ্রশাসিত অঞ্চল",
    "No state or Union Territory matches “":
      "“ এর সঙ্গে কোনও রাজ্য বা কেন্দ্রশাসিত অঞ্চল মেলেনি",
    Selected: "নির্বাচিত",
    "Choose ": "বেছে নিন ",
    Hour: "ঘণ্টা",
    Minute: "মিনিট",
    Period: "সময়কাল",
    Cancel: "বাতিল",
    "Apply time": "সময় প্রয়োগ করুন",
    "Loading clinic data…": "ক্লিনিকের তথ্য লোড হচ্ছে…",
    "Today’s Patients": "আজকের রোগীরা",
    "Appointments and registrations for your clinic today.":
      "আজ আপনার ক্লিনিকের অ্যাপয়েন্টমেন্ট ও নিবন্ধন।",
    Refresh: "রিফ্রেশ",
    "Clinic date:": "ক্লিনিকের তারিখ:",
    "Search patient or reference": "রোগী বা রেফারেন্স খুঁজুন",
    "Name or reference": "নাম বা রেফারেন্স",
    Status: "অবস্থা",
    "All statuses": "সব অবস্থা",
    VISIT: "সাক্ষাৎ",
    "DATE & TIME": "তারিখ ও সময়",
    ARRIVAL: "আগমন",
    COMPLETED: "সম্পন্ন",
    "Not arrived": "আসেননি",
    Arrived: "এসেছেন",
    Appointment: "অ্যাপয়েন্টমেন্ট",
    "Walk-in": "ওয়াক-ইন",
    "Loading patient records…": "রোগীর রেকর্ড লোড হচ্ছে…",
    "No patient records found": "কোনও রোগীর রেকর্ড পাওয়া যায়নি",
    "Try adjusting the search, date range or status filter.":
      "অনুসন্ধান, তারিখের সীমা বা স্ট্যাটাস ফিল্টার বদলান।",
  },
  ta: {
    "Queue dashboard": "வரிசை டாஷ்போர்டு",
    "Today's Patients": "இன்றைய நோயாளிகள்",
    "Patient History": "நோயாளி வரலாறு",
    "Clinic settings": "கிளினிக் அமைப்புகள்",
    "Clinic workspace": "கிளினிக் பணியிடம்",
    WORKSPACE: "பணியிடம்",
    "Clinic administrator": "கிளினிக் நிர்வாகி",
    Administrator: "நிர்வாகி",
    "Sign out": "வெளியேறு",
    "Back to queue": "வரிசைக்குத் திரும்பு",
    "Table pages": "அட்டவணைப் பக்கங்கள்",
    Showing: "காட்டப்படுகிறது",
    of: "இல்",
    Previous: "முந்தைய",
    Page: "பக்கம்",
    Next: "அடுத்து",
    rows: "வரிசைகள்",
    patients: "நோயாளிகள்",
    visits: "சந்திப்புகள்",
    notifications: "அறிவிப்புகள்",
    "Choose an option": "ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்",
    Search: "தேடுக",
    "No status found for “": "“ க்கான நிலை கிடைக்கவில்லை",
    "Indian states and union territories":
      "இந்திய மாநிலங்கள் மற்றும் யூனியன் பிரதேசங்கள்",
    "No state or Union Territory matches “":
      "“ உடன் எந்த மாநிலமோ யூனியன் பிரதேசமோ பொருந்தவில்லை",
    Selected: "தேர்ந்தெடுக்கப்பட்டது",
    "Choose ": "தேர்ந்தெடுக்கவும் ",
    Hour: "மணி",
    Minute: "நிமிடம்",
    Period: "காலம்",
    Cancel: "ரத்துசெய்",
    "Apply time": "நேரத்தைப் பயன்படுத்து",
    "Loading clinic data…": "கிளினிக் தகவல் ஏற்றப்படுகிறது…",
    "Today’s Patients": "இன்றைய நோயாளிகள்",
    "Appointments and registrations for your clinic today.":
      "இன்று உங்கள் கிளினிக்கான சந்திப்புகள் மற்றும் பதிவுகள்.",
    Refresh: "புதுப்பி",
    "Clinic date:": "கிளினிக் தேதி:",
    "Search patient or reference": "நோயாளர் அல்லது குறிப்பு தேடுக",
    "Name or reference": "பெயர் அல்லது குறிப்பு",
    Status: "நிலை",
    "All statuses": "அனைத்து நிலைகள்",
    VISIT: "சந்திப்பு",
    "DATE & TIME": "தேதி மற்றும் நேரம்",
    ARRIVAL: "வருகை",
    COMPLETED: "முடிந்தது",
    "Not arrived": "வரவில்லை",
    Arrived: "வந்தார்",
    Appointment: "சந்திப்பு",
    "Walk-in": "நேரடி வருகை",
    "Loading patient records…": "நோயாளர் பதிவுகள் ஏற்றப்படுகின்றன…",
    "No patient records found": "நோயாளர் பதிவுகள் இல்லை",
    "Try adjusting the search, date range or status filter.":
      "தேடல், தேதி வரம்பு அல்லது நிலை வடிகட்டியை மாற்றவும்.",
  },
  te: {
    "Queue dashboard": "క్యూ డ్యాష్‌బోర్డ్",
    "Today's Patients": "ఈరోజు రోగులు",
    "Patient History": "రోగి చరిత్ర",
    "Clinic settings": "క్లినిక్ సెట్టింగ్‌లు",
    "Clinic workspace": "క్లినిక్ కార్యస్థలం",
    WORKSPACE: "కార్యస్థలం",
    "Clinic administrator": "క్లినిక్ నిర్వాహకుడు",
    Administrator: "నిర్వాహకుడు",
    "Sign out": "సైన్ అవుట్",
    "Back to queue": "క్యూకు తిరిగి వెళ్ళండి",
    "Table pages": "పట్టిక పేజీలు",
    Showing: "చూపిస్తున్నవి",
    of: "లో",
    Previous: "మునుపటి",
    Page: "పేజీ",
    Next: "తదుపరి",
    rows: "వరుసలు",
    patients: "రోగులు",
    visits: "సందర్శనలు",
    notifications: "నోటిఫికేషన్‌లు",
    "Choose an option": "ఒక ఎంపికను ఎంచుకోండి",
    Search: "వెతకండి",
    "No status found for “": "“ కోసం స్థితి కనుగొనబడలేదు",
    "Indian states and union territories":
      "భారత రాష్ట్రాలు మరియు కేంద్ర పాలిత ప్రాంతాలు",
    "No state or Union Territory matches “":
      "“ తో ఏ రాష్ట్రం లేదా కేంద్ర పాలిత ప్రాంతం సరిపోలలేదు",
    Selected: "ఎంచుకోబడింది",
    "Choose ": "ఎంచుకోండి ",
    Hour: "గంట",
    Minute: "నిమిషం",
    Period: "కాలం",
    Cancel: "రద్దు",
    "Apply time": "సమయాన్ని వర్తింపజేయండి",
    "Loading clinic data…": "క్లినిక్ సమాచారం లోడ్ అవుతోంది…",
    "Today’s Patients": "ఈరోజు రోగులు",
    "Appointments and registrations for your clinic today.":
      "ఈరోజు మీ క్లినిక్ అపాయింట్‌మెంట్లు మరియు నమోదులు.",
    Refresh: "రిఫ్రెష్",
    "Clinic date:": "క్లినిక్ తేదీ:",
    "Search patient or reference": "రోగి లేదా రిఫరెన్స్ వెతకండి",
    "Name or reference": "పేరు లేదా రిఫరెన్స్",
    Status: "స్థితి",
    "All statuses": "అన్ని స్థితులు",
    VISIT: "సందర్శన",
    "DATE & TIME": "తేదీ మరియు సమయం",
    ARRIVAL: "రాక",
    COMPLETED: "పూర్తయింది",
    "Not arrived": "రాలేదు",
    Arrived: "వచ్చారు",
    Appointment: "అపాయింట్‌మెంట్",
    "Walk-in": "నేరుగా వచ్చినవారు",
    "Loading patient records…": "రోగి రికార్డులు లోడ్ అవుతున్నాయి…",
    "No patient records found": "రోగి రికార్డులు లేవు",
    "Try adjusting the search, date range or status filter.":
      "వెతుకులాట, తేదీ పరిధి లేదా స్థితి ఫిల్టర్‌ను మార్చండి.",
  },
  mr: {
    "Queue dashboard": "रांग डॅशबोर्ड",
    "Today's Patients": "आजचे रुग्ण",
    "Patient History": "रुग्ण इतिहास",
    "Clinic settings": "क्लिनिक सेटिंग्ज",
    "Clinic workspace": "क्लिनिक कार्यक्षेत्र",
    WORKSPACE: "कार्यस्थळ",
    "Clinic administrator": "क्लिनिक प्रशासक",
    Administrator: "प्रशासक",
    "Sign out": "साइन आउट",
    "Back to queue": "रांगेकडे परत",
    "Table pages": "तक्ता पृष्ठे",
    Showing: "दाखवत आहे",
    of: "पैकी",
    Previous: "मागील",
    Page: "पृष्ठ",
    Next: "पुढील",
    rows: "ओळी",
    patients: "रुग्ण",
    visits: "भेटी",
    notifications: "सूचना",
    "Choose an option": "एक पर्याय निवडा",
    Search: "शोधा",
    "No status found for “": "“ साठी स्थिती सापडली नाही",
    "Indian states and union territories":
      "भारतीय राज्ये आणि केंद्रशासित प्रदेश",
    "No state or Union Territory matches “":
      "“ शी कोणतेही राज्य किंवा केंद्रशासित प्रदेश जुळत नाही",
    Selected: "निवडलेले",
    "Choose ": "निवडा ",
    Hour: "तास",
    Minute: "मिनिट",
    Period: "कालावधी",
    Cancel: "रद्द करा",
    "Apply time": "वेळ लागू करा",
    "Loading clinic data…": "क्लिनिक माहिती लोड होत आहे…",
    "Today’s Patients": "आजचे रुग्ण",
    "Appointments and registrations for your clinic today.":
      "आजच्या तुमच्या क्लिनिकच्या अपॉइंटमेंट आणि नोंदणी.",
    Refresh: "रिफ्रेश",
    "Clinic date:": "क्लिनिक तारीख:",
    "Search patient or reference": "रुग्ण किंवा संदर्भ शोधा",
    "Name or reference": "नाव किंवा संदर्भ",
    Status: "स्थिती",
    "All statuses": "सर्व स्थिती",
    VISIT: "भेट",
    "DATE & TIME": "तारीख आणि वेळ",
    ARRIVAL: "आगमन",
    COMPLETED: "पूर्ण",
    "Not arrived": "आले नाहीत",
    Arrived: "आले",
    Appointment: "अपॉइंटमेंट",
    "Walk-in": "थेट भेट",
    "Loading patient records…": "रुग्ण नोंदी लोड होत आहेत…",
    "No patient records found": "रुग्ण नोंदी सापडल्या नाहीत",
    "Try adjusting the search, date range or status filter.":
      "शोध, तारीख श्रेणी किंवा स्थिती फिल्टर बदला.",
  },
};

const landingWords = {
  hi: {
    "ONE SIMPLE VIEW, ALL DAY": "एक सरल दृश्य, पूरे दिन",
    "Everything you need for a calmer clinic visit.":
      "शांत क्लिनिक यात्रा के लिए आपको जो चाहिए।",
    "QueueLess keeps patients informed and gives clinic teams one clear place to manage the day.":
      "QueueLess मरीज़ों को जानकारी देता है और क्लिनिक टीम को दिन संभालने के लिए एक स्पष्ट जगह देता है।",
    "Live queue updates": "लाइव कतार अपडेट",
    "Patients can check their place in line without calling the reception desk.":
      "मरीज़ रिसेप्शन पर कॉल किए बिना कतार में अपनी जगह देख सकते हैं।",
    "Appointments and walk-ins": "अपॉइंटमेंट और वॉक-इन",
    "Bring scheduled visits and same-day registrations together in one working queue.":
      "तय मुलाक़ातों और उसी दिन के पंजीकरण को एक कतार में रखें।",
    "Clear next steps": "अगले स्पष्ट कदम",
    "Give every patient a private link, a token, and simple guidance for their visit.":
      "हर मरीज़ को निजी लिंक, टोकन और मुलाक़ात के लिए सरल निर्देश दें।",
    "FOR PATIENTS": "मरीज़ों के लिए",
    "Spend less time waiting at the clinic.":
      "क्लिनिक में कम समय प्रतीक्षा करें।",
    "Book a visit, save your private appointment link, and return when your place in the queue is getting close.":
      "मुलाक़ात बुक करें, अपना निजी लिंक सहेजें और बारी पास आने पर वापस आएँ।",
    "FOR CLINICS": "क्लिनिकों के लिए",
    "Give your reception team a clearer day.":
      "अपनी रिसेप्शन टीम को बेहतर दिन दें।",
    "Register walk-ins, call the next patient, track consultations, and keep your queue moving from one dashboard.":
      "वॉक-इन पंजीकृत करें, अगले मरीज़ को बुलाएँ और एक डैशबोर्ड से कतार संभालें।",
  },
  bn: {
    "ONE SIMPLE VIEW, ALL DAY": "একটি সহজ দৃশ্য, সারাদিন",
    "Everything you need for a calmer clinic visit.":
      "শান্ত ক্লিনিক ভিজিটের জন্য যা দরকার।",
    "QueueLess keeps patients informed and gives clinic teams one clear place to manage the day.":
      "QueueLess রোগীদের তথ্য জানায় এবং ক্লিনিক টিমকে দিন পরিচালনার জন্য একটি স্পষ্ট জায়গা দেয়।",
    "Live queue updates": "সারির সরাসরি আপডেট",
    "Patients can check their place in line without calling the reception desk.":
      "রোগীরা রিসেপশনে ফোন না করেই সারিতে তাদের স্থান দেখতে পারেন।",
    "Appointments and walk-ins": "অ্যাপয়েন্টমেন্ট ও ওয়াক-ইন",
    "Bring scheduled visits and same-day registrations together in one working queue.":
      "নির্ধারিত ভিজিট এবং একই দিনের নিবন্ধন এক সারিতে রাখুন।",
    "Clear next steps": "পরের ধাপ পরিষ্কার",
    "Give every patient a private link, a token, and simple guidance for their visit.":
      "প্রতিটি রোগীকে ব্যক্তিগত লিঙ্ক, টোকেন ও সহজ নির্দেশনা দিন।",
    "FOR PATIENTS": "রোগীদের জন্য",
    "Spend less time waiting at the clinic.": "ক্লিনিকে কম সময় অপেক্ষা করুন।",
    "Book a visit, save your private appointment link, and return when your place in the queue is getting close.":
      "ভিজিট বুক করুন, ব্যক্তিগত লিঙ্ক সংরক্ষণ করুন এবং আপনার পালা কাছে এলে ফিরে আসুন।",
    "FOR CLINICS": "ক্লিনিকের জন্য",
    "Give your reception team a clearer day.":
      "রিসেপশন টিমকে আরও পরিষ্কার দিন দিন।",
    "Register walk-ins, call the next patient, track consultations, and keep your queue moving from one dashboard.":
      "ওয়াক-ইন নিবন্ধন করুন, পরের রোগীকে ডাকুন এবং এক ড্যাশবোর্ড থেকে সারি চালান।",
  },
  ta: {
    "ONE SIMPLE VIEW, ALL DAY": "ஒரே எளிய காட்சி, நாள் முழுவதும்",
    "Everything you need for a calmer clinic visit.":
      "அமைதியான கிளினிக் வருகைக்கு தேவையான அனைத்தும்.",
    "QueueLess keeps patients informed and gives clinic teams one clear place to manage the day.":
      "QueueLess நோயாளிகளுக்கு தகவல் அளித்து, கிளினிக் குழுவுக்கு நாளை நிர்வகிக்க ஒரே தெளிவான இடம் தருகிறது.",
    "Live queue updates": "நேரடி வரிசை புதுப்பிப்புகள்",
    "Patients can check their place in line without calling the reception desk.":
      "நோயாளிகள் ரிசெப்ஷனுக்கு அழைக்காமல் வரிசையில் தங்கள் இடத்தைப் பார்க்கலாம்.",
    "Appointments and walk-ins": "முன்பதிவுகள் மற்றும் நேரடி வருகைகள்",
    "Bring scheduled visits and same-day registrations together in one working queue.":
      "திட்டமிட்ட வருகைகளையும் அதே நாள் பதிவுகளையும் ஒரே வரிசையில் வைக்கவும்.",
    "Clear next steps": "தெளிவான அடுத்த படிகள்",
    "Give every patient a private link, a token, and simple guidance for their visit.":
      "ஒவ்வொரு நோயாளிக்கும் தனிப்பட்ட இணைப்பு, டோக்கன் மற்றும் எளிய வழிகாட்டுதல் வழங்கவும்.",
    "FOR PATIENTS": "நோயாளிகளுக்காக",
    "Spend less time waiting at the clinic.":
      "கிளினிக்கில் குறைவாக காத்திருங்கள்.",
    "Book a visit, save your private appointment link, and return when your place in the queue is getting close.":
      "வருகையைப் பதிவு செய்து, தனிப்பட்ட இணைப்பை சேமித்து, உங்கள் முறை நெருங்கும்போது திரும்பவும்.",
    "FOR CLINICS": "கிளினிக்குகளுக்காக",
    "Give your reception team a clearer day.":
      "ரிசெப்ஷன் குழுவுக்கு தெளிவான நாளை அளியுங்கள்.",
    "Register walk-ins, call the next patient, track consultations, and keep your queue moving from one dashboard.":
      "நேரடி வருகைகளைப் பதிவு செய்து, அடுத்த நோயாளியை அழைத்து, ஒரே டாஷ்போர்டில் வரிசையை நிர்வகிக்கவும்.",
  },
  te: {
    "ONE SIMPLE VIEW, ALL DAY": "రోజంతా ఒక సులభమైన దృశ్యం",
    "Everything you need for a calmer clinic visit.":
      "ప్రశాంతమైన క్లినిక్ సందర్శనకు కావాల్సిన ప్రతిదీ.",
    "QueueLess keeps patients informed and gives clinic teams one clear place to manage the day.":
      "QueueLess రోగులకు సమాచారం అందించి, క్లినిక్ బృందానికి రోజును నిర్వహించడానికి ఒక స్పష్టమైన స్థలాన్ని ఇస్తుంది.",
    "Live queue updates": "ప్రత్యక్ష క్యూ నవీకరణలు",
    "Patients can check their place in line without calling the reception desk.":
      "రోగులు రిసెప్షన్‌కు ఫోన్ చేయకుండా క్యూలో తమ స్థానాన్ని చూడవచ్చు.",
    "Appointments and walk-ins": "అపాయింట్‌మెంట్లు మరియు వాక్-ఇన్‌లు",
    "Bring scheduled visits and same-day registrations together in one working queue.":
      "షెడ్యూల్ చేసిన సందర్శనలు, అదే రోజు నమోదులను ఒకే క్యూలో ఉంచండి.",
    "Clear next steps": "స్పష్టమైన తదుపరి దశలు",
    "Give every patient a private link, a token, and simple guidance for their visit.":
      "ప్రతి రోగికి ప్రైవేట్ లింక్, టోకెన్, సులభమైన మార్గదర్శకత్వం ఇవ్వండి.",
    "FOR PATIENTS": "రోగుల కోసం",
    "Spend less time waiting at the clinic.":
      "క్లినిక్‌లో తక్కువ సమయం వేచి ఉండండి.",
    "Book a visit, save your private appointment link, and return when your place in the queue is getting close.":
      "సందర్శన బుక్ చేసి, ప్రైవేట్ లింక్‌ను సేవ్ చేసి, మీ వంతు దగ్గరైనప్పుడు తిరిగి రండి.",
    "FOR CLINICS": "క్లినిక్‌ల కోసం",
    "Give your reception team a clearer day.":
      "రిసెప్షన్ బృందానికి స్పష్టమైన రోజును ఇవ్వండి.",
    "Register walk-ins, call the next patient, track consultations, and keep your queue moving from one dashboard.":
      "వాక్-ఇన్‌లను నమోదు చేసి, తదుపరి రోగిని పిలిచి, ఒక డ్యాష్‌బోర్డ్ నుండి క్యూను నిర్వహించండి.",
  },
  mr: {
    "ONE SIMPLE VIEW, ALL DAY": "सोपे दृश्य, दिवसभर",
    "Everything you need for a calmer clinic visit.":
      "सोप्या क्लिनिक भेटीसाठी आवश्यक सर्वकाही.",
    "QueueLess keeps patients informed and gives clinic teams one clear place to manage the day.":
      "QueueLess रुग्णांना माहिती देतो आणि क्लिनिक टीमला दिवस हाताळण्यासाठी एक स्पष्ट जागा देतो.",
    "Live queue updates": "थेट रांग अद्यतने",
    "Patients can check their place in line without calling the reception desk.":
      "रुग्ण रिसेप्शनला फोन न करता रांगेतील आपली जागा पाहू शकतात.",
    "Appointments and walk-ins": "अपॉइंटमेंट आणि थेट भेटी",
    "Bring scheduled visits and same-day registrations together in one working queue.":
      "नियोजित भेटी आणि त्याच दिवसाच्या नोंदी एका रांगेत ठेवा.",
    "Clear next steps": "पुढील स्पष्ट पावले",
    "Give every patient a private link, a token, and simple guidance for their visit.":
      "प्रत्येक रुग्णाला खासगी लिंक, टोकन आणि सोपे मार्गदर्शन द्या.",
    "FOR PATIENTS": "रुग्णांसाठी",
    "Spend less time waiting at the clinic.": "क्लिनिकमध्ये कमी वेळ थांबा.",
    "Book a visit, save your private appointment link, and return when your place in the queue is getting close.":
      "भेट बुक करा, खासगी लिंक जतन करा आणि तुमची पाळी जवळ आल्यावर परत या.",
    "FOR CLINICS": "क्लिनिकसाठी",
    "Give your reception team a clearer day.":
      "रिसेप्शन टीमला अधिक स्पष्ट दिवस द्या.",
    "Register walk-ins, call the next patient, track consultations, and keep your queue moving from one dashboard.":
      "थेट भेटी नोंदवा, पुढील रुग्णाला बोलवा आणि एका डॅशबोर्डवरून रांग चालवा.",
  },
};

const landingCoreWords = {
  hi: {
    "A BETTER VISIT, STEP BY STEP": "बेहतर मुलाक़ात, हर कदम पर",
    "Good care starts": "अच्छी देखभाल शुरू होती है",
    "before the consult.": "मुलाक़ात से पहले।",
    "Know where you stand": "अपनी स्थिति जानें",
    "Patients get a token and a live view of their place in line.":
      "मरीज़ को टोकन और कतार में अपनी जगह की ताज़ा जानकारी मिलती है।",
    "Wait on your terms": "अपनी सुविधा से इंतज़ार करें",
    "Come back when your turn is getting close, with clear guidance.":
      "बारी पास आने पर साफ़ सूचना के साथ वापस आएँ।",
    "Keep the day flowing": "दिन को सुचारू रखें",
    "Your team manages walk-ins and appointments from one simple queue.":
      "आपकी टीम वॉक-इन और अपॉइंटमेंट एक ही कतार से संभाले।",
    "YOUR CLINIC, IN BETTER FLOW": "आपका क्लिनिक, बेहतर व्यवस्था में",
    "Make room for": "जगह बनाएँ",
    "what matters.": "ज़रूरी बातों के लिए।",
    "Set up your clinic and start a one-month free trial. No payment details needed to begin.":
      "क्लिनिक सेट करें और एक महीने का मुफ़्त ट्रायल शुरू करें। शुरुआत में भुगतान की जानकारी ज़रूरी नहीं।",
    "Create your clinic": "अपना क्लिनिक बनाएँ",
    Contact: "संपर्क",
    Privacy: "गोपनीयता",
    Terms: "नियम",
  },
  bn: {
    "A BETTER VISIT, STEP BY STEP": "আরও ভালো ভিজিট, ধাপে ধাপে",
    "Good care starts": "ভালো যত্ন শুরু হয়",
    "before the consult.": "পরামর্শের আগে।",
    "Know where you stand": "নিজের অবস্থান জানুন",
    "Patients get a token and a live view of their place in line.":
      "রোগীরা টোকেন ও সারিতে নিজেদের অবস্থানের সরাসরি তথ্য পান।",
    "Wait on your terms": "নিজের সুবিধামতো অপেক্ষা করুন",
    "Come back when your turn is getting close, with clear guidance.":
      "আপনার পালা কাছে এলে স্পষ্ট নির্দেশনা নিয়ে ফিরে আসুন।",
    "Keep the day flowing": "দিনটি সচল রাখুন",
    "Your team manages walk-ins and appointments from one simple queue.":
      "আপনার টিম এক সারি থেকে ওয়াক-ইন ও অ্যাপয়েন্টমেন্ট পরিচালনা করে।",
    "YOUR CLINIC, IN BETTER FLOW": "আপনার ক্লিনিক, আরও ভালো প্রবাহে",
    "Make room for": "জায়গা রাখুন",
    "what matters.": "যা গুরুত্বপূর্ণ তার জন্য।",
    "Set up your clinic and start a one-month free trial. No payment details needed to begin.":
      "আপনার ক্লিনিক সেট আপ করুন এবং এক মাসের বিনামূল্যে ট্রায়াল শুরু করুন।",
    "Create your clinic": "আপনার ক্লিনিক তৈরি করুন",
    Contact: "যোগাযোগ",
    Privacy: "গোপনীয়তা",
    Terms: "শর্তাবলি",
  },
  ta: {
    "A BETTER VISIT, STEP BY STEP": "சிறந்த வருகை, படிப்படியாக",
    "Good care starts": "நல்ல பராமரிப்பு தொடங்குவது",
    "before the consult.": "ஆலோசனைக்கு முன்.",
    "Know where you stand": "உங்கள் நிலையை அறியுங்கள்",
    "Patients get a token and a live view of their place in line.":
      "நோயாளிகள் டோக்கனையும் வரிசையில் தங்கள் இடத்தையும் நேரடியாகப் பார்க்கலாம்.",
    "Wait on your terms": "உங்கள் விருப்பப்படி காத்திருங்கள்",
    "Come back when your turn is getting close, with clear guidance.":
      "உங்கள் முறை நெருங்கும்போது தெளிவான வழிகாட்டுதலுடன் திரும்பவும்.",
    "Keep the day flowing": "நாளை சீராக நடத்துங்கள்",
    "Your team manages walk-ins and appointments from one simple queue.":
      "உங்கள் குழு ஒரே வரிசையில் நேரடி வருகைகளையும் முன்பதிவுகளையும் நிர்வகிக்கிறது.",
    "YOUR CLINIC, IN BETTER FLOW": "உங்கள் கிளினிக், சிறந்த ஓட்டத்தில்",
    "Make room for": "இடம் ஒதுக்குங்கள்",
    "what matters.": "முக்கியமானவற்றுக்கு.",
    "Set up your clinic and start a one-month free trial. No payment details needed to begin.":
      "உங்கள் கிளினிக்கை அமைத்து ஒரு மாத இலவச சோதனையைத் தொடங்குங்கள்.",
    "Create your clinic": "உங்கள் கிளினிக்கை உருவாக்குங்கள்",
    Contact: "தொடர்பு",
    Privacy: "தனியுரிமை",
    Terms: "விதிமுறைகள்",
  },
  te: {
    "A BETTER VISIT, STEP BY STEP": "మెరుగైన సందర్శన, దశలవారీగా",
    "Good care starts": "మంచి సంరక్షణ ప్రారంభమవుతుంది",
    "before the consult.": "సంప్రదింపుకు ముందు.",
    "Know where you stand": "మీ స్థానం తెలుసుకోండి",
    "Patients get a token and a live view of their place in line.":
      "రోగులు టోకెన్, క్యూలో తమ స్థానాన్ని ప్రత్యక్షంగా చూడగలరు.",
    "Wait on your terms": "మీ సౌకర్యానికి వేచి ఉండండి",
    "Come back when your turn is getting close, with clear guidance.":
      "మీ వంతు దగ్గరైనప్పుడు స్పష్టమైన మార్గదర్శకంతో తిరిగి రండి.",
    "Keep the day flowing": "రోజును సజావుగా నడపండి",
    "Your team manages walk-ins and appointments from one simple queue.":
      "మీ బృందం ఒకే క్యూ నుండి వాక్-ఇన్\u200cలు, అపాయింట్\u200cమెంట్లను నిర్వహిస్తుంది.",
    "YOUR CLINIC, IN BETTER FLOW": "మీ క్లినిక్, మెరుగైన ప్రవాహంలో",
    "Make room for": "స్థలం ఇవ్వండి",
    "what matters.": "ముఖ్యమైన వాటికి.",
    "Set up your clinic and start a one-month free trial. No payment details needed to begin.":
      "మీ క్లినిక్\u200cను ఏర్పాటు చేసి ఒక నెల ఉచిత ట్రయల్ ప్రారంభించండి.",
    "Create your clinic": "మీ క్లినిక్\u200cను సృష్టించండి",
    Contact: "సంప్రదించండి",
    Privacy: "గోప్యత",
    Terms: "నిబంధనలు",
  },
  mr: {
    "A BETTER VISIT, STEP BY STEP": "उत्तम भेट, टप्प्याटप्प्याने",
    "Good care starts": "चांगली काळजी सुरू होते",
    "before the consult.": "तपासणीपूर्वी.",
    "Know where you stand": "तुमची जागा जाणून घ्या",
    "Patients get a token and a live view of their place in line.":
      "रुग्णांना टोकन आणि रांगेतील त्यांच्या जागेची थेट माहिती मिळते.",
    "Wait on your terms": "तुमच्या सोयीनुसार थांबा",
    "Come back when your turn is getting close, with clear guidance.":
      "तुमची पाळी जवळ आल्यावर स्पष्ट मार्गदर्शनासह परत या.",
    "Keep the day flowing": "दिवस सुरळीत चालू ठेवा",
    "Your team manages walk-ins and appointments from one simple queue.":
      "तुमची टीम एका रांगेतून थेट भेटी आणि अपॉइंटमेंट हाताळते.",
    "YOUR CLINIC, IN BETTER FLOW": "तुमचे क्लिनिक, अधिक सुरळीत",
    "Make room for": "जागा ठेवा",
    "what matters.": "महत्त्वाच्या गोष्टींसाठी.",
    "Set up your clinic and start a one-month free trial. No payment details needed to begin.":
      "तुमचे क्लिनिक सेट करा आणि एक महिन्याची मोफत चाचणी सुरू करा. सुरुवातीला पेमेंट तपशीलाची गरज नाही.",
    "Create your clinic": "तुमचे क्लिनिक तयार करा",
    Contact: "संपर्क",
    Privacy: "गोपनीयता",
    Terms: "अटी",
  },
};

Object.assign(landingCoreWords.bn, {
  "BUILT FOR THE PEOPLE WHO KEEP CLINICS MOVING":
    "যারা ক্লিনিককে সচল রাখেন তাদের জন্য",
  "Independent clinics": "স্বতন্ত্র ক্লিনিক",
  "Reception teams": "রিসেপশন টিম",
  "Patients on the go": "চলতি পথে রোগীরা",
});
Object.assign(landingCoreWords.ta, {
  "BUILT FOR THE PEOPLE WHO KEEP CLINICS MOVING":
    "கிளினிக்குகளை இயக்குபவர்களுக்காக",
  "Independent clinics": "சுயாதீன கிளினிக்குகள்",
  "Reception teams": "ரிசெப்ஷன் குழுக்கள்",
  "Patients on the go": "பயணத்தில் உள்ள நோயாளிகள்",
});
Object.assign(landingCoreWords.te, {
  "BUILT FOR THE PEOPLE WHO KEEP CLINICS MOVING":
    "క్లినిక్‌లను సజావుగా నడిపేవారి కోసం",
  "Independent clinics": "స్వతంత్ర క్లినిక్‌లు",
  "Reception teams": "రిసెప్షన్ బృందాలు",
  "Patients on the go": "ప్రయాణంలో ఉన్న రోగులు",
});
Object.assign(landingCoreWords.mr, {
  "BUILT FOR THE PEOPLE WHO KEEP CLINICS MOVING":
    "क्लिनिक सुरळीत चालवणाऱ्यांसाठी",
  "Independent clinics": "स्वतंत्र क्लिनिक",
  "Reception teams": "रिसेप्शन टीम",
  "Patients on the go": "प्रवासातील रुग्ण",
});

const recentFeatureWords = {
  hi: {
    Analytics: "विश्लेषण",
    "CLINIC INSIGHTS": "क्लिनिक जानकारी",
    "See how the clinic day is moving and where patients wait.":
      "देखें कि क्लिनिक का दिन कैसे चल रहा है और मरीज़ कहाँ प्रतीक्षा कर रहे हैं।",
    Date: "तारीख",
    "Loading clinic analytics…": "क्लिनिक विश्लेषण लोड हो रहा है…",
    Registered: "पंजीकृत",
    "visits booked or added": "बुक या जोड़ी गई मुलाक़ातें",
    "consultations finished": "परामर्श पूरे हुए",
    Waiting: "प्रतीक्षा में",
    "patients still in queue": "मरीज़ अभी कतार में हैं",
    Missed: "छूटी हुई",
    "patients not seen": "जिन मरीज़ों को नहीं देखा गया",
    "Average wait": "औसत प्रतीक्षा",
    "from checked-in completed visits": "चेक-इन की गई पूरी मुलाक़ातों से",
    "BUSIEST HOURS": "सबसे व्यस्त समय",
    "When patients arrive most": "जब सबसे अधिक मरीज़ आते हैं",
    "Based on appointment times and walk-in registrations.":
      "अपॉइंटमेंट समय और वॉक-इन पंजीकरण पर आधारित।",
    visits: "मुलाक़ातें",
    "No visits recorded for this date.":
      "इस तारीख के लिए कोई मुलाक़ात दर्ज नहीं है।",
    "Missed appointment": "छूटी हुई अपॉइंटमेंट",
    "We did not record a check-in for this visit. You can choose a new available time below.":
      "इस मुलाक़ात के लिए चेक-इन दर्ज नहीं हुआ। नीचे नया उपलब्ध समय चुनें।",
    "APPOINTMENT CHANGE": "अपॉइंटमेंट बदलाव",
    "Change your appointment": "अपनी अपॉइंटमेंट बदलें",
    "Rebook your missed appointment": "छूटी हुई अपॉइंटमेंट फिर से बुक करें",
    "Choose a new appointment time": "नई अपॉइंटमेंट का समय चुनें",
    "Your current appointment remains reserved until you confirm a new time.":
      "नया समय पुष्टि करने तक आपकी मौजूदा अपॉइंटमेंट आरक्षित रहेगी।",
    "Choose a new available time for your missed visit.":
      "छूटी हुई मुलाक़ात के लिए नया उपलब्ध समय चुनें।",
    "Your doctor is unavailable for this visit. Your existing booking stays protected until you confirm a replacement.":
      "इस मुलाक़ात के लिए डॉक्टर उपलब्ध नहीं हैं। नया समय पुष्टि करने तक आपकी मौजूदा बुकिंग सुरक्षित रहेगी।",
    "Finding available times…": "उपलब्ध समय खोजा जा रहा है…",
    "Choose a new time": "नया समय चुनें",
    "View available times": "उपलब्ध समय देखें",
    "Choose a date": "तारीख चुनें",
    "Choose a time": "समय चुनें",
    "Select a time": "समय चुनें",
    "Confirming…": "पुष्टि की जा रही है…",
    "Confirm new appointment": "नई अपॉइंटमेंट की पुष्टि करें",
    "Your new appointment has been confirmed.":
      "आपकी नई अपॉइंटमेंट की पुष्टि हो गई है।",
    "No future appointment slots are available. Please contact the clinic.":
      "भविष्य के लिए कोई अपॉइंटमेंट स्लॉट उपलब्ध नहीं है। कृपया क्लिनिक से संपर्क करें।",
    "Refreshing…": "रीफ़्रेश हो रहा है…",
    min: "मिनट",
    "Show password": "पासवर्ड दिखाएँ",
    "Hide password": "पासवर्ड छिपाएँ",
    "Enter a valid 10-digit Indian mobile number.":
      "मान्य 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।",
    "This appointment has changed. Refresh and choose a time again.":
      "यह अपॉइंटमेंट बदल गई है। रीफ़्रेश करके फिर समय चुनें।",
    "This appointment can no longer be changed.":
      "इस अपॉइंटमेंट को अब बदला नहीं जा सकता।",
    "That replacement slot is no longer available. Choose another time.":
      "वह वैकल्पिक स्लॉट अब उपलब्ध नहीं है। दूसरा समय चुनें।",
    "This doctor is unavailable at that time. Choose another slot.":
      "डॉक्टर उस समय उपलब्ध नहीं हैं। दूसरा स्लॉट चुनें।",
  },
  bn: {
    Analytics: "বিশ্লেষণ",
    "CLINIC INSIGHTS": "ক্লিনিকের তথ্য",
    "See how the clinic day is moving and where patients wait.":
      "ক্লিনিকের দিন কীভাবে চলছে এবং রোগীরা কোথায় অপেক্ষা করছেন দেখুন।",
    Date: "তারিখ",
    "Loading clinic analytics…": "ক্লিনিক বিশ্লেষণ লোড হচ্ছে…",
    Registered: "নিবন্ধিত",
    "visits booked or added": "বুক করা বা যোগ করা ভিজিট",
    "consultations finished": "পরামর্শ সম্পন্ন হয়েছে",
    Waiting: "অপেক্ষমাণ",
    "patients still in queue": "রোগীরা এখনও সারিতে আছেন",
    Missed: "মিস হয়েছে",
    "patients not seen": "যেসব রোগীকে দেখা হয়নি",
    "Average wait": "গড় অপেক্ষা",
    "from checked-in completed visits": "চেক-ইন করা সম্পন্ন ভিজিট থেকে",
    "BUSIEST HOURS": "সবচেয়ে ব্যস্ত সময়",
    "When patients arrive most": "যখন সবচেয়ে বেশি রোগী আসেন",
    "Based on appointment times and walk-in registrations.":
      "অ্যাপয়েন্টমেন্টের সময় ও ওয়াক-ইন নিবন্ধনের ভিত্তিতে।",
    visits: "ভিজিট",
    "No visits recorded for this date.": "এই তারিখে কোনো ভিজিট রেকর্ড নেই।",
    "Missed appointment": "মিস হওয়া অ্যাপয়েন্টমেন্ট",
    "We did not record a check-in for this visit. You can choose a new available time below.":
      "এই ভিজিটের জন্য কোনো চেক-ইন রেকর্ড হয়নি। নিচে নতুন উপলব্ধ সময় বেছে নিন।",
    "APPOINTMENT CHANGE": "অ্যাপয়েন্টমেন্ট পরিবর্তন",
    "Change your appointment": "আপনার অ্যাপয়েন্টমেন্ট পরিবর্তন করুন",
    "Rebook your missed appointment":
      "মিস হওয়া অ্যাপয়েন্টমেন্ট আবার বুক করুন",
    "Choose a new appointment time": "নতুন অ্যাপয়েন্টমেন্টের সময় বেছে নিন",
    "Your current appointment remains reserved until you confirm a new time.":
      "নতুন সময় নিশ্চিত না করা পর্যন্ত আপনার বর্তমান অ্যাপয়েন্টমেন্ট সংরক্ষিত থাকবে।",
    "Choose a new available time for your missed visit.":
      "মিস হওয়া ভিজিটের জন্য নতুন উপলব্ধ সময় বেছে নিন।",
    "Your doctor is unavailable for this visit. Your existing booking stays protected until you confirm a replacement.":
      "এই ভিজিটের জন্য আপনার ডাক্তার উপলব্ধ নন। বিকল্প নিশ্চিত না করা পর্যন্ত আপনার বুকিং সুরক্ষিত থাকবে।",
    "Finding available times…": "উপলব্ধ সময় খোঁজা হচ্ছে…",
    "Choose a new time": "নতুন সময় বেছে নিন",
    "View available times": "উপলব্ধ সময় দেখুন",
    "Choose a date": "তারিখ বেছে নিন",
    "Choose a time": "সময় বেছে নিন",
    "Select a time": "সময় নির্বাচন করুন",
    "Confirming…": "নিশ্চিত করা হচ্ছে…",
    "Confirm new appointment": "নতুন অ্যাপয়েন্টমেন্ট নিশ্চিত করুন",
    "Your new appointment has been confirmed.":
      "আপনার নতুন অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে।",
    "No future appointment slots are available. Please contact the clinic.":
      "ভবিষ্যতের কোনো অ্যাপয়েন্টমেন্ট স্লট উপলব্ধ নেই। ক্লিনিকে যোগাযোগ করুন।",
    "Refreshing…": "রিফ্রেশ হচ্ছে…",
    min: "মিনিট",
    "Show password": "পাসওয়ার্ড দেখান",
    "Hide password": "পাসওয়ার্ড লুকান",
    "Enter a valid 10-digit Indian mobile number.":
      "একটি বৈধ ১০ অঙ্কের ভারতীয় মোবাইল নম্বর লিখুন।",
    "This appointment has changed. Refresh and choose a time again.":
      "এই অ্যাপয়েন্টমেন্ট পরিবর্তিত হয়েছে। রিফ্রেশ করে আবার সময় বেছে নিন।",
    "This appointment can no longer be changed.":
      "এই অ্যাপয়েন্টমেন্ট আর পরিবর্তন করা যাবে না।",
    "That replacement slot is no longer available. Choose another time.":
      "বিকল্প স্লটটি আর উপলব্ধ নেই। অন্য সময় বেছে নিন।",
    "This doctor is unavailable at that time. Choose another slot.":
      "ডাক্তার ওই সময় উপলব্ধ নন। অন্য স্লট বেছে নিন।",
  },
  ta: {
    Analytics: "பகுப்பாய்வு",
    "CLINIC INSIGHTS": "கிளினிக் தகவல்கள்",
    "See how the clinic day is moving and where patients wait.":
      "கிளினிக் நாள் எவ்வாறு நகர்கிறது, நோயாளிகள் எங்கு காத்திருக்கிறார்கள் என்பதைப் பாருங்கள்.",
    Date: "தேதி",
    "Loading clinic analytics…": "கிளினிக் பகுப்பாய்வு ஏற்றப்படுகிறது…",
    Registered: "பதிவு செய்யப்பட்டவை",
    "visits booked or added":
      "முன்பதிவு செய்யப்பட்ட அல்லது சேர்க்கப்பட்ட வருகைகள்",
    "consultations finished": "ஆலோசனைகள் முடிந்தன",
    Waiting: "காத்திருப்பு",
    "patients still in queue": "நோயாளிகள் இன்னும் வரிசையில் உள்ளனர்",
    Missed: "தவறியது",
    "patients not seen": "பார்க்கப்படாத நோயாளிகள்",
    "Average wait": "சராசரி காத்திருப்பு",
    "from checked-in completed visits":
      "செக்-இன் செய்யப்பட்ட முடிந்த வருகைகளிலிருந்து",
    "BUSIEST HOURS": "அதிக நெரிசல் நேரங்கள்",
    "When patients arrive most": "அதிக நோயாளிகள் வரும் நேரம்",
    "Based on appointment times and walk-in registrations.":
      "முன்பதிவு நேரம் மற்றும் நேரடி பதிவு அடிப்படையில்.",
    visits: "வருகைகள்",
    "No visits recorded for this date.":
      "இந்த தேதிக்கு வருகைகள் பதிவு செய்யப்படவில்லை.",
    "Missed appointment": "தவறிய முன்பதிவு",
    "We did not record a check-in for this visit. You can choose a new available time below.":
      "இந்த வருகைக்கு செக்-இன் பதிவு இல்லை. கீழே புதிய கிடைக்கும் நேரத்தைத் தேர்ந்தெடுக்கலாம்.",
    "APPOINTMENT CHANGE": "முன்பதிவு மாற்றம்",
    "Change your appointment": "உங்கள் முன்பதிவை மாற்றுங்கள்",
    "Rebook your missed appointment":
      "தவறிய முன்பதிவை மீண்டும் பதிவு செய்யுங்கள்",
    "Choose a new appointment time":
      "புதிய முன்பதிவு நேரத்தைத் தேர்ந்தெடுக்கவும்",
    "Your current appointment remains reserved until you confirm a new time.":
      "புதிய நேரத்தை உறுதிப்படுத்தும் வரை உங்கள் தற்போதைய முன்பதிவு ஒதுக்கப்பட்டிருக்கும்.",
    "Choose a new available time for your missed visit.":
      "தவறிய வருகைக்கு புதிய கிடைக்கும் நேரத்தைத் தேர்ந்தெடுக்கவும்.",
    "Your doctor is unavailable for this visit. Your existing booking stays protected until you confirm a replacement.":
      "இந்த வருகைக்கு உங்கள் மருத்துவர் கிடைக்கவில்லை. மாற்று நேரத்தை உறுதிப்படுத்தும் வரை உங்கள் முன்பதிவு பாதுகாக்கப்படும்.",
    "Finding available times…": "கிடைக்கும் நேரங்கள் தேடப்படுகின்றன…",
    "Choose a new time": "புதிய நேரத்தைத் தேர்ந்தெடுக்கவும்",
    "View available times": "கிடைக்கும் நேரங்களைப் பார்க்கவும்",
    "Choose a date": "தேதியைத் தேர்ந்தெடுக்கவும்",
    "Choose a time": "நேரத்தைத் தேர்ந்தெடுக்கவும்",
    "Select a time": "நேரத்தைத் தேர்ந்தெடுக்கவும்",
    "Confirming…": "உறுதிப்படுத்தப்படுகிறது…",
    "Confirm new appointment": "புதிய முன்பதிவை உறுதிப்படுத்தவும்",
    "Your new appointment has been confirmed.":
      "உங்கள் புதிய முன்பதிவு உறுதிப்படுத்தப்பட்டது.",
    "No future appointment slots are available. Please contact the clinic.":
      "எதிர்கால முன்பதிவு இடங்கள் இல்லை. கிளினிக்கைத் தொடர்புகொள்ளவும்.",
    "Refreshing…": "புதுப்பிக்கப்படுகிறது…",
    min: "நிமிடம்",
    "Show password": "கடவுச்சொல்லைக் காண்பி",
    "Hide password": "கடவுச்சொல்லை மறை",
    "Enter a valid 10-digit Indian mobile number.":
      "சரியான 10 இலக்க இந்திய மொபைல் எண்ணை உள்ளிடவும்.",
    "This appointment has changed. Refresh and choose a time again.":
      "இந்த முன்பதிவு மாறிவிட்டது. புதுப்பித்து மீண்டும் நேரத்தைத் தேர்ந்தெடுக்கவும்.",
    "This appointment can no longer be changed.":
      "இந்த முன்பதிவை இனி மாற்ற முடியாது.",
    "That replacement slot is no longer available. Choose another time.":
      "அந்த மாற்று இடம் இனி கிடைக்காது. வேறு நேரத்தைத் தேர்ந்தெடுக்கவும்.",
    "This doctor is unavailable at that time. Choose another slot.":
      "அந்த நேரத்தில் மருத்துவர் கிடைக்கவில்லை. வேறு இடத்தைத் தேர்ந்தெடுக்கவும்.",
  },
  te: {
    Analytics: "విశ్లేషణలు",
    "CLINIC INSIGHTS": "క్లినిక్ సమాచారం",
    "See how the clinic day is moving and where patients wait.":
      "క్లినిక్ రోజు ఎలా సాగుతోంది, రోగులు ఎక్కడ వేచి ఉన్నారో చూడండి.",
    Date: "తేదీ",
    "Loading clinic analytics…": "క్లినిక్ విశ్లేషణలు లోడ్ అవుతున్నాయి…",
    Registered: "నమోదైనవి",
    "visits booked or added": "బుక్ చేసిన లేదా జోడించిన సందర్శనలు",
    "consultations finished": "సంప్రదింపులు పూర్తయ్యాయి",
    Waiting: "వేచి ఉన్నారు",
    "patients still in queue": "రోగులు ఇంకా క్యూలో ఉన్నారు",
    Missed: "తప్పిపోయింది",
    "patients not seen": "చూడని రోగులు",
    "Average wait": "సగటు నిరీక్షణ",
    "from checked-in completed visits":
      "చెక్-ఇన్ చేసిన పూర్తయిన సందర్శనల నుండి",
    "BUSIEST HOURS": "అత్యంత రద్దీ సమయాలు",
    "When patients arrive most": "అత్యధిక రోగులు వచ్చే సమయం",
    "Based on appointment times and walk-in registrations.":
      "అపాయింట్‌మెంట్ సమయాలు మరియు వాక్-ఇన్ నమోదుల ఆధారంగా.",
    visits: "సందర్శనలు",
    "No visits recorded for this date.": "ఈ తేదీకి సందర్శనలు నమోదు కాలేదు.",
    "Missed appointment": "తప్పిపోయిన అపాయింట్‌మెంట్",
    "We did not record a check-in for this visit. You can choose a new available time below.":
      "ఈ సందర్శనకు చెక్-ఇన్ నమోదు కాలేదు. దిగువన కొత్త అందుబాటులో ఉన్న సమయాన్ని ఎంచుకోండి.",
    "APPOINTMENT CHANGE": "అపాయింట్‌మెంట్ మార్పు",
    "Change your appointment": "మీ అపాయింట్‌మెంట్ మార్చండి",
    "Rebook your missed appointment":
      "తప్పిపోయిన అపాయింట్‌మెంట్‌ను మళ్లీ బుక్ చేయండి",
    "Choose a new appointment time": "కొత్త అపాయింట్‌మెంట్ సమయాన్ని ఎంచుకోండి",
    "Your current appointment remains reserved until you confirm a new time.":
      "కొత్త సమయాన్ని నిర్ధారించే వరకు మీ ప్రస్తుత అపాయింట్‌మెంట్ రిజర్వ్‌గా ఉంటుంది.",
    "Choose a new available time for your missed visit.":
      "తప్పిపోయిన సందర్శనకు కొత్త అందుబాటులో ఉన్న సమయాన్ని ఎంచుకోండి.",
    "Your doctor is unavailable for this visit. Your existing booking stays protected until you confirm a replacement.":
      "ఈ సందర్శనకు మీ వైద్యుడు అందుబాటులో లేరు. ప్రత్యామ్నాయం నిర్ధారించే వరకు మీ బుకింగ్ రక్షించబడుతుంది.",
    "Finding available times…": "అందుబాటులో ఉన్న సమయాలు వెతుకుతున్నాం…",
    "Choose a new time": "కొత్త సమయాన్ని ఎంచుకోండి",
    "View available times": "అందుబాటులో ఉన్న సమయాలను చూడండి",
    "Choose a date": "తేదీని ఎంచుకోండి",
    "Choose a time": "సమయాన్ని ఎంచుకోండి",
    "Select a time": "సమయాన్ని ఎంచుకోండి",
    "Confirming…": "నిర్ధారిస్తోంది…",
    "Confirm new appointment": "కొత్త అపాయింట్‌మెంట్ నిర్ధారించండి",
    "Your new appointment has been confirmed.":
      "మీ కొత్త అపాయింట్‌మెంట్ నిర్ధారించబడింది.",
    "No future appointment slots are available. Please contact the clinic.":
      "భవిష్యత్ అపాయింట్‌మెంట్ స్లాట్‌లు లేవు. క్లినిక్‌ను సంప్రదించండి.",
    "Refreshing…": "రిఫ్రెష్ అవుతోంది…",
    min: "నిమిషాలు",
    "Show password": "పాస్‌వర్డ్ చూపించు",
    "Hide password": "పాస్‌వర్డ్ దాచు",
    "Enter a valid 10-digit Indian mobile number.":
      "చెల్లుబాటు అయ్యే 10 అంకెల భారతీయ మొబైల్ నంబర్ నమోదు చేయండి.",
    "This appointment has changed. Refresh and choose a time again.":
      "ఈ అపాయింట్‌మెంట్ మారింది. రిఫ్రెష్ చేసి మళ్లీ సమయాన్ని ఎంచుకోండి.",
    "This appointment can no longer be changed.":
      "ఈ అపాయింట్‌మెంట్‌ను ఇక మార్చలేరు.",
    "That replacement slot is no longer available. Choose another time.":
      "ఆ ప్రత్యామ్నాయ స్లాట్ ఇక అందుబాటులో లేదు. వేరే సమయాన్ని ఎంచుకోండి.",
    "This doctor is unavailable at that time. Choose another slot.":
      "ఆ సమయంలో వైద్యుడు అందుబాటులో లేరు. వేరే స్లాట్ ఎంచుకోండి.",
  },
  mr: {
    Analytics: "विश्लेषण",
    "CLINIC INSIGHTS": "क्लिनिक माहिती",
    "See how the clinic day is moving and where patients wait.":
      "क्लिनिकचा दिवस कसा चालला आहे आणि रुग्ण कुठे थांबले आहेत ते पाहा.",
    Date: "तारीख",
    "Loading clinic analytics…": "क्लिनिक विश्लेषण लोड होत आहे…",
    Registered: "नोंदणीकृत",
    "visits booked or added": "बुक केलेल्या किंवा जोडलेल्या भेटी",
    "consultations finished": "सल्लामसलत पूर्ण",
    Waiting: "प्रतीक्षेत",
    "patients still in queue": "रुग्ण अजून रांगेत आहेत",
    Missed: "चुकलेले",
    "patients not seen": "न पाहिलेले रुग्ण",
    "Average wait": "सरासरी प्रतीक्षा",
    "from checked-in completed visits": "चेक-इन केलेल्या पूर्ण भेटींमधून",
    "BUSIEST HOURS": "सर्वाधिक व्यस्त वेळा",
    "When patients arrive most": "जेव्हा सर्वाधिक रुग्ण येतात",
    "Based on appointment times and walk-in registrations.":
      "अपॉइंटमेंट वेळा आणि थेट भेट नोंदींवर आधारित.",
    visits: "भेटी",
    "No visits recorded for this date.":
      "या तारखेसाठी कोणत्याही भेटी नोंदल्या नाहीत.",
    "Missed appointment": "चुकलेली अपॉइंटमेंट",
    "We did not record a check-in for this visit. You can choose a new available time below.":
      "या भेटीसाठी चेक-इन नोंदले गेले नाही. खाली नवीन उपलब्ध वेळ निवडा.",
    "APPOINTMENT CHANGE": "अपॉइंटमेंट बदल",
    "Change your appointment": "तुमची अपॉइंटमेंट बदला",
    "Rebook your missed appointment": "चुकलेली अपॉइंटमेंट पुन्हा बुक करा",
    "Choose a new appointment time": "नवीन अपॉइंटमेंट वेळ निवडा",
    "Your current appointment remains reserved until you confirm a new time.":
      "तुम्ही नवीन वेळ निश्चित करेपर्यंत तुमची सध्याची अपॉइंटमेंट राखीव राहील.",
    "Choose a new available time for your missed visit.":
      "चुकलेल्या भेटीसाठी नवीन उपलब्ध वेळ निवडा.",
    "Your doctor is unavailable for this visit. Your existing booking stays protected until you confirm a replacement.":
      "या भेटीसाठी तुमचे डॉक्टर उपलब्ध नाहीत. पर्यायी वेळ निश्चित करेपर्यंत तुमचे बुकिंग सुरक्षित राहील.",
    "Finding available times…": "उपलब्ध वेळा शोधत आहोत…",
    "Choose a new time": "नवीन वेळ निवडा",
    "View available times": "उपलब्ध वेळा पहा",
    "Choose a date": "तारीख निवडा",
    "Choose a time": "वेळ निवडा",
    "Select a time": "वेळ निवडा",
    "Confirming…": "निश्चित करत आहे…",
    "Confirm new appointment": "नवीन अपॉइंटमेंट निश्चित करा",
    "Your new appointment has been confirmed.":
      "तुमची नवीन अपॉइंटमेंट निश्चित झाली आहे.",
    "No future appointment slots are available. Please contact the clinic.":
      "भविष्यातील अपॉइंटमेंट स्लॉट उपलब्ध नाहीत. कृपया क्लिनिकशी संपर्क साधा.",
    "Refreshing…": "रिफ्रेश होत आहे…",
    min: "मिनिटे",
    "Show password": "पासवर्ड दाखवा",
    "Hide password": "पासवर्ड लपवा",
    "Enter a valid 10-digit Indian mobile number.":
      "वैध 10 अंकी भारतीय मोबाईल नंबर टाका.",
    "This appointment has changed. Refresh and choose a time again.":
      "ही अपॉइंटमेंट बदलली आहे. रिफ्रेश करून पुन्हा वेळ निवडा.",
    "This appointment can no longer be changed.":
      "ही अपॉइंटमेंट आता बदलता येणार नाही.",
    "That replacement slot is no longer available. Choose another time.":
      "तो पर्यायी स्लॉट आता उपलब्ध नाही. दुसरी वेळ निवडा.",
    "This doctor is unavailable at that time. Choose another slot.":
      "त्या वेळी डॉक्टर उपलब्ध नाहीत. दुसरा स्लॉट निवडा.",
  },
};

Object.assign(recentFeatureWords.hi, {
  "VISIT FEEDBACK": "मुलाक़ात प्रतिक्रिया",
  "How was your visit?": "आपकी मुलाक़ात कैसी रही?",
  "Your feedback helps the clinic improve future visits.":
    "आपकी प्रतिक्रिया क्लिनिक को भविष्य की मुलाक़ातें बेहतर बनाने में मदद करती है।",
  "Rate your visit": "अपनी मुलाक़ात को रेट करें",
  "out of 5": "5 में से",
  "Helpful staff": "सहायक स्टाफ",
  "Clear updates": "स्पष्ट जानकारी",
  "Short wait": "कम प्रतीक्षा",
  "Good consultation": "अच्छा परामर्श",
  "Optional comment": "वैकल्पिक टिप्पणी",
  "Tell us more about your visit": "अपनी मुलाक़ात के बारे में और बताएँ",
  "Submit feedback": "प्रतिक्रिया भेजें",
  "Submitting…": "भेजा जा रहा है…",
  "Thank you for your feedback": "आपकी प्रतिक्रिया के लिए धन्यवाद",
  "You rated this visit": "आपने इस मुलाक़ात को रेट किया",
  "Visit rating": "मुलाक़ात रेटिंग",
  "feedback responses": "प्रतिक्रिया उत्तर",
  "no feedback responses yet": "अभी कोई प्रतिक्रिया नहीं",
  "Feedback is available after your consultation is completed.":
    "परामर्श पूरा होने के बाद प्रतिक्रिया उपलब्ध होगी।",
  "Feedback has already been submitted.":
    "प्रतिक्रिया पहले ही भेजी जा चुकी है।",
  "Your feedback could not be submitted. Please try again.":
    "आपकी प्रतिक्रिया नहीं भेजी जा सकी। कृपया फिर कोशिश करें।",
  "Thank you for sharing your feedback.":
    "अपनी प्रतिक्रिया साझा करने के लिए धन्यवाद।",
});
Object.assign(recentFeatureWords.bn, {
  "VISIT FEEDBACK": "সাক্ষাৎ প্রতিক্রিয়া",
  "How was your visit?": "আপনার সাক্ষাৎ কেমন ছিল?",
  "Your feedback helps the clinic improve future visits.":
    "আপনার প্রতিক্রিয়া ক্লিনিককে ভবিষ্যতের সাক্ষাৎ উন্নত করতে সাহায্য করে।",
  "Rate your visit": "আপনার সাক্ষাৎ মূল্যায়ন করুন",
  "out of 5": "৫-এর মধ্যে",
  "Helpful staff": "সহায়ক কর্মী",
  "Clear updates": "স্পষ্ট আপডেট",
  "Short wait": "কম অপেক্ষা",
  "Good consultation": "ভালো পরামর্শ",
  "Optional comment": "ঐচ্ছিক মন্তব্য",
  "Tell us more about your visit": "আপনার সাক্ষাৎ সম্পর্কে আরও বলুন",
  "Submit feedback": "প্রতিক্রিয়া পাঠান",
  "Submitting…": "পাঠানো হচ্ছে…",
  "Thank you for your feedback": "আপনার প্রতিক্রিয়ার জন্য ধন্যবাদ",
  "You rated this visit": "আপনি এই সাক্ষাৎ মূল্যায়ন করেছেন",
  "Visit rating": "সাক্ষাৎ রেটিং",
  "feedback responses": "প্রতিক্রিয়া",
  "no feedback responses yet": "এখনও কোনো প্রতিক্রিয়া নেই",
  "Feedback is available after your consultation is completed.":
    "পরামর্শ সম্পন্ন হওয়ার পরে প্রতিক্রিয়া পাওয়া যাবে।",
  "Feedback has already been submitted.":
    "প্রতিক্রিয়া ইতিমধ্যে পাঠানো হয়েছে।",
  "Your feedback could not be submitted. Please try again.":
    "আপনার প্রতিক্রিয়া পাঠানো যায়নি। আবার চেষ্টা করুন।",
  "Thank you for sharing your feedback.":
    "আপনার প্রতিক্রিয়া ভাগ করে নেওয়ার জন্য ধন্যবাদ।",
});
Object.assign(recentFeatureWords.ta, {
  "VISIT FEEDBACK": "வருகை கருத்து",
  "How was your visit?": "உங்கள் வருகை எப்படி இருந்தது?",
  "Your feedback helps the clinic improve future visits.":
    "உங்கள் கருத்து எதிர்கால வருகைகளை மேம்படுத்த கிளினிக்கிற்கு உதவுகிறது।",
  "Rate your visit": "உங்கள் வருகையை மதிப்பிடுங்கள்",
  "out of 5": "5 இல்",
  "Helpful staff": "உதவிகரமான பணியாளர்கள்",
  "Clear updates": "தெளிவான தகவல்கள்",
  "Short wait": "குறைந்த காத்திருப்பு",
  "Good consultation": "நல்ல ஆலோசனை",
  "Optional comment": "விருப்பக் கருத்து",
  "Tell us more about your visit": "உங்கள் வருகையைப் பற்றி மேலும் கூறுங்கள்",
  "Submit feedback": "கருத்தை அனுப்பவும்",
  "Submitting…": "அனுப்பப்படுகிறது…",
  "Thank you for your feedback": "உங்கள் கருத்துக்கு நன்றி",
  "You rated this visit": "இந்த வருகைக்கு நீங்கள் அளித்த மதிப்பீடு",
  "Visit rating": "வருகை மதிப்பீடு",
  "feedback responses": "கருத்துகள்",
  "no feedback responses yet": "இன்னும் கருத்துகள் இல்லை",
  "Feedback is available after your consultation is completed.":
    "ஆலோசனை முடிந்த பின் கருத்து வழங்கலாம்।",
  "Feedback has already been submitted.": "கருத்து ஏற்கனவே அனுப்பப்பட்டது।",
  "Your feedback could not be submitted. Please try again.":
    "கருத்தை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்।",
  "Thank you for sharing your feedback.":
    "உங்கள் கருத்தைப் பகிர்ந்ததற்கு நன்றி।",
});
Object.assign(recentFeatureWords.te, {
  "VISIT FEEDBACK": "సందర్శన అభిప్రాయం",
  "How was your visit?": "మీ సందర్శన ఎలా ఉంది?",
  "Your feedback helps the clinic improve future visits.":
    "మీ అభిప్రాయం భవిష్యత్ సందర్శనలను మెరుగుపరచడంలో క్లినిక్‌కు సహాయపడుతుంది।",
  "Rate your visit": "మీ సందర్శనకు రేటింగ్ ఇవ్వండి",
  "out of 5": "5 లో",
  "Helpful staff": "సహాయక సిబ్బంది",
  "Clear updates": "స్పష్టమైన సమాచారం",
  "Short wait": "తక్కువ వేచి ఉండటం",
  "Good consultation": "మంచి సంప్రదింపులు",
  "Optional comment": "ఐచ్ఛిక వ్యాఖ్య",
  "Tell us more about your visit": "మీ సందర్శన గురించి మరింత చెప్పండి",
  "Submit feedback": "అభిప్రాయం పంపండి",
  "Submitting…": "పంపుతోంది…",
  "Thank you for your feedback": "మీ అభిప్రాయానికి ధన్యవాదాలు",
  "You rated this visit": "మీరు ఈ సందర్శనకు రేటింగ్ ఇచ్చారు",
  "Visit rating": "సందర్శన రేటింగ్",
  "feedback responses": "అభిప్రాయాలు",
  "no feedback responses yet": "ఇంకా అభిప్రాయాలు లేవు",
  "Feedback is available after your consultation is completed.":
    "సంప్రదింపులు పూర్తయిన తర్వాత అభిప్రాయం అందుబాటులో ఉంటుంది।",
  "Feedback has already been submitted.": "అభిప్రాయం ఇప్పటికే పంపబడింది।",
  "Your feedback could not be submitted. Please try again.":
    "మీ అభిప్రాయం పంపబడలేదు. మళ్లీ ప్రయత్నించండి।",
  "Thank you for sharing your feedback.":
    "మీ అభిప్రాయాన్ని పంచుకున్నందుకు ధన్యవాదాలు।",
});
Object.assign(recentFeatureWords.mr, {
  "VISIT FEEDBACK": "भेटीचा अभिप्राय",
  "How was your visit?": "तुमची भेट कशी होती?",
  "Your feedback helps the clinic improve future visits.":
    "तुमचा अभिप्राय क्लिनिकला भविष्यातील भेटी सुधारण्यास मदत करतो।",
  "Rate your visit": "तुमच्या भेटीला रेटिंग द्या",
  "out of 5": "5 पैकी",
  "Helpful staff": "मदत करणारे कर्मचारी",
  "Clear updates": "स्पष्ट माहिती",
  "Short wait": "कमी प्रतीक्षा",
  "Good consultation": "चांगला सल्ला",
  "Optional comment": "ऐच्छिक टिप्पणी",
  "Tell us more about your visit": "तुमच्या भेटीबद्दल अधिक सांगा",
  "Submit feedback": "अभिप्राय पाठवा",
  "Submitting…": "पाठवत आहे…",
  "Thank you for your feedback": "तुमच्या अभिप्रायाबद्दल धन्यवाद",
  "You rated this visit": "तुम्ही या भेटीला रेटिंग दिले",
  "Visit rating": "भेटीचे रेटिंग",
  "feedback responses": "अभिप्राय",
  "no feedback responses yet": "अजून अभिप्राय नाही",
  "Feedback is available after your consultation is completed.":
    "सल्लामसलत पूर्ण झाल्यावर अभिप्राय उपलब्ध होईल।",
  "Feedback has already been submitted.": "अभिप्राय आधीच पाठवला आहे।",
  "Your feedback could not be submitted. Please try again.":
    "तुमचा अभिप्राय पाठवता आला नाही. पुन्हा प्रयत्न करा।",
  "Thank you for sharing your feedback.":
    "तुमचा अभिप्राय शेअर केल्याबद्दल धन्यवाद।",
});

Object.assign(recentFeatureWords.hi, {
  reviews: "समीक्षाएँ",
  "No ratings yet": "अभी कोई रेटिंग नहीं",
});
Object.assign(recentFeatureWords.bn, {
  reviews: "পর্যালোচনা",
  "No ratings yet": "এখনও কোনো রেটিং নেই",
});
Object.assign(recentFeatureWords.ta, {
  reviews: "மதிப்புரைகள்",
  "No ratings yet": "இன்னும் மதிப்பீடுகள் இல்லை",
});
Object.assign(recentFeatureWords.te, {
  reviews: "సమీక్షలు",
  "No ratings yet": "ఇంకా రేటింగ్‌లు లేవు",
});
Object.assign(recentFeatureWords.mr, {
  reviews: "पुनरावलोकने",
  "No ratings yet": "अजून रेटिंग नाही",
});

const languageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const stored = localStorage.getItem("queueless.language");
    return LANGUAGES.some((item) => item.code === stored) ? stored : "en";
  });
  const setLanguage = (code) => {
    if (!LANGUAGES.some((item) => item.code === code)) return;
    localStorage.setItem("queueless.language", code);
    setLanguageState(code);
  };
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const locale =
    LANGUAGES.find((item) => item.code === language)?.locale || "en-IN";
  const value = useMemo(
    () => ({ language, locale, setLanguage }),
    [language, locale],
  );
  return (
    <languageContext.Provider value={value}>
      {children}
    </languageContext.Provider>
  );
}

function translated(value, language) {
  if (typeof value !== "string" || language === "en") return value;
  const trimmed = value.trim().replace(/\s+/g, " ");
  const replacement =
    words[language]?.[trimmed] ||
    clinicWords[language]?.[trimmed] ||
    statusWords[language]?.[trimmed] ||
    screenWords[language]?.[trimmed] ||
    clinicUiWords[language]?.[trimmed] ||
    recentFeatureWords[language]?.[trimmed] ||
    landingWords[language]?.[trimmed] ||
    landingCoreWords[language]?.[trimmed];
  if (!replacement) return value;
  const start = value.match(/^\s*/)?.[0] || "";
  const end = value.match(/\s*$/)?.[0] || "";
  return `${start}${replacement}${end}`;
}

function translateTree(node, language) {
  if (typeof node === "string") return translated(node, language);
  if (Array.isArray(node))
    return Children.map(node, (child) => translateTree(child, language));
  if (!isValidElement(node)) return node;
  const props = { ...node.props };
  if (props.children !== undefined)
    props.children = translateTree(props.children, language);
  for (const attribute of ["placeholder", "title", "aria-label", "alt"]) {
    if (typeof props[attribute] === "string")
      props[attribute] = translated(props[attribute], language);
  }
  return cloneElement(node, props);
}

export function Localized({ children }) {
  const { language } = useContext(languageContext);
  return (
    <div
      className={`localized-content lang-${language}`}
      lang={LANGUAGES.find((item) => item.code === language)?.locale || "en-IN"}
    >
      {translateTree(children, language)}
    </div>
  );
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useContext(languageContext);
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const languageNames = {
    en: "English",
    hi: "हिन्दी",
    bn: "বাংলা",
    ta: "தமிழ்",
    te: "తెలుగు",
    mr: "मराठी",
  };
  const languageDescriptions = {
    en: "English · India",
    hi: "Hindi · भारत",
    bn: "Bengali · ভারত",
    ta: "Tamil · இந்தியா",
    te: "Telugu · భారతదేశం",
    mr: "Marathi · भारत",
  };
  const scripts = { en: "Aa", hi: "अ", bn: "অ", ta: "அ", te: "అ", mr: "म" };
  const copy = {
    en: [
      "Choose your language",
      "Pick the language you feel most comfortable with.",
      "Saved on this device",
    ],
    hi: [
      "अपनी भाषा चुनें",
      "जिस भाषा में आप सहज हों, उसे चुनें।",
      "इस डिवाइस पर सेव होगा",
    ],
    bn: [
      "আপনার ভাষা বেছে নিন",
      "যে ভাষায় আপনি স্বচ্ছন্দ, সেটি বেছে নিন।",
      "এই ডিভাইসে সংরক্ষিত হবে",
    ],
    ta: [
      "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
      "உங்களுக்கு வசதியான மொழியைத் தேர்ந்தெடுக்கவும்.",
      "இந்தச் சாதனத்தில் சேமிக்கப்படும்",
    ],
    te: [
      "మీ భాషను ఎంచుకోండి",
      "మీకు సౌకర్యమైన భాషను ఎంచుకోండి.",
      "ఈ పరికరంలో సేవ్ అవుతుంది",
    ],
    mr: [
      "तुमची भाषा निवडा",
      "तुम्हाला सोयीची वाटणारी भाषा निवडा.",
      "या डिव्हाइसवर जतन होईल",
    ],
  }[language];
  useEffect(() => {
    if (!open) return undefined;
    const closeWhenOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return (
    <div className="language-switcher" ref={root}>
      <button
        className="language-trigger"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${copy[0]} · ${languageNames[language]}`}
      >
        <span className="language-trigger-globe" aria-hidden="true">
          文
        </span>
        <span className="language-trigger-copy">
          <small>LANGUAGE / भाषा</small>
          <strong>{languageNames[language]}</strong>
        </span>
        <span className="language-trigger-chevron" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <section
          className="language-popover"
          role="dialog"
          aria-label={copy[0]}
        >
          <header className="language-popover-heading">
            <div>
              <span className="language-overline">QUEUELESS · INDIA</span>
              <h2>{copy[0]}</h2>
              <p>{copy[1]}</p>
            </div>
            <button
              className="language-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close language menu"
            >
              ×
            </button>
          </header>
          <div
            className="language-options"
            role="radiogroup"
            aria-label={copy[0]}
          >
            {LANGUAGES.map((item) => (
              <button
                className={`language-option ${language === item.code ? "is-selected" : ""}`}
                key={item.code}
                type="button"
                role="radio"
                aria-checked={language === item.code}
                onClick={() => {
                  setLanguage(item.code);
                  setOpen(false);
                }}
              >
                <span className={`language-script script-${item.code}`}>
                  {scripts[item.code]}
                </span>
                <span className="language-option-copy">
                  <strong>{languageNames[item.code]}</strong>
                  <small>{languageDescriptions[item.code]}</small>
                </span>
                <span className="language-check" aria-hidden="true">
                  {language === item.code ? "✓" : ""}
                </span>
              </button>
            ))}
          </div>
          <footer className="language-popover-foot">
            <span className="privacy-mark">✓</span>
            {copy[2]}
          </footer>
        </section>
      )}
    </div>
  );
}

export function useAppLanguage() {
  return useContext(languageContext);
}

export function useTranslate() {
  const { language } = useContext(languageContext);
  return useMemo(() => (value) => translated(value, language), [language]);
}
