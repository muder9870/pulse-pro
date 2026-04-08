import React from 'react';
import { Sparkles, Info, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

export const QualityModal = ({ open, detail, onClose, getGradeColor }) => {
  if (!open || !detail) return null;
  const { platform, data } = detail;

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Quality Report - ${platform}`}>
      <div className="space-y-6">
        <div className="flex justify-around items-center text-center">
          <div className="group transition-transform hover:scale-110">
            <div className={`text-4xl font-black rounded-3xl w-20 h-20 flex items-center justify-center mx-auto border-4 shadow-lg ${getGradeColor(data.grade)}`}>
              {data.grade}
            </div>
            <div className="text-[10px] text-gray-400 mt-2 uppercase font-black tracking-widest">Performance Grade</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-gray-900">{data.metrics.overall_score}</div>
            <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Quality alignment</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Readability" value={data.metrics.readability_score} />
          <MetricCard label="Engagement" value={data.metrics.engagement_potential} />
          <MetricCard label="Clarity" value={data.metrics.clarity_score} />
          <MetricCard label="Uniqueness" value={data.metrics.uniqueness_score} />
        </div>

        <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
          <div className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
            <Info className="w-4 h-4" /> AI Recommendations
          </div>
          <ul className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2 leading-relaxed">
                <span className="text-blue-500 mt-1 font-bold">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Modal.Footer>
        <Button onClick={onClose} variant="primary" size="lg" fullWidth className="rounded-xl font-bold shadow-md">Acknowledge</Button>
      </Modal.Footer>
    </Modal>
  );
};

const MetricCard = ({ label, value }) => (
  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
    <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">{label}</div>
    <div className="text-xl font-black text-gray-800">{value}</div>
  </div>
);

export const TagsModal = ({ open, onClose, tags, hashtags, tagInput, setTagInput, onAddTag, onRemoveTag, onAutoGenerate, onSave, loading, error }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Taxonomy Management">
      <div className="space-y-6">
        {error && <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</div>}
        
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Tags</label>
          <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-gray-100 rounded-xl bg-gray-50/30">
            {tags.map((t) => (
              <button 
                key={`edit-tag-${t}`} 
                onClick={() => onRemoveTag(t)} 
                className="px-3 py-1 bg-white text-gray-700 text-xs rounded-full font-bold border border-gray-200 hover:border-red-300 hover:text-red-500 transition-all flex items-center gap-1 shadow-sm"
              >
                {t} <X className="w-3 h-3" />
              </button>
            ))}
            {tags.length === 0 && <span className="text-xs text-gray-400 italic">No tags defined yet</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Enter new tag..."
            className="rounded-xl border-gray-200"
            fullWidth
          />
          <Button onClick={onAddTag} variant="primary" size="md" className="rounded-xl px-6 font-bold">Add</Button>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Associated Hashtags</label>
          <div className="flex flex-wrap gap-2 p-3 border border-gray-100 rounded-xl bg-blue-50/30">
            {hashtags.map((h) => (
              <span key={`edit-hash-${h}`} className="px-3 py-1 bg-white text-blue-700 text-xs rounded-full font-bold border border-blue-200 shadow-sm">
                {h}
              </span>
            ))}
            {hashtags.length === 0 && <span className="text-xs text-gray-400 italic">Hashtags will be derived from tags</span>}
          </div>
        </div>
      </div>
      <Modal.Footer className="justify-between">
        <Button onClick={onAutoGenerate} disabled={loading} variant="secondary" size="md" className="rounded-xl font-bold border-gray-200">AI Discover</Button>
        <Button onClick={onSave} disabled={loading} loading={loading} variant="primary" size="md" className="rounded-xl px-8 font-bold shadow-md">Apply Changes</Button>
      </Modal.Footer>
    </Modal>
  );
};

export const EditModal = ({ open, platform, text, setText, onSave, onClose, loading, error }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="xl" title={`Manual refinement - ${platform}`}>
      <div className="space-y-4">
        {error && <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</div>}
        <textarea 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          className="w-full min-h-[250px] border border-gray-200 rounded-2xl p-4 text-sm font-mono leading-relaxed focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none shadow-inner" 
          placeholder="Refine post content..."
        />
        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <span>Character count: {text.length}</span>
          <span className={text.length > 280 ? 'text-orange-500' : ''}>Optimal for most platforms</span>
        </div>
      </div>
      <Modal.Footer className="justify-end gap-3">
        <Button onClick={onClose} variant="secondary" size="md" className="rounded-xl font-bold border-gray-200">Discard</Button>
        <Button onClick={onSave} disabled={loading} loading={loading} variant="primary" size="md" className="rounded-xl px-8 font-bold shadow-md">Commit Edit</Button>
      </Modal.Footer>
    </Modal>
  );
};
