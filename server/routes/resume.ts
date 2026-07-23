import express from "express";
import db from "../db.ts";
import { XPService } from "../services/xpService.ts";

const router = express.Router();

// Resume Templates Metadata
const RESUME_TEMPLATES = [
  { 
    id: "academic-latex", 
    name: "Latex Scholar (Page 1)", 
    description: "Classic academic style based on LaTeX formatting. Perfect for SDE roles.",
    type: "ACADEMIC" 
  },
  { 
    id: "hybrid-ats-premium", 
    name: "Hybrid ATS Premium (Page 2)", 
    description: "Standard single-column layout optimized for executive screeners and complex ATS parsers. 100% parse rate.",
    type: "ATS_GOLD" 
  },
  { 
    id: "silicon-valley-tech", 
    name: "Silicon Valley Tech (Page 3)", 
    description: "Modern sans-serif design optimized for software, product, and tech corporate placements.",
    type: "TECH_PRO" 
  },
  {
    id: "isabel-sales",
    name: "Isabel Sales Representative (Page 3)",
    description: "Rounded black header blocks, dual column layout block with corporate sales tracking.",
    type: "SALES_PRO"
  },
  {
    id: "olivia-bba-marketing",
    name: "Olivia Marketing Area Manager (Page 4)",
    description: "Corporate marketing executive layout with solid side borders and key competency bullets.",
    type: "MARKETING_PRO"
  },
  {
    id: "olivia-marketing-projects",
    name: "Olivia Marketing Specialties (Page 5)",
    description: "Vibrant horizontal layout tailored for detailed marketing certifications, projects, and achievements.",
    type: "MARKETING_GOLD"
  },
  {
    id: "aaron-stats-analyst",
    name: "Aaron Stats Data Analyst (Page 6)",
    description: "Sophisticated single-column professional data analyst layout with custom section bars.",
    type: "ANALYST_PRO"
  },
  {
    id: "aaron-data-projects",
    name: "Aaron Analytical Projects (Page 7)",
    description: "Highlights data dashboards, forecasting modules, and statistical projects with elegant bullet spacing.",
    type: "ANALYST_GOLD"
  },
  {
    id: "daniel-gallego-hr",
    name: "Daniel HR Manager (Page 8)",
    description: "Warm-toned professional layout designed specifically for human resources and leadership.",
    type: "HR_PRO"
  },
  {
    id: "daniel-hr-achievements",
    name: "Daniel HR Specialist Focus (Page 9)",
    description: "Focuses on compliance, training certifications, policy rollouts, and pandemic remote strategy projects.",
    type: "HR_GOLD"
  },
  {
    id: "drew-business-consultant",
    name: "Drew Business Consultant (Page 10)",
    description: "Bold corporate standard layout with split key competencies grid and timeline.",
    type: "CONSULTING_PRO"
  },
  {
    id: "drew-consultant-projects",
    name: "Drew Strategic Roadmap Scholar (Page 11)",
    description: "Tailored to show supply chain optimization projects and digital transformations.",
    type: "CONSULTING_GOLD"
  },
  {
    id: "noah-sales-expert",
    name: "Noah Sales Representative (Page 12)",
    description: "Camel-accented elegant design highlighting revenue metrics and client portfolio scale.",
    type: "SALES_GOLD"
  },
  {
    id: "noah-sales-achievements",
    name: "Noah Sales Tactics & Training (Page 13)",
    description: "Showcases customer psychology courses, territory planning, and regional account expansions.",
    type: "SALES_ATS"
  },
  {
    id: "dani-ux-designer",
    name: "Dani UX Designer Minimalist (Page 14)",
    description: "Split asymmetric high-contrast layouts highlighting storyboarding and user flows.",
    type: "UX_MINIMAL"
  },
  {
    id: "korina-ux-designer",
    name: "Korina Professional UIUX (Page 15)",
    description: "Spacious layout with sidebar personal profile, perfect for product and visual designers.",
    type: "UX_PRO"
  },
  {
    id: "samira-it-security",
    name: "Samira IT Security Specialist (Page 16)",
    description: "IT blueprint layout featuring professional blue corners and cyber-threat tracking highlights.",
    type: "SECURITY_PRO"
  },
  {
    id: "rufus-stewart-yellow",
    name: "Rufus Stewart Yellow Marketer (Page 17)",
    description: "Warm yellow sunburst icons with beautiful round visual skill rating circles.",
    type: "MARKETING_CREATIVE"
  },
  {
    id: "rufus-stewart-cyan",
    name: "Rufus Stewart Cyan Marketer (Page 18)",
    description: "Modern ocean-cyan background theme with horizontal graphical skill bars.",
    type: "MARKETING_CREATIVE"
  },
  {
    id: "rufus-stewart-navy",
    name: "Rufus Stewart Navy Marketer (Page 19)",
    description: "Classic corporate deep-navy blocks with clear credential and reference spacing.",
    type: "MARKETING_CREATIVE"
  },
  {
    id: "rufus-stewart-slate",
    name: "Rufus Stewart Slate Marketer (Page 20)",
    description: "Abstract slate blue style ornamented with aesthetic geometric background squares.",
    type: "MARKETING_CREATIVE"
  },
  {
    id: "samira-hadid-border",
    name: "Samira Hadid Vertical Border (Page 21)",
    description: "Feminine workspace layout with an elegant vertical dividing split and soft-beige accent titles.",
    type: "CREATIVE_MIN"
  },
  {
    id: "olivia-wilson-manager",
    name: "Olivia Wilson Classic Manager (Page 22)",
    description: "Professional corporate layout in bright white and crisp dividing lines.",
    type: "PROF_GOLD"
  },
  {
    id: "olivia-sanchez",
    name: "Olivia Sanchez Admin Manager (Page 23)",
    description: "Highly structural columns highlighting calendar management and executive support achievements.",
    type: "ADMIN_PRO"
  },
  {
    id: "richard-sanchez-gray",
    name: "Richard Sanchez Gray Marketing (Page 24)",
    description: "Asymmetric layout with deep-gray side banner and a rounded profile crop.",
    type: "MARKETING_DARK"
  },
  {
    id: "olivia-wilson-orange",
    name: "Olivia Wilson Orange Accent (Page 25)",
    description: "Sleek slate sidebar offset with vibrant golden-orange abstract header grids.",
    type: "MARKETING_DYNAMIC"
  },
  {
    id: "samira-hadid-gm",
    name: "Samira Hadid Teal Manager (Page 26)",
    description: "Stately manager design in dark teal with clean timeline dots and structured credentials.",
    type: "GM_PRO"
  },
  {
    id: "hannah-morales-nurse",
    name: "Hannah Morales Standard Care (Page 27)",
    description: "Clinical healthcare nurse template with clean blue line accents and patient assessment cards.",
    type: "MEDICAL_DEFAULT"
  },
  {
    id: "hannah-morales-details",
    name: "Hannah Morales Clinical Focus (Page 28)",
    description: "Showcases pediatric, emergency rotations, and wound-care development projects.",
    type: "MEDICAL_GOLD"
  },
  {
    id: "rachel-akinwale",
    name: "Rachel Akinwale Marble Slate (Page 29)",
    description: "Marble blue textured slate background styling with rounded white info frames.",
    type: "EDITORIAL"
  },
  {
    id: "helene-paquet",
    name: "Helene Paquet Peach Designer (Page 30)",
    description: "Elegantly styled left peach section with a sun-burst profile portrait alignment.",
    type: "DESIGN_PEACH"
  },
  {
    id: "brigitte-schwartz",
    name: "Brigitte Schwartz Curved Banner (Page 31)",
    description: "Stellar wavy banner design decorated with beautiful rating stars for professional designers.",
    type: "DESIGN_ELEGANT"
  },
  {
    id: "estelle-darcy",
    name: "Estelle Darcy Warm Stone Sidebar (Page 32)",
    description: "Earthy beige bar sidebar decorated with modern vertical typography tags.",
    type: "DESIGN_STONE"
  },
  {
    id: "richard-sanchez-gold",
    name: "Richard Sanchez Elegant Gold (Page 33)",
    description: "Refined golden layout with modern corporate dividers and sleek line heights.",
    type: "MARKETING_GOLD"
  },
  {
    id: "richard-sanchez-teal",
    name: "Richard Sanchez Dynamic Teal (Page 34)",
    description: "Breezy teal design emphasizing visual project flow and client relationships.",
    type: "MARKETING_TEAL"
  },
  {
    id: "donna-stroupe",
    name: "Donna Stroupe Charcoal Sidebar (Page 35)",
    description: "High-end charcoal left-side layout contrasting light-blue title backgrounds.",
    type: "MARKETING_DARK"
  },
  {
    id: "lorna-villanueva",
    name: "Lorna Villanueva Blue Top Panel (Page 36)",
    description: "Royal blue title grid accompanied by high-readability technical list bullets.",
    type: "MARKETING_BLUE"
  },
  {
    id: "dani-martinez-marketing",
    name: "Dani Martinez Slate-Border Manager (Page 37)",
    description: "Left slate gray sidebar layout featuring elegant circles and timeline milestones.",
    type: "MARKETING_SLATE"
  },
  {
    id: "devi-chaudhry",
    name: "Devi Chaudhry Classical Architect (Page 38)",
    description: "Elite golden double line margins wrapping luxury classical architectural blueprints.",
    type: "ARCHITECT_PRO"
  },
  {
    id: "anna-katrina-preschool",
    name: "Anna Katrina Preschool Teacher (Page 39)",
    description: "Playful soft-peach card blocks ideal for child-care and education specialties.",
    type: "TEACHER_PRO"
  },
  {
    id: "samira-hadid-navy",
    name: "Samira Hadid Navy Presentation (Page 40)",
    description: "Sleek navy banner background offset with aesthetic gold geometry blocks.",
    type: "CREATIVE_NAVY"
  },
  {
    id: "sacha-dubois",
    name: "Sacha Dubois Sleek Writer (Page 41)",
    description: "Sleek slate-blue headers paired with minimalist line spacing.",
    type: "CREATIVE_DARK"
  },
  {
    id: "estela-dominguez",
    name: "Estela Dominguez Spanish Editorial (Page 42)",
    description: "Beautiful Spanish accountant layout with clean columns and professional borders.",
    type: "FINANCE_PRO"
  },
  {
    id: "ricardo-soto",
    name: "Ricardo Soto Cobalt Accountant (Page 43)",
    description: "Cobalt blue and pristine white grids tailored for finance experts and analysts.",
    type: "FINANCE_GOLD"
  },
  {
    id: "maanvita-kumari-designer",
    name: "Maanvita Kumari Accent Column (Page 44)",
    description: "Graphically structured single-column vertical line tracking.",
    type: "DESIGNER_GOLD"
  },
  {
    id: "isabel-schumacher-sales",
    name: "Isabel Schumacher Dual Column (Page 45)",
    description: "Double block split layout presenting clean corporate client details.",
    type: "EXECUTIVE_ATS"
  },
  {
    id: "greta-manager",
    name: "Greta Bold IT Manager (Page 46)",
    description: "Contemporary display typography layout with structured timeline dots.",
    type: "PM_PRO"
  },
  {
    id: "olivia-wilson-thai",
    name: "Olivia Wilson Colorful Thai (Page 47)",
    description: "Lively abstract color splash backgrounds for imaginative profiles.",
    type: "CREATIVE_THAI"
  },
  {
    id: "adora-montini",
    name: "Adora Montini Gold Minimal Thai (Page 48)",
    description: "Charming beige background combined with soft script headers.",
    type: "MINIMAL_THAI"
  },
  {
    id: "kumberry-ngian",
    name: "Kumberry Ngian Modern Orange Thai (Page 49)",
    description: "Enthusiastic orange themes best suited for media and communication experts.",
    type: "CREATIVE_THAI"
  },
  {
    id: "creative-pastel-frame",
    name: "Juliana Silva Pastel Split Frame (Page 50)",
    description: "Splendid layout with pastel pink and modern cyan block panels.",
    type: "PASTEL_MODERN"
  },
  { 
    id: "marketer-gold-timeline", 
    name: "Modern Gold Timeline", 
    description: "Vibrant timeline layout with golden bullet accents and skills score tracking.",
    type: "CREATIVE_GOLD" 
  },
  { 
    id: "designer-black-sidebar", 
    name: "Designer Asymmetric Black Sidebar", 
    description: "Contrasting layout with elegant black sidebars, tailored for design and creative roles.",
    type: "DESIGNER_PRO" 
  },
  { 
    id: "medical-care-professional", 
    name: "Medical Standard Professional", 
    description: "Clean medical blue theme with structured section labels for healthcare and nursing.",
    type: "MEDICAL" 
  },
  { 
    id: "textured-slate-serif", 
    name: "Textured Slate Serif Scholar", 
    description: "Playfair display serif typography wrapped in cards, inspired by Rachel Akinwale's sleek profile.",
    type: "EDITORIAL" 
  },
  { 
    id: "asymmetrical-writer", 
    name: "Sacha Asymmetrical Writer", 
    description: "Left-dark-blue sidebar with elegant round crop profile picture, matching content writers and analysts.",
    type: "CREATIVE_DARK" 
  },
  { 
    id: "modern-pro", 
    name: "Modern Professional", 
    description: "Clean layout with subtle accents and section dividers.",
    type: "PROFESSIONAL" 
  },
  { 
    id: "executive-grid", 
    name: "Executive Grid", 
    description: "Structured two-column layout for experienced candidates.",
    type: "EXECUTIVE" 
  },
  { 
    id: "minimal-swiss", 
    name: "Minimal Swiss", 
    description: "Clean, bold typography with a focus on whitespace.",
    type: "MINIMAL" 
  },
  { 
    id: "technical-elite", 
    name: "Technical Elite", 
    description: "Sidebar-focused design highlighting technical skill proficiencies.",
    type: "TECHNICAL" 
  },
  { 
    id: "classic-ats", 
    name: "Classic ATS", 
    description: "Single column, minimal design, strictly ATS-friendly.",
    type: "ATS" 
  }
];

