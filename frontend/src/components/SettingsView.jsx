import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    DollarSign, Activity, Share2, Chrome, Rss, UserCheck,
    Settings, ChevronRight, Shield, Zap, Layout, Terminal
} from 'lucide-react';

/* Import setting modules directly */
import MonetizationManager from './MonetizationManager';
import SystemHealth from './SystemHealth';
import WebhookManager from './WebhookManager';
import ExtensionHelp from './ExtensionHelp';
import RSSManager from './RSSManager';
import StyleProfile from './StyleProfile';
import ThemeSelector from './ThemeSelector';
import AdvancedTools from './AdvancedTools';

const SettingsView = ({ initialTab = 'monetization', activeTheme }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read tab from URL query param, fallback to initialTab prop
    const urlTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(urlTab || initialTab);
    
    // Sync URL when tab changes
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId }, { replace: true });
    };
    
    // Sync state when URL changes (e.g., back/forward navigation)
    useEffect(() => {
        if (urlTab && urlTab !== activeTab) {
            setActiveTab(urlTab);
        }
    }, [urlTab]);

    const tabs = [
        {
            id: 'monetization',
            label: 'Monetization',
            icon: DollarSign,
            desc: 'revenue & payout config',
            component: MonetizationManager
        },
        {
            id: 'health',
            label: 'System Health',
            icon: Activity,
            desc: 'engine & pipeline status',
            component: SystemHealth
        },
        {
            id: 'webhooks',
            label: 'Webhooks',
            icon: Share2,
            desc: 'external integrations',
            component: WebhookManager
        },
        {
            id: 'rss',
            label: 'Source Manager',
            icon: Rss,
            desc: 'rss & data intake',
            component: RSSManager
        },
        {
            id: 'style',
            label: 'Style Profile',
            icon: UserCheck,
            desc: 'ai persona calibration',
            component: StyleProfile
        },
        {
            id: 'extension',
            label: 'Browser Widget',
            icon: Chrome,
            desc: 'chrome extension assist',
            component: ExtensionHelp
        },
        {
            id: 'theme',
            label: 'Interface',
            icon: Layout,
            desc: 'theme & visual settings',
            component: ThemeSelector
        },
        {
            id: 'advanced',
            label: 'Advanced',
            icon: Terminal,
            desc: 'dev & ops tools',
            component: AdvancedTools
        },
    ];

    const ActiveContent = tabs.find(tab => tab.id === activeTab)?.component;

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 animate-fade-in pb-8 lg:pb-20">
            {/* Mobile Tab Selector - Horizontal scrollable tabs for mobile */}
            <div className="lg:hidden px-2 -mx-2 overflow-x-auto">
                <div className="flex gap-2 pb-2 min-w-max">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : `${activeTheme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'} hover:bg-indigo-50 hover:text-indigo-600`
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Side Navigation for Hub - Hidden on mobile */}
            <div className="hidden lg:block lg:w-80 shrink-0">
                <div className="sticky top-24 space-y-6">
                    <div className="px-4">
                        <h1 className={`text-3xl font-black tracking-tight ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Settings Hub</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                            <Zap className="w-3 h-3 text-indigo-500" />
                            Pulse Pro Configuration
                        </p>
                    </div>

                    <nav className={`backdrop-blur-xl rounded-[2.5rem] border p-4 shadow-2xl space-y-2 transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'}`}>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-3xl transition-all group relative overflow-hidden ${isActive
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'
                                            : `text-slate-400 hover:text-indigo-600 ${activeTheme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-indigo-50'}`
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${isActive ? 'bg-white/20 border-white/20' : `${activeTheme === 'dark' ? 'bg-white/5 border-white/10 group-hover:border-white/20' : 'bg-slate-100 border-slate-200 group-hover:border-indigo-200'}`
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 text-left">
                                        <p className="text-[11px] font-black uppercase tracking-wider leading-none mb-1">{tab.label}</p>
                                        <p className={`text-[9px] font-bold tracking-tight leading-none ${isActive ? 'text-indigo-100/70' : 'text-slate-500'}`}>
                                            {tab.desc}
                                        </p>
                                    </div>

                                    {isActive && (
                                        <div className="absolute right-4">
                                            <ChevronRight className="w-4 h-4 opacity-50" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Quick Info / Security Badge */}
                    <div className={`rounded-3xl p-6 transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-emerald-50 border border-emerald-100'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${activeTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Enhanced Encryption</span>
                        </div>
                        <p className={`text-[9px] font-bold leading-relaxed ${activeTheme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                            All your configuration data, including webhooks and style profiles, are encrypted and stored locally.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 px-2 lg:px-0">
                <div className={`backdrop-blur-md rounded-2xl lg:rounded-[3rem] border p-4 lg:p-12 shadow-inner min-h-[500px] lg:min-h-[700px] transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-slate-900/20 border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="max-w-4xl mx-auto">
                        {/* Dynamic Rendering of setting module */}
                        <div className="animate-slide-up">
                            {ActiveContent && <ActiveContent activeTheme={activeTheme} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
