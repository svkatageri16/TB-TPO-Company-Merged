import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BRAND } from "../brand.ts";
import { 
  Linkedin, 
  Github, 
  Instagram, 
  Twitter, 
  ArrowUp, 
  Mail, 
  Globe,
  BriefcaseBusiness,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";

export function Footer() {
  const { t, i18n } = useTranslation();
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubscribing(false);
      import("react-hot-toast").then(({ toast }) => {
        toast.success("Successfully subscribed to newsletter!");
      });
    }, 1000);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentYear = new Date().getFullYear();

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.5
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <footer id="main-footer" className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          
          {/* Brand Section */}
          <motion.div className="lg:col-span-2" variants={itemVariants}>
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {BRAND.name[0]}
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                {BRAND.name}
              </span>
            </Link>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-sm">
              {t("footer.brandDescription")}
            </p>
            <div className="flex gap-4">
              <SocialIcon icon={<Linkedin size={20} />} href="https://linkedin.com" />
              <SocialIcon icon={<Github size={20} />} href="https://github.com" />
              <SocialIcon icon={<Twitter size={20} />} href="https://twitter.com" />
              <SocialIcon icon={<Instagram size={20} />} href="https://instagram.com" />
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <h4 className="text-gray-900 font-semibold mb-6 uppercase tracking-wider text-sm">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-4">
              <FooterLink to="/student">{t("footer.links.dashboard")}</FooterLink>
              <FooterLink to="/jobs">{t("footer.links.jobs")}</FooterLink>
              <FooterLink to="/resume-builder">{t("footer.links.resumeBuilder")}</FooterLink>
              <FooterLink to="/interview">{t("footer.links.mockInterview")}</FooterLink>
              <FooterLink to="/applied-jobs">{t("footer.links.appliedJobs")}</FooterLink>
            </ul>
          </motion.div>

          {/* Company Links */}
          <motion.div variants={itemVariants}>
            <h4 className="text-gray-900 font-semibold mb-6 uppercase tracking-wider text-sm">
              {t("footer.companyLinks")}
            </h4>
            <ul className="space-y-4">
              <FooterLink to="/company/jobs/new">{t("footer.links.postJob")}</FooterLink>
              <FooterLink to="/company">{t("footer.links.hiringDashboard")}</FooterLink>
              <FooterLink to="/company/profile">{t("footer.links.talentSearch")}</FooterLink>
            </ul>
          </motion.div>

          {/* Support & Legal */}
          <motion.div variants={itemVariants}>
            <h4 className="text-gray-900 font-semibold mb-6 uppercase tracking-wider text-sm">
              {t("footer.supportLegal")}
            </h4>
            <ul className="space-y-4">
              <FooterLink to="/about">{t("footer.links.aboutUs")}</FooterLink>
              <FooterLink to="/contact">{t("footer.links.contact")}</FooterLink>
              <FooterLink to="/privacy">{t("footer.links.privacyPolicy")}</FooterLink>
              <FooterLink to="/terms">{t("footer.links.termsConditions")}</FooterLink>
            </ul>
          </motion.div>
        </motion.div>

        {/* Newsletter & Language Switcher */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-10 border-y border-gray-100 items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="lg:col-span-1">
            <h4 className="text-gray-900 font-semibold mb-2">{t("footer.newsletter")}</h4>
            <p className="text-gray-500 text-sm">{t("footer.subscribeDesc")}</p>
          </div>
          <div className="lg:col-span-2">
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg lg:ml-auto">
              <div className="relative flex-grow">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder={t("footer.newsletterPlaceholder")}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <button 
                type="submit"
                disabled={isSubscribing}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-200 whitespace-nowrap"
              >
                {isSubscribing ? "Subscribing..." : t("footer.subscribe")}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-12 gap-6">
          <p className="text-gray-500 text-sm">
            © {currentYear} VEGA. {t("footer.allRightsReserved")}
          </p>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100">
              <Globe size={14} className="text-gray-400 ml-1" />
              <button 
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${i18n.language === 'en' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                EN
              </button>
              <button 
                onClick={() => changeLanguage('mr')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${i18n.language === 'mr' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                मराठी
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            id="back-to-top"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-4 bg-white text-blue-600 rounded-full shadow-2xl border border-gray-100 hover:bg-blue-50 transition-colors z-50 group"
          >
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string, children: React.ReactNode }) {
  return (
    <li>
      <Link 
        to={to} 
        className="text-gray-500 hover:text-blue-600 transition-colors duration-200 text-base"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({ icon, href }: { icon: React.ReactNode, href: string }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all duration-300 transform hover:-translate-y-1 shadow-sm border border-gray-100"
    >
      {icon}
    </a>
  );
}
