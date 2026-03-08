import React from 'react';
import AdminLayout from '../components/AdminLayout';
import { BarChart3, TrendingUp, PieChart, Activity, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AdminAnalytics = () => {
  return (
    <AdminLayout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="bg-gradient-to-br from-slate-800 via-slate-900 to-black border-slate-700 max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            {/* Animated Icons */}
            <div className="flex justify-center gap-6 mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-blue-500/20 blur-3xl animate-pulse"></div>
              
              <div className="relative animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}>
                <BarChart3 size={48} className="text-orange-400" />
              </div>
              <div className="relative animate-bounce" style={{animationDelay: '0.2s', animationDuration: '3s'}}>
                <TrendingUp size={48} className="text-purple-400" />
              </div>
              <div className="relative animate-bounce" style={{animationDelay: '0.4s', animationDuration: '3s'}}>
                <PieChart size={48} className="text-blue-400" />
              </div>
              <div className="relative animate-bounce" style={{animationDelay: '0.6s', animationDuration: '3s'}}>
                <Activity size={48} className="text-green-400" />
              </div>
            </div>

            {/* Main Message */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="text-yellow-400 animate-pulse" size={24} />
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-purple-400 to-blue-400">
                  Analytics Dashboard
                </h1>
                <Sparkles className="text-yellow-400 animate-pulse" size={24} />
              </div>
              
              <p className="text-2xl text-slate-300 font-semibold">
                Coming Soon™
              </p>
              
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                We're crunching numbers, analyzing patterns, and building beautiful charts. 
                Your data insights will be worth the wait! 📊
              </p>
            </div>

            {/* Feature Preview */}
            <div className="grid grid-cols-2 gap-4 mt-8 text-left">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-orange-400 font-semibold mb-2">📈 Real-time Metrics</h3>
                <p className="text-sm text-slate-400">Live sales, inventory & user activity tracking</p>
              </div>
              
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-purple-400 font-semibold mb-2">🎯 Predictive Analytics</h3>
                <p className="text-sm text-slate-400">AI-powered demand forecasting & trends</p>
              </div>
              
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-blue-400 font-semibold mb-2">📊 Custom Reports</h3>
                <p className="text-sm text-slate-400">Generate insights tailored to your needs</p>
              </div>
              
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-green-400 font-semibold mb-2">⚡ Performance Dashboard</h3>
                <p className="text-sm text-slate-400">Monitor KPIs & business health at a glance</p>
              </div>
            </div>

            {/* Footer Message */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-slate-500 text-sm italic">
                "In the meantime, your business is growing faster than we can chart it!" 🚀
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
