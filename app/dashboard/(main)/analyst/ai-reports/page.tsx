'use client';

import { Brain, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function AIReportsPage() {
    const router = useRouter();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/20"
            >
                <Brain className="w-12 h-12 text-white" />
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="max-w-md space-y-4"
            >
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    Fitur Sedang Dalam Pengembangan
                </h1>
                
                <p className="text-gray-500 leading-relaxed">
                    Kami sedang menyiapkan analisis AI tingkat lanjut untuk laporan Anda. 
                    Nantikan pembaruan fitur ini segera untuk insight yang lebih mendalam.
                </p>

                <div className="pt-8">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 hover:shadow-gray-900/20 active:scale-95"
                    >
                        <ArrowLeft size={18} />
                        Kembali ke Dashboard
                    </button>
                     <p className="text-xs text-gray-400 mt-6 font-mono uppercase tracking-widest">
                        ESTIMASI RILIS: Q2 2026
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
