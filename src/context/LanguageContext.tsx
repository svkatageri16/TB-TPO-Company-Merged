import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'mr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    welcome: "Welcome",
    dashboard: "Dashboard",
    profile: "Profile",
    jobs: "Jobs",
    analytics: "Analytics",
    hired: "Hired",
    apply_now: "Apply Now",
    streak: "Career Streak",
    xp: "XP Points",
    ready_to_hire: "Ready to Hire",
    technical_fit: "Technical Fit",
    intelligence_command: "Intelligence Command Center",
    good_morning: "Good Morning",
    good_afternoon: "Good Afternoon",
    good_evening: "Good Evening",
    closer_than: "You are closer than 78% students to getting hired today.",
    talent_score: "VEGA Employability Score",
    ai_mentor: "AI Career Mentor",
    career_velocity: "Career Velocity Trend",
    master_profile: "Master Profile",
    elite_tools: "Elite Career Tools",
    resume_builder: "High-ATS Resume",
    ai_resume_intel: "AI Resume Intelligence",
    upload_resume: "Upload PDF Resume",
    skill_intel: "Skill Intelligence",
    hiring_pipeline: "Hiring Pipeline Status",
    view_all: "View All",
    recent_talent: "Recent Talent",
    post_role: "Post Global Role",
    active_pipeline: "Active Pipeline",
    open_campaigns: "Open Campaigns",
    daily_quests: "Daily Quests",
    daily_checkin: "Daily Check-in",
    login_account: "Login to your account",
    claim: "Claim",
    invite_friends: "Invite Friends",
    earn_xp_referral: "Earn 60 XP for every friend who joins VEGA using your referral link. Use XP for Rewards!",
    copy: "Copy",
    share_whatsapp: "Share via WhatsApp",
    application_tracker: "Application Tracker",
    top_matches: "Top Job Matches",
    view_details: "View Details",
    applications: "Applications",
    my_applications: "My Applications",
    ai_mentor_personalized: "Personalized Growth Strategy",
    view_roadmap: "View Roadmap",
    skill_intelligence: "Skill Intelligence",
    psychometric_assessment: "Psychometric Assessment",
    mandatory_verification: "Mandatory Verification",
    start_assessment: "Start Assessment Now",
    psychometric_profile: "Psychometric Profile",
    overall_score: "Overall Score",
    behavioral_summary: "Behavioral Summary",
    generating_chart: "Generating Chart Data...",
    active_tracks: "Active Tracks",
    position: "Position",
    company: "Company",
    current_round: "Current Round",
    status: "Status",
    deadline: "Deadline",
    applied: "Applied",
    action_required: "Action Required",
    no_deadline: "No Deadline",
    closed: "Closed",
    no_active_apps: "No active applications found. Explore jobs to get started!",
    achievement_unlocked: "Achievement Unlocked: Hired!",
    congratulations_selected: "Congratulations, You're Selected!",
    view_offer: "View Offer Details",
    profile_incomplete: "Profile Incomplete",
    complete_now: "Complete Now",
    close: "Close",
    application_sent: "Application Sent",
    upload_pdf_resume: "Upload PDF Resume",
    analyzing: "Analyzing...",
    job_readiness: "Job Readiness Index",
    recommended_positions: "Recommended Positions",
    view_all_jobs: "View All Jobs",
    no_jobs: "No specialized jobs matching your profile yet.",
    elite_profile: "Elite Profile",
    growing: "Growing",
    impact: "Impact",
    views: "Views",
    rank: "Rank",
    global: "Global",
    hiring_readiness: "Hiring Readiness",
    growth: "Growth",
    hired_desc_pt1: "Great news! You have been selected for ",
    hired_desc_pt2: " at ",
    hired_desc_pt3: ". Check your email for next steps.",
    profile_incomplete_desc_pt1: "You need at least 70% profile completeness to apply for jobs. Currently at ",
    profile_incomplete_desc_pt2: "%.",
    jobs_nav: "Jobs",
    browse_jobs: "Browse Jobs",
    resume_nav: "Resume Focus",
    ai_mock: "AI Mock",
    ai_quiz: "AI Quiz",
    start_new_session: "Start New Session",
    performance_archives: "Performance Archives",
    signed_in_as: "Signed in as",
    verify_account: "Verify Account",
    view_profile: "View Profile",
    company_profile: "Company Profile",
    sign_out: "Sign out",
    hiring_portal: "Hiring Portal",
    admin_panel: "Admin Panel",
    rewards_and_xp: "Rewards & XP",
    buy_xp: "Buy XP",
    home_neural: "Neural Hiring Protocol v2.0",
    home_headline_1: "The ",
    home_headline_2: "Future",
    home_headline_3: " Is Intelligent.",
    home_desc: "Stop searching. Start evolving. VEGA is an AI-First ecosystem that engineers your career path through predictive analytics and emotional intelligence.",
    home_init_growth: "Initialize Your Growth",
    home_scan_roles: "Scan Global Roles",
    home_matrix: "The Intelligence Matrix",
    command_center_active: "Command Center Active",
    setup_headline: "Setup your profile headline",
    my_profile: "My Profile",
    talent: "Talent",
    personalized_strategy: "Personalized Strategy",
    employability_score: "Employability Score",
    explore_all: "Explore All",
    no_active_pipeline: "No Active Pipeline",
    milestone_unlocked: "Milestone Unlocked",
    profile_strength: "Profile Strength",
    login_maintain_streak: "Login to maintain streak",
    closes_on: "Closes On",
    completed: "Completed",
    claim_reward: "Claim Reward",
    recommended_drops: "Recommended Drops",
    rolling: "Rolling",
    resume_builder_btn: "Resume Builder",
    find_jobs: "Find Jobs",
    completed_xp: "Completed (+50 XP)",
    no_active_pipeline_desc: "Apply for jobs to see your progress tracked here automatically.",
    youve_been_selected: "You've Been Selected!",
    refer_and_earn_xp: "Refer & Earn XP",
    invite_friends_desc: "Invite friends. Both gets +60 XP per signup.",
    refer_and_earn_program: "Refer & Earn Program",
    refer_friends_earn_rewards: "Refer Your Friends & Earn Rewards",
    refer_friends_desc: "Help your friends join VEGA. When they enroll & get placed, you earn exciting rewards.",
    refer_and_earn_now: "Refer & Earn Now",
    copied: "Copied!",
    share_on_whatsapp: "Share on WhatsApp",
    edit_profile: "Edit Profile",
    day_streak: "Day Streak",
  },
  mr: {
    welcome: "स्वागत आहे",
    dashboard: "डॅशबोर्ड",
    profile: "प्रोफाइल",
    jobs: "नोकरी",
    analytics: "विश्लेषण",
    hired: "निवड झाली",
    apply_now: "आता अर्ज करा",
    streak: "करिअरची सातत्य",
    xp: "एक्सपी पॉइंट्स",
    ready_to_hire: "भरतीसाठी तयार",
    technical_fit: "तांत्रिक पात्रता",
    intelligence_command: "इंटेलिजन्स कमांड सेंटर",
    good_morning: "शुभ प्रभात",
    good_afternoon: "शुभ दुपार",
    good_evening: "शुभ संध्याकाळ",
    closer_than: "आज तुम्ही निवड होण्याच्या 78% विद्यार्थ्यांपेक्षा जवळ आहात.",
    talent_score: "टॅलेंटब्रिज स्कोर",
    ai_mentor: "AI करिअर मार्गदर्शक",
    career_velocity: "करिअर प्रगतीचा कल",
    master_profile: "प्रोफाइल मास्टर करा",
    elite_tools: "एलिट करिअर साधने",
    resume_builder: "हाय-ATS रिझ्युमे",
    ai_resume_intel: "AI रिझ्युमे बुद्धिमत्ता",
    upload_resume: "PDF रिझ्युमे अपलोड करा",
    skill_intel: "कौशल्य बुद्धिमत्ता",
    hiring_pipeline: "भरती प्रक्रियेची स्थिती",
    view_all: "सर्व पहा",
    recent_talent: "अलीकडील प्रतिभा",
    post_role: "नवीन नोकरी टाका",
    active_pipeline: "सक्रिय पाइपलाइन",
    open_campaigns: "सक्रिय मोहिमा",
    daily_quests: "दैनिक कार्ये",
    daily_checkin: "दैनिक चेक-इन",
    login_account: "खात्यात लॉगिन करा",
    claim: "मिळवा",
    invite_friends: "मित्रांना आमंत्रित करा",
    earn_xp_referral: "तुमच्या रेफरल लिंकवरून जॉईन होणाऱ्या प्रत्येक मित्रासाठी ६० XP मिळवा. हे XP बक्षिसांसाठी वापरा!",
    copy: "कॉपी",
    share_whatsapp: "WhatsApp वर शेअर करा",
    application_tracker: "अर्ज ट्रॅकर",
    top_matches: "टॉप नोकरीचे पर्याय",
    view_details: "तपशील पहा",
    applications: "अर्ज",
    my_applications: "माझे अर्ज",
    ai_mentor_personalized: "वैयक्तिकृत वाढ धोरण",
    view_roadmap: "रोडमॅप पहा",
    skill_intelligence: "कौशल्य बुद्धिमत्ता",
    psychometric_assessment: "सायकोमेट्रिक मूल्यांकन",
    mandatory_verification: "अनिवार्य पडताळणी",
    start_assessment: "आता मूल्यांकन सुरू करा",
    psychometric_profile: "सायकोमेट्रिक प्रोफाइल",
    overall_score: "एकूण गुण",
    behavioral_summary: "वर्तणुकीचा सारांश",
    generating_chart: "चार्ट डेटा तयार करत आहे...",
    active_tracks: "सक्रिय ट्रॅक्स",
    position: "पदाचे नाव",
    company: "कंपनी",
    current_round: "सध्याची फेरी",
    status: "स्थिती",
    deadline: "अंतिम मुदत",
    applied: "अर्ज केला",
    action_required: "कारवाई आवश्यक",
    no_deadline: "मुदत नाही",
    closed: "बंद",
    no_active_apps: "कोणतेही सक्रिय अर्ज नाहीत. नोकर्‍या शोधा!",
    achievement_unlocked: "यश प्राप्त: नोकरी मिळाली!",
    congratulations_selected: "अभिनंदन, तुमची निवड झाली आहे!",
    view_offer: "ऑफर तपशील पहा",
    profile_incomplete: "प्रोफाइल अपूर्ण",
    complete_now: "आता पूर्ण करा",
    close: "बंद करा",
    application_sent: "अर्ज पाठवला",
    upload_pdf_resume: "PDF रिझ्युमे अपलोड करा",
    analyzing: "विश्लेषण करत आहे...",
    job_readiness: "नोकरीची तयारी",
    recommended_positions: "शिफारस केलेल्या नोकर्‍या",
    view_all_jobs: "सर्व नोकर्‍या पहा",
    no_jobs: "तुमच्या प्रोफाईलशी जुळणाऱ्या नोकर्‍या अद्याप नाहीत.",
    elite_profile: "उत्कृष्ट प्रोफाइल",
    growing: "वाढत आहे",
    impact: "प्रभाव",
    views: "दृश्ये",
    rank: "रँक",
    global: "जागतिक",
    hiring_readiness: "नोकरीस तत्परता",
    growth: "वाढ",
    hired_desc_pt1: "उत्तम बातमी! तुमची ",
    hired_desc_pt2: " येथे ",
    hired_desc_pt3: " साठी निवड झाली आहे. पुढील चरणांसाठी तुमचा ईमेल तपासा.",
    profile_incomplete_desc_pt1: "नोकरीसाठी अर्ज करण्यासाठी तुमचे प्रोफाइल किमान ७०% पूर्ण असणे आवश्यक आहे. सध्या ",
    profile_incomplete_desc_pt2: "% पूर्ण आहे.",
    jobs_nav: "नोकऱ्या",
    browse_jobs: "नोकर्‍या शोधा",
    resume_nav: "रिझ्युमे",
    ai_mock: "AI मॉक",
    ai_quiz: "AI क्विझ",
    start_new_session: "नवीन सत्र सुरू करा",
    performance_archives: "कामगिरी अभिलेख",
    signed_in_as: "म्हणून साइन इन केले:",
    verify_account: "खाते सत्यापित करा",
    view_profile: "प्रोफाइल पहा",
    company_profile: "कंपनी प्रोफाइल",
    sign_out: "साइन आउट करा",
    hiring_portal: "नोकरभरती पोर्टल",
    admin_panel: "प्रशासन पॅनेल",
    rewards_and_xp: "रीवॉर्ड्स आणि XP",
    buy_xp: "XP खरेदी करा",
    home_neural: "न्यूरल हायरिंग प्रोटोकॉल २.०",
    home_headline_1: "भविष्य ",
    home_headline_2: "बुद्धिमान",
    home_headline_3: " आहे.",
    home_desc: "शोधणे थांबवा. विकसित होण्यास सुरुवात करा. टॅलेंटब्रिज एक एआय-प्रथम इकोसिस्टम आहे जी प्रीडिक्टिव ऍनालिटिक्स आणि भावनिक बुद्धिमत्तेद्वारे तुमच्या करियरचा मार्ग तयार करते.",
    home_init_growth: "तुमची वाढ सुरू करा",
    home_scan_roles: "जागतिक नोकऱ्या शोधा",
    home_matrix: "इंटेलिजन्स मॅट्रिक्स",
    command_center_active: "कमांड सेंटर सक्रिय",
    setup_headline: "तुमचे प्रोफाइल हेडलाईन सेट करा",
    my_profile: "माझे प्रोफाइल",
    talent: "गुणवंत",
    personalized_strategy: "वैयक्तिकृत धोरण",
    employability_score: "रोजगार पात्रता गुण",
    explore_all: "सर्व एक्सप्लोर करा",
    no_active_pipeline: "सक्रिय पाईपलाईन नाही",
    milestone_unlocked: "टप्पा गाठला",
    profile_strength: "प्रोफाइलची ताकद",
    login_maintain_streak: "सातत्य टिकवण्यासाठी लॉगिन करा",
    closes_on: "बंद होण्याची तारीख",
    completed: "पूर्ण झाले",
    claim_reward: "बक्षीस मिळवा",
    recommended_drops: "शिफारस केलेल्या नोकऱ्या",
    rolling: "सुरू आहे",
    resume_builder_btn: "रिझ्युमे बिल्डर",
    find_jobs: "नोकऱ्या शोधा",
    completed_xp: "पूर्ण झाले (+50 XP)",
    no_active_pipeline_desc: "तुमची प्रगती स्वयंचलितपणे ट्रॅक करण्यासाठी नोकऱ्यांसाठी अर्ज करा.",
    youve_been_selected: "तुमची निवड झाली आहे!",
    refer_and_earn_xp: "मित्र जोडा आणि XP मिळवा",
    invite_friends_desc: "मित्रांना आमंत्रित करा. साइनअपवर दोघांना +६० XP मिळतील.",
    refer_and_earn_program: "रेफर अँड अर्न प्रोग्राम",
    refer_friends_earn_rewards: "तुमच्या मित्रांना आमंत्रित करा आणि बक्षिसे जिंका",
    refer_friends_desc: "तुमच्या मित्रांना VEGA मध्ये सामील होण्यास मदत करा. जेव्हा ते नोंदणी करतात आणि नोकरी मिळवतात, तेव्हा तुम्हाला आकर्षक बक्षिसे मिळतील.",
    refer_and_earn_now: "आता मित्र जोडा",
    copied: "कॉपी केले!",
    share_on_whatsapp: "WhatsApp वर शेअर करा",
    edit_profile: "प्रोफाइल संपादित करा",
    day_streak: "दिवसांचा सलग क्रम",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('tb_language') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('tb_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return (translations[language] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const DynamicText: React.FC<{ text: string | undefined | null }> = ({ text }) => {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState<string>("");

  useEffect(() => {
    if (!text) {
      setTranslated("");
      return;
    }
    if (language === "en") {
      setTranslated(text);
      return;
    }
    
    const cacheKey = `trans_${language}_${text}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setTranslated(cached);
      return;
    }

    setTranslated(text); // show original temporarily

    fetch("/api/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage: language })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.translatedText) {
        setTranslated(data.translatedText);
        localStorage.setItem(cacheKey, data.translatedText);
      }
    })
    .catch(console.error);
  }, [text, language]);

  return <>{translated}</>;
};
