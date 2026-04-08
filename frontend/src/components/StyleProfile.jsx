import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Info, RefreshCw, UserCheck } from 'lucide-react';
import Button from './ui/Button';

export default function StyleProfile() {
    const [styles, setStyles] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStyles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/personalization/style');
            const data = await res.json();
            if (res.ok) {
                setStyles(data.styles || {});
            } else {
                throw new Error(data.error || 'Failed to fetch style profile');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStyles();
    }, []);

    const getStyleDescription = (key, value) => {
        const descriptions = {
            length_preference: {
                concise: 'You prefer short, punchy content that gets straight to the point.',
                detailed: 'You prefer comprehensive, in-depth posts with more context.',
                balanced: 'You prefer a standard length that balances detail and brevity.'
            },
            emoji_usage: {
                more_emojis: 'You like using emojis to add personality and visual interest.',
                fewer_emojis: 'You prefer a clean, professional look with minimal emoji use.',
                standard: 'You use an average amount of emojis for social engagement.'
            }
        };
        return descriptions[key]?.[value] || `Your preferred setting for ${key} is "${value}".`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500">Analyzing your style preferences...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <h3 className="font-bold mb-2">Error loading style profile</h3>
                <p>{error}</p>
                <Button
                    onClick={fetchStyles}
                    variant="danger"
                    size="md"
                    className="mt-4"
                >
                    Retry
                </Button>
            </div>
        );
    }

    const hasStyles = Object.keys(styles).length > 0;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Brain className="w-8 h-8 text-purple-600" />
                        Brand Voice & AI Personalization
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Pulse Pro learns from your edits and feedback to mirror your unique writing style.
                    </p>
                </div>
                <Button
                    onClick={fetchStyles}
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    className="rounded-full"
                    title="Refresh profile"
                />
            </div>

            {!hasStyles ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 text-center">
                    <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Starting Your Journey</h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                        I haven't learned enough about your style yet. Start by editing generated content
                        or using the Thumbs Up/Down buttons on story cards!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(styles).map(([key, value]) => (
                        <div key={key} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <UserCheck className="w-5 h-5 text-purple-700" />
                                </div>
                                <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">
                                    {key.replace('_', ' ')}
                                </h3>
                            </div>
                            <div className="text-2xl font-bold text-purple-800 mb-2 capitalize">
                                {value.replace('_', ' ')}
                            </div>
                            <p className="text-gray-600 text-sm">
                                {getStyleDescription(key, value)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-gray-900 rounded-2xl p-8 text-white">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-xl">
                        <Info className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-4">How does personalization work?</h3>
                        <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                            <p>
                                <strong className="text-white">Active Learning:</strong> Every time you click "Save" on an edit,
                                Pulse Pro compares our initial draft with your final version to detect patterns in length,
                                tone, and formatting.
                            </p>
                            <p>
                                <strong className="text-white">Feedback Loop:</strong> Your Thumbs Up/Down feedback helps us
                                prioritize style patterns that you align with.
                            </p>
                            <p>
                                <strong className="text-white">Few-Shot Prompting:</strong> When generating new content, we
                                inject your best past edits as examples into the AI's technical prompt, creating a
                                personalized brand-voice mirror.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
