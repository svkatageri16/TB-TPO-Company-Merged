import { motion } from "motion/react";

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
            <p>Last updated: May 6, 2026</p>
            <h2 className="text-2xl font-semibold text-gray-900">1. Information We Collect</h2>
            <p>We collect information that you provide directly to us when you create an account, upload a resume, or apply for a job.</p>
            <h2 className="text-2xl font-semibold text-gray-900">2. How We Use Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, including matching students with companies.</p>
            <h2 className="text-2xl font-semibold text-gray-900">3. Information Sharing</h2>
            <p>We do not share your private personal information with third parties except as required to provide our services (e.g., sharing your profile with a company you applied to).</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