// Check Reset Daily Limit
async function checkAndResetLimit(userId: number) {
  const [profiles]: any = await db.query("SELECT daily_resume_count, last_resume_reset_at FROM student_profiles WHERE user_id = ?", [userId]);
  if (profiles.length === 0) return { count: 0, reset: true };

  const profile = profiles[0];
  const lastReset = new Date(profile.last_resume_reset_at);
  const now = new Date();

  // Reset if it's a new day
  if (now.toDateString() !== lastReset.toDateString()) {
    await db.query("UPDATE student_profiles SET daily_resume_count = 0, last_resume_reset_at = ? WHERE user_id = ?", [now, userId]);
    return { count: 0, reset: true };
  }

  return { count: profile.daily_resume_count, reset: false };
}

router.get("/templates", (req, res) => {
  res.json(RESUME_TEMPLATES);
});

router.get("/status/:userId", async (req, res) => {
  try {
    const { count } = await checkAndResetLimit(parseInt(req.params.userId));
    
    // Fetch profile
    const [profiles]: any = await db.query("SELECT * FROM student_profiles WHERE user_id = ?", [req.params.userId]);
    if (profiles.length === 0) return res.status(404).json({ message: "Profile not found" });

    const p = profiles[0];

    const education = typeof p.education_json === 'string' ? JSON.parse(p.education_json) : (p.education_json || []);
    const projects = typeof p.projects_json === 'string' ? JSON.parse(p.projects_json) : (p.projects_json || []);
    const skills = typeof p.skills_json === 'string' ? JSON.parse(p.skills_json) : (p.skills_json || []);

    const errors = [];
    if (p.completeness_score < 70) errors.push("Profile completion must be at least 70%");
    if (!p.profile_photo_url) errors.push("Profile photo is mandatory");
    if (projects.length < 1) errors.push("At least one project is required");
    if (skills.length < 3) errors.push("At least 3 skills are required");

    const xpCost = await XPService.getConfigValue('RESUME_ANALYSIS_COST', 50);

    res.json({
      dailyCount: count,
      limit: 3,
      isEligible: errors.length === 0,
      errors,
      xpCost
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch status" });
  }
});

router.post("/generate", async (req, res) => {
  const { userId, templateId, summary } = req.body;
  
  try {
    const { count } = await checkAndResetLimit(userId);
    const cost = await XPService.getConfigValue('RESUME_ANALYSIS_COST', 50);
    const mustPayXP = count >= 3;

    if (mustPayXP) {
      // Check if enough XP
      const [users]: any = await db.query("SELECT xp_balance FROM users WHERE id = ?", [userId]);
      const xpBalance = users[0]?.xp_balance || 0;
      if (xpBalance < cost) {
        return res.status(403).json({ success: false, message: `Insufficient XP. Generating an extra resume requires ${cost} XP.` });
      }

      // Deduct cost
      await XPService.deductXP(userId, cost, 'RESUME_GENERATION', "AI Resume Builder Extra Generation (Limit Exceeded)");
    }

    // Increment daily count
    await db.query("UPDATE student_profiles SET daily_resume_count = daily_resume_count + 1 WHERE user_id = ?", [userId]);

    // Save to history
    await db.query("INSERT INTO resume_history (user_id, template_id, summary) VALUES (?, ?, ?)", [userId, templateId, summary]);

    res.json({
      success: true,
      dailyCount: count + 1
    });
  } catch (error) {
    console.error("Resume Action Tracking Error:", error);
    res.status(500).json({ message: "Failed to track resume generation" });
  }
});

router.get("/history/:userId", async (req, res) => {
  try {
    const [history] = await db.query("SELECT * FROM resume_history WHERE user_id = ? ORDER BY created_at DESC", [req.params.userId]);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

export default router;
