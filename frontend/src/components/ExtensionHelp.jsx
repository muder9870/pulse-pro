import React from 'react';
import { Download, Chrome, Shield, Zap, ExternalLink, Activity } from 'lucide-react';

const ExtensionHelp = () => {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-md">
                            <Chrome className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Pulse Pro Capture</h2>
                            <p className="text-blue-100">Chrome Extension for Instant Web Saving</p>
                        </div>
                    </div>
                    <p className="text-lg opacity-90 max-w-2xl">
                        Found an interesting AI article or research paper while browsing?
                        Capture it instantly and send it to your dashboard with one click.
                    </p>
                </div>

                <div className="p-8">
                    <div className="grid md:grid-cols-3 gap-8 mb-12">
                        <div className="space-y-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-gray-900">One-Click Save</h3>
                            <p className="text-sm text-gray-500">Capture titles, URLs, and main content without leaving your current tab.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-gray-900">Privacy First</h3>
                            <p className="text-sm text-gray-500">Data stays within your local Pulse Pro environment. No cloud middleman.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-gray-900">Auto-Processing</h3>
                            <p className="text-sm text-gray-500">Captured articles automatically enter your processing and scoring pipeline.</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Download className="w-5 h-5 text-blue-600" />
                            Installation Instructions
                        </h3>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">Locate Extension Folder</h4>
                                    <p className="text-sm text-gray-500">
                                        The extension source code is located in your project directory at:
                                        <code className="block mt-2 p-2 bg-gray-200 rounded text-gray-800 text-xs">d:\Pulse Pro\extension</code>
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">Open Extensions Manager</h4>
                                    <p className="text-sm text-gray-500">
                                        In Chrome, navigate to <code className="bg-gray-200 px-1 rounded">chrome://extensions</code> or click the Puzzle piece icon.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">Enable Developer Mode</h4>
                                    <p className="text-sm text-gray-500">
                                        Toggle the <strong>Developer mode</strong> switch in the top right corner.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4</div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">Load Extension</h4>
                                    <p className="text-sm text-gray-500">
                                        Click <strong>Load unpacked</strong> and select the <code className="bg-gray-200 px-1 rounded">extension</code> folder from Step 1.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Capture API is active and ready
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExtensionHelp;
