import { User, Bell, Shield, Palette, Globe, CreditCard, Key } from 'lucide-react';
import { useState } from 'react';

const settingsCategories = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export function Settings() {
  const [selectedCategory, setSelectedCategory] = useState('profile');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    trades: true,
    markets: true,
  });
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');

  const renderSettingsContent = () => {
    switch (selectedCategory) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Display Name</label>
                  <input
                    type="text"
                    defaultValue="Trader_123"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue="trader@example.com"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Bio</label>
                  <textarea
                    rows={4}
                    defaultValue="Active trader focused on prediction markets"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <button className="px-6 py-2 bg-emerald-400 text-white rounded-lg font-medium hover:bg-emerald-500 transition">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email Notifications' },
                  { key: 'push', label: 'Push Notifications' },
                  { key: 'sms', label: 'SMS Notifications' },
                  { key: 'trades', label: 'Trade Alerts' },
                  { key: 'markets', label: 'Market Updates' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <span className="text-white">{item.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-400"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-slate-400">Add an extra layer of security</p>
                    </div>
                    <button className="px-4 py-2 bg-emerald-400 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition">
                      Enable
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">Change Password</h4>
                      <p className="text-sm text-slate-400">Update your account password</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Change
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">Active Sessions</h4>
                      <p className="text-sm text-slate-400">Manage your active login sessions</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition">
                      View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Appearance</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Theme</label>
                  <div className="flex gap-2">
                    {['dark', 'light', 'auto'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                          theme === t
                            ? 'bg-emerald-400/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Language & Region</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Billing & Subscription</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">Current Plan</h4>
                      <p className="text-sm text-slate-400">Free Tier</p>
                    </div>
                    <button className="px-4 py-2 bg-emerald-400 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition">
                      Upgrade
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">Payment Method</h4>
                      <p className="text-sm text-slate-400">No payment method on file</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Settings Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h2 className="text-xl font-bold mb-4">Settings</h2>
          <div className="space-y-2">
            {settingsCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                    selectedCategory === category.id
                      ? 'bg-emerald-400/20 text-emerald-400'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="lg:col-span-3">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
}


