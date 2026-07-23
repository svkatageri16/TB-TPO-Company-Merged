import { motion } from "motion/react";

export function TermsConditions() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>
          <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
            <p>Welcome to VEGA. By using our platform, you agree to these terms.</p>
            <h2 className="text-2xl font-semibold text-gray-900">1. Eligibility</h2>
            <p>You must be at least 18 years old or have parental consent to use this platform.</p>
            <h2 className="text-2xl font-semibold text-gray-900">2. User Accounts</h2>
            <p>You are responsible for maintaining the security of your account and password.</p>
            <h2 className="text-2xl font-semibold text-gray-900">3. Termination</h2>
            <p>We reserve the right to terminate accounts that violate our community guidelines or terms of service.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
